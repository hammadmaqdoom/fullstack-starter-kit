import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { RbacService } from '@/modules/compliance/rbac.service';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  CreateExportProfileDto,
  QueryExportProfilesDto,
} from './dto/export-profile.dto';
import { ExportPayRunDto } from './dto/export.dto';
import { FinanceExportProfileEntity } from './entities/finance-export-profile.entity';
import { PayRunExportBatchEntity } from './entities/pay-run-export-batch.entity';
import { PayRunLineItemEntity } from './entities/pay-run-line-item.entity';
import { PayRunEntity } from './entities/pay-run.entity';
import { ExportFileFormat, PayRunStatus } from './enums/payroll.enum';
import { buildExportCsv, buildExportXlsx } from './export-file.builder';
import { buildExportPdf } from './export-pdf.builder';
import {
  buildExportRows,
  DEFAULT_EXPORT_COLUMN_MAPPINGS,
  ExportRowWorker,
} from './export-row.builder';
import { isPayrollAdmin } from './payroll-scope.util';
import { PayslipBlobStorageService } from './payslip-blob-storage.service';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

const EXPORTABLE_PAY_RUN_STATUSES = [
  PayRunStatus.APPROVED,
  PayRunStatus.EXPORTED,
];

const CONTENT_TYPE_BY_FORMAT: Record<ExportFileFormat, string> = {
  [ExportFileFormat.XLSX]:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  [ExportFileFormat.CSV]: 'text/csv',
  [ExportFileFormat.PDF]: 'application/pdf',
};

const EXTENSION_BY_FORMAT: Record<ExportFileFormat, string> = {
  [ExportFileFormat.XLSX]: 'xlsx',
  [ExportFileFormat.CSV]: 'csv',
  [ExportFileFormat.PDF]: 'pdf',
};

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(FinanceExportProfileEntity)
    private readonly exportProfileRepository: Repository<FinanceExportProfileEntity>,
    @InjectRepository(PayRunExportBatchEntity)
    private readonly exportBatchRepository: Repository<PayRunExportBatchEntity>,
    @InjectRepository(PayRunEntity)
    private readonly payRunRepository: Repository<PayRunEntity>,
    @InjectRepository(PayRunLineItemEntity)
    private readonly lineItemRepository: Repository<PayRunLineItemEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(LegalEntityEntity)
    private readonly legalEntityRepository: Repository<LegalEntityEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    // Blob storage implementation is generic (buffer/folder/filename); reuse
    // the payslip blob service rather than duplicating the Azure/S3/local
    // fallback logic for a second file type.
    private readonly blobStorageService: PayslipBlobStorageService,
  ) {}

  async createExportProfile(
    dto: CreateExportProfileDto,
    actor: ActorContext,
  ): Promise<FinanceExportProfileEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPayrollAdmin(actor.userId, tenantId);

    if (dto.isDefault) {
      await this.exportProfileRepository.update(
        {
          tenantId,
          legalEntityId: dto.legalEntityId ?? null,
          countryCode: dto.countryCode ?? null,
        },
        { isDefault: false },
      );
    }

    const saved = await this.exportProfileRepository.save(
      this.exportProfileRepository.create({
        tenantId,
        legalEntityId: dto.legalEntityId ?? null,
        countryCode: dto.countryCode ?? null,
        name: dto.name,
        columnMappings: dto.columnMappings,
        fileFormats: dto.fileFormats?.length
          ? dto.fileFormats
          : [ExportFileFormat.XLSX, ExportFileFormat.PDF],
        isDefault: dto.isDefault ?? false,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.export_profile.create',
      entityType: 'finance_export_profile',
      entityId: saved.id,
      changes: {
        name: { old: null, new: saved.name },
        legalEntityId: { old: null, new: saved.legalEntityId },
        countryCode: { old: null, new: saved.countryCode },
        isDefault: { old: null, new: saved.isDefault },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async listExportProfiles(
    query: QueryExportProfilesDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<FinanceExportProfileEntity>> {
    await this.assertPayrollAdmin(actorUserId, tenantId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.exportProfileRepository
      .createQueryBuilder('profile')
      .where('profile.tenantId = :tenantId', { tenantId })
      .orderBy('profile.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.legalEntityId) {
      qb.andWhere('profile.legalEntityId = :legalEntityId', {
        legalEntityId: query.legalEntityId,
      });
    }

    const [items, totalItems] = await qb.getManyAndCount();
    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 0,
      },
    };
  }

  /**
   * Generates a PDF/Excel/CSV export pack for an approved pay run
   * (FLW-PAY-001 step 5), records a `PayRunExportBatch`, and moves the pay
   * run to `exported`. Re-exporting an already-exported run is allowed
   * (Finance may need to re-download) and does not change the status again.
   */
  async exportPayRun(
    payRunId: string,
    dto: ExportPayRunDto,
    actor: ActorContext,
  ): Promise<PayRunExportBatchEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPayrollAdmin(actor.userId, tenantId);

    const payRun = await this.payRunRepository.findOne({
      where: { id: payRunId, tenantId },
    });
    if (!payRun) {
      throw new NotFoundException({
        code: 'PAY_RUN_NOT_FOUND',
        message: 'Pay run not found',
      });
    }

    if (!EXPORTABLE_PAY_RUN_STATUSES.includes(payRun.status)) {
      throw new BadRequestException({
        code: 'PAY_RUN_NOT_APPROVED',
        message: 'Pay run must be approved before it can be exported',
      });
    }

    const exportProfile = await this.resolveExportProfile(
      dto.exportProfileId,
      payRun,
      tenantId,
    );

    const fileFormat =
      dto.fileFormat ?? exportProfile.fileFormats[0] ?? ExportFileFormat.XLSX;

    const [lineItems, legalEntity] = await Promise.all([
      this.lineItemRepository.find({
        where: { payRunId: payRun.id, tenantId },
      }),
      this.legalEntityRepository.findOne({
        where: { id: payRun.legalEntityId, tenantId },
      }),
    ]);

    const workers = lineItems.length
      ? await this.workerRepository.find({
          where: { id: In(lineItems.map((item) => item.workerId)), tenantId },
        })
      : [];
    const workersById = new Map<string, ExportRowWorker>(
      workers.map((worker) => [
        worker.id,
        {
          id: worker.id,
          firstName: worker.firstName,
          lastName: worker.lastName,
          // Bank account number is not yet modeled on `WorkerEntity` — the
          // `bankAccount` export column resolves to '' until that field
          // exists (see DONE_WITH_CONCERNS in the implementing task).
          bankAccountNumber:
            (worker as unknown as { bankAccountNumber?: string })
              .bankAccountNumber ?? null,
        },
      ]),
    );

    const headers = exportProfile.columnMappings.map(
      (mapping) => mapping.header,
    );
    const rows = buildExportRows(
      exportProfile.columnMappings,
      lineItems,
      workersById,
    );

    const exportedAt = new Date();
    const buffer = await this.renderExportFile(fileFormat, {
      headers,
      rows,
      legalEntityName: legalEntity?.registeredName ?? 'Digitaro',
      periodStart: payRun.periodStart,
      periodEnd: payRun.periodEnd,
      exportedAt,
    });

    const filename = `${payRun.id}-${exportedAt.getTime()}.${EXTENSION_BY_FORMAT[fileFormat]}`;
    const blobUrl = await this.blobStorageService.upload(
      buffer,
      'payroll-exports',
      filename,
      CONTENT_TYPE_BY_FORMAT[fileFormat],
    );

    const batch = await this.exportBatchRepository.save(
      this.exportBatchRepository.create({
        tenantId,
        legalEntityId: payRun.legalEntityId,
        payRunId: payRun.id,
        contractorPaymentBatchId: null,
        exportProfileId: exportProfile.id,
        fileFormat,
        blobUrl,
        exportedBy: actor.userId,
        exportedAt,
      }),
    );

    const previousStatus = payRun.status;
    if (payRun.status === PayRunStatus.APPROVED) {
      payRun.status = PayRunStatus.EXPORTED;
      await this.payRunRepository.save(payRun);
    }

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.pay_run.export',
      entityType: 'pay_run',
      entityId: payRun.id,
      changes: {
        status: { old: previousStatus, new: payRun.status },
        fileFormat: { old: null, new: fileFormat },
        exportProfileId: { old: null, new: exportProfile.id },
        exportBatchId: { old: null, new: batch.id },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return batch;
  }

  async listExportsForPayRun(
    payRunId: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PayRunExportBatchEntity[]> {
    await this.assertPayrollAdmin(actorUserId, tenantId);

    const payRun = await this.payRunRepository.findOne({
      where: { id: payRunId, tenantId },
    });
    if (!payRun) {
      throw new NotFoundException({
        code: 'PAY_RUN_NOT_FOUND',
        message: 'Pay run not found',
      });
    }

    return this.exportBatchRepository.find({
      where: { payRunId, tenantId },
      order: { exportedAt: 'DESC' },
    });
  }

  private async renderExportFile(
    fileFormat: ExportFileFormat,
    input: {
      headers: string[];
      rows: string[][];
      legalEntityName: string;
      periodStart: string;
      periodEnd: string;
      exportedAt: Date;
    },
  ): Promise<Buffer> {
    switch (fileFormat) {
      case ExportFileFormat.XLSX:
        return buildExportXlsx(input.headers, input.rows);
      case ExportFileFormat.CSV:
        return Buffer.from(buildExportCsv(input.headers, input.rows), 'utf-8');
      case ExportFileFormat.PDF:
        return buildExportPdf({
          title: 'Pay Run Export',
          legalEntityName: input.legalEntityName,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          headers: input.headers,
          rows: input.rows,
          exportedAt: input.exportedAt,
        });
      default:
        throw new BadRequestException({
          code: 'EXPORT_FORMAT_UNSUPPORTED',
          message: `Unsupported export file format: ${fileFormat}`,
        });
    }
  }

  /**
   * Resolves the export profile to use: explicit `exportProfileId` wins;
   * otherwise the most specific matching default (legal entity > country >
   * tenant-wide) is used; if none exists yet, a tenant-wide default profile
   * is created on the fly from `DEFAULT_EXPORT_COLUMN_MAPPINGS` so Finance
   * can always export, and `exportProfileId` on the batch stays non-null.
   */
  private async resolveExportProfile(
    exportProfileId: string | undefined,
    payRun: PayRunEntity,
    tenantId: string,
  ): Promise<FinanceExportProfileEntity> {
    if (exportProfileId) {
      const profile = await this.exportProfileRepository.findOne({
        where: { id: exportProfileId, tenantId },
      });
      if (!profile) {
        throw new NotFoundException({
          code: 'EXPORT_PROFILE_NOT_FOUND',
          message: 'Export profile not found',
        });
      }
      return profile;
    }

    const candidates = await this.exportProfileRepository.find({
      where: { tenantId, isDefault: true },
    });

    const byLegalEntity = candidates.find(
      (profile) => profile.legalEntityId === payRun.legalEntityId,
    );
    if (byLegalEntity) {
      return byLegalEntity;
    }

    const byCountry = candidates.find(
      (profile) =>
        !profile.legalEntityId && profile.countryCode === payRun.countryCode,
    );
    if (byCountry) {
      return byCountry;
    }

    const tenantWide = candidates.find(
      (profile) => !profile.legalEntityId && !profile.countryCode,
    );
    if (tenantWide) {
      return tenantWide;
    }

    return this.exportProfileRepository.save(
      this.exportProfileRepository.create({
        tenantId,
        legalEntityId: null,
        countryCode: null,
        name: 'Default pay run export',
        columnMappings: DEFAULT_EXPORT_COLUMN_MAPPINGS,
        fileFormats: [ExportFileFormat.XLSX, ExportFileFormat.PDF],
        isDefault: true,
      }),
    );
  }

  private async assertPayrollAdmin(
    actorUserId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    if (!isPayrollAdmin(auth)) {
      throw new ForbiddenException({
        code: 'PAYROLL_EXPORT_FORBIDDEN',
        message: 'Only Finance, People Ops, or Super Admin can manage exports',
      });
    }
  }
}
