import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ContractorInvoiceEntity } from '@/modules/operations/entities/contractor-invoice.entity';
import { ContractorInvoiceStatus } from '@/modules/operations/enums/contractor-invoice.enum';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  CreateContractorPaymentBatchDto,
  MarkContractorPaymentLinePaidDto,
  QueryContractorPaymentBatchesDto,
} from './dto/contractor-payment-batch.dto';
import { ContractorPaymentBatchEntity } from './entities/contractor-payment-batch.entity';
import { ContractorPaymentLineEntity } from './entities/contractor-payment-line.entity';
import {
  ContractorPaymentBatchStatus,
  ExportFileFormat,
} from './enums/payroll.enum';
import { buildExportCsv, buildExportXlsx } from './export-file.builder';
import { isPayrollAdmin } from './payroll-scope.util';
import { PayslipBlobStorageService } from './payslip-blob-storage.service';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

export type ContractorPaymentBatchWithLines = ContractorPaymentBatchEntity & {
  lines: ContractorPaymentLineEntity[];
};

export interface ContractorPaymentBatchExportResult {
  batch: ContractorPaymentBatchEntity;
  blobUrl: string;
  fileFormat: ExportFileFormat;
}

const EXPORTABLE_BATCH_STATUSES = [
  ContractorPaymentBatchStatus.APPROVED,
  ContractorPaymentBatchStatus.EXPORTED,
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

/**
 * FLW-PAY-002 — contractor payment batches. Aggregates Finance-approved
 * contractor invoices for a legal entity into a batch (moving invoices to
 * `queued`), then Draft → Review → Approved → Exported → (Locked, a later
 * task once every line is paid). Finance/People Ops/Super Admin only.
 */
@Injectable()
export class ContractorPaymentBatchService {
  constructor(
    @InjectRepository(ContractorPaymentBatchEntity)
    private readonly batchRepository: Repository<ContractorPaymentBatchEntity>,
    @InjectRepository(ContractorPaymentLineEntity)
    private readonly lineRepository: Repository<ContractorPaymentLineEntity>,
    @InjectRepository(ContractorInvoiceEntity)
    private readonly invoiceRepository: Repository<ContractorInvoiceEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly dataSource: DataSource,
    private readonly blobStorageService: PayslipBlobStorageService,
  ) {}

  async createBatch(
    dto: CreateContractorPaymentBatchDto,
    actor: ActorContext,
  ): Promise<ContractorPaymentBatchWithLines> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPayrollAdmin(actor.userId, tenantId);

    const invoices = await this.invoiceRepository.find({
      where: {
        tenantId,
        legalEntityId: dto.legalEntityId,
        status: ContractorInvoiceStatus.FINANCE_APPROVED,
      },
    });

    if (!invoices.length) {
      throw new BadRequestException({
        code: 'CONTRACTOR_PAYMENT_BATCH_NO_INVOICES',
        message:
          'No finance-approved contractor invoices found for this legal entity',
      });
    }

    const currencyCode = dto.currencyCode.toUpperCase();
    const totalAmount = invoices
      .reduce((sum, invoice) => sum + Number(invoice.grossAmount), 0)
      .toFixed(2);

    const { batch, lines } = await this.dataSource.transaction(
      async (manager) => {
        const savedBatch = await manager.save(
          manager.create(ContractorPaymentBatchEntity, {
            tenantId,
            legalEntityId: dto.legalEntityId,
            periodStart: dto.periodStart,
            periodEnd: dto.periodEnd,
            status: ContractorPaymentBatchStatus.REVIEW,
            totalAmount,
            currencyCode,
          }),
        );

        const lineDrafts = invoices.map((invoice) =>
          manager.create(ContractorPaymentLineEntity, {
            tenantId,
            legalEntityId: dto.legalEntityId,
            batchId: savedBatch.id,
            invoiceId: invoice.id,
            workerId: invoice.workerId,
            amount: invoice.grossAmount,
            withholdingTax: null,
            paymentReference: null,
            paymentValueDate: null,
            swiftUetr: null,
            paidAt: null,
          }),
        );
        const savedLines = await manager.save(lineDrafts);

        for (const invoice of invoices) {
          invoice.status = ContractorInvoiceStatus.QUEUED;
        }
        await manager.save(ContractorInvoiceEntity, invoices);

        return { batch: savedBatch, lines: savedLines };
      },
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.contractor_payment_batch.create',
      entityType: 'contractor_payment_batch',
      entityId: batch.id,
      changes: {
        legalEntityId: { old: null, new: batch.legalEntityId },
        periodStart: { old: null, new: batch.periodStart },
        periodEnd: { old: null, new: batch.periodEnd },
        status: { old: null, new: batch.status },
        totalAmount: { old: null, new: batch.totalAmount },
        invoiceIds: { old: null, new: invoices.map((invoice) => invoice.id) },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    for (const invoice of invoices) {
      await this.auditLogService.append({
        tenantId,
        actorId: actor.userId,
        action: 'contractor_invoice.queue',
        entityType: 'contractor_invoice',
        entityId: invoice.id,
        changes: {
          status: {
            old: ContractorInvoiceStatus.FINANCE_APPROVED,
            new: ContractorInvoiceStatus.QUEUED,
          },
          batchId: { old: null, new: batch.id },
        },
        correlationId: actor.correlationId,
        ipAddress: actor.ipAddress,
      });
    }

    return { ...batch, lines };
  }

  async listBatches(
    query: QueryContractorPaymentBatchesDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<ContractorPaymentBatchEntity>> {
    await this.assertPayrollAdmin(actorUserId, tenantId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const qb = this.batchRepository
      .createQueryBuilder('batch')
      .where('batch.tenantId = :tenantId', { tenantId })
      .orderBy('batch.createdAt', 'DESC');

    if (query.legalEntityId) {
      qb.andWhere('batch.legalEntityId = :legalEntityId', {
        legalEntityId: query.legalEntityId,
      });
    }
    if (query.status) {
      qb.andWhere('batch.status = :status', { status: query.status });
    }

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBatchDetail(
    id: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ContractorPaymentBatchWithLines> {
    await this.assertPayrollAdmin(actorUserId, tenantId);
    const batch = await this.getBatchOrThrow(id, tenantId);
    const lines = await this.lineRepository.find({
      where: { batchId: batch.id, tenantId },
    });
    return { ...batch, lines };
  }

  async approveBatch(
    id: string,
    actor: ActorContext,
  ): Promise<ContractorPaymentBatchEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPayrollAdmin(actor.userId, tenantId);

    const batch = await this.getBatchOrThrow(id, tenantId);
    if (batch.status === ContractorPaymentBatchStatus.APPROVED) {
      return batch;
    }
    if (batch.status !== ContractorPaymentBatchStatus.REVIEW) {
      throw new BadRequestException({
        code: 'CONTRACTOR_PAYMENT_BATCH_INVALID_STATUS',
        message: 'Batch can only be approved from review status',
      });
    }

    const previousStatus = batch.status;
    batch.status = ContractorPaymentBatchStatus.APPROVED;
    batch.approvedBy = actor.userId;
    batch.approvedAt = new Date();
    const saved = await this.batchRepository.save(batch);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.contractor_payment_batch.approve',
      entityType: 'contractor_payment_batch',
      entityId: saved.id,
      changes: {
        status: { old: previousStatus, new: saved.status },
        approvedBy: { old: null, new: saved.approvedBy },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  /**
   * Generates a simple CSV/xlsx payment pack (FLW-PAY-002 step 4). Reuses
   * the pay-run export file builders directly rather than the
   * profile-linked `ExportService`/`PayRunExportBatchEntity` machinery,
   * which is scoped to employee pay runs and requires a
   * `FinanceExportProfile` that contractor batches don't have yet.
   */
  async exportBatch(
    id: string,
    actor: ActorContext,
    fileFormat: ExportFileFormat = ExportFileFormat.XLSX,
  ): Promise<ContractorPaymentBatchExportResult> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPayrollAdmin(actor.userId, tenantId);

    const batch = await this.getBatchOrThrow(id, tenantId);
    if (!EXPORTABLE_BATCH_STATUSES.includes(batch.status)) {
      throw new BadRequestException({
        code: 'CONTRACTOR_PAYMENT_BATCH_NOT_APPROVED',
        message: 'Batch must be approved before it can be exported',
      });
    }

    const lines = await this.lineRepository.find({
      where: { batchId: batch.id, tenantId },
    });

    const [invoices, workers] = await Promise.all([
      lines.length
        ? this.invoiceRepository.find({
            where: {
              id: In(lines.map((line) => line.invoiceId)),
              tenantId,
            },
          })
        : Promise.resolve([]),
      lines.length
        ? this.workerRepository.find({
            where: { id: In(lines.map((line) => line.workerId)), tenantId },
          })
        : Promise.resolve([]),
    ]);
    const invoicesById = new Map(
      invoices.map((invoice) => [invoice.id, invoice]),
    );
    const workersById = new Map(workers.map((worker) => [worker.id, worker]));

    const headers = [
      'Worker',
      'Invoice Number',
      'Amount',
      'Currency',
      'Withholding Tax',
      'Payment Reference',
    ];
    const rows = lines.map((line) => {
      const worker = workersById.get(line.workerId);
      const invoice = invoicesById.get(line.invoiceId);
      return [
        worker ? `${worker.firstName} ${worker.lastName}` : line.workerId,
        invoice?.invoiceNumber ?? '',
        line.amount,
        batch.currencyCode,
        line.withholdingTax ?? '',
        line.paymentReference ?? '',
      ];
    });

    const buffer = await this.renderExportFile(fileFormat, headers, rows);
    const exportedAt = new Date();
    const filename = `${batch.id}-${exportedAt.getTime()}.${EXTENSION_BY_FORMAT[fileFormat]}`;
    const blobUrl = await this.blobStorageService.upload(
      buffer,
      'contractor-payment-exports',
      filename,
      CONTENT_TYPE_BY_FORMAT[fileFormat],
    );

    const previousStatus = batch.status;
    if (batch.status === ContractorPaymentBatchStatus.APPROVED) {
      batch.status = ContractorPaymentBatchStatus.EXPORTED;
      await this.batchRepository.save(batch);
    }

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.contractor_payment_batch.export',
      entityType: 'contractor_payment_batch',
      entityId: batch.id,
      changes: {
        status: { old: previousStatus, new: batch.status },
        fileFormat: { old: null, new: fileFormat },
        blobUrl: { old: null, new: blobUrl },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return { batch, blobUrl, fileFormat };
  }

  async markLinePaid(
    lineId: string,
    dto: MarkContractorPaymentLinePaidDto,
    actor: ActorContext,
  ): Promise<ContractorPaymentLineEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPayrollAdmin(actor.userId, tenantId);

    const line = await this.lineRepository.findOne({
      where: { id: lineId, tenantId },
    });
    if (!line) {
      throw new NotFoundException({
        code: 'CONTRACTOR_PAYMENT_LINE_NOT_FOUND',
        message: 'Contractor payment line not found',
      });
    }

    if (line.paidAt) {
      return line;
    }

    line.paymentReference = dto.paymentReference;
    line.paymentValueDate = dto.paymentValueDate ?? null;
    line.swiftUetr = dto.swiftUetr ?? null;
    line.paidAt = new Date();
    const savedLine = await this.lineRepository.save(line);

    const invoice = await this.invoiceRepository.findOne({
      where: { id: line.invoiceId, tenantId },
    });
    const previousInvoiceStatus = invoice?.status ?? null;
    if (invoice && invoice.status !== ContractorInvoiceStatus.PAID) {
      invoice.status = ContractorInvoiceStatus.PAID;
      await this.invoiceRepository.save(invoice);
    }

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.contractor_payment_line.mark_paid',
      entityType: 'contractor_payment_line',
      entityId: savedLine.id,
      changes: {
        paymentReference: { old: null, new: savedLine.paymentReference },
        paymentValueDate: { old: null, new: savedLine.paymentValueDate },
        paidAt: { old: null, new: savedLine.paidAt },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    if (invoice) {
      await this.auditLogService.append({
        tenantId,
        actorId: actor.userId,
        action: 'contractor_invoice.paid',
        entityType: 'contractor_invoice',
        entityId: invoice.id,
        changes: {
          status: { old: previousInvoiceStatus, new: invoice.status },
        },
        correlationId: actor.correlationId,
        ipAddress: actor.ipAddress,
      });
    }

    return savedLine;
  }

  private async renderExportFile(
    fileFormat: ExportFileFormat,
    headers: string[],
    rows: string[][],
  ): Promise<Buffer> {
    switch (fileFormat) {
      case ExportFileFormat.XLSX:
        return buildExportXlsx(headers, rows, 'Contractor Payment Batch');
      case ExportFileFormat.CSV:
        return Buffer.from(buildExportCsv(headers, rows), 'utf-8');
      default:
        throw new BadRequestException({
          code: 'CONTRACTOR_PAYMENT_BATCH_EXPORT_FORMAT_UNSUPPORTED',
          message: `Unsupported export file format: ${fileFormat}`,
        });
    }
  }

  private async getBatchOrThrow(
    id: string,
    tenantId: string,
  ): Promise<ContractorPaymentBatchEntity> {
    const batch = await this.batchRepository.findOne({
      where: { id, tenantId },
    });
    if (!batch) {
      throw new NotFoundException({
        code: 'CONTRACTOR_PAYMENT_BATCH_NOT_FOUND',
        message: 'Contractor payment batch not found',
      });
    }
    return batch;
  }

  private async assertPayrollAdmin(
    actorUserId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    if (!isPayrollAdmin(auth)) {
      throw new ForbiddenException({
        code: 'CONTRACTOR_PAYMENT_BATCH_ACCESS_DENIED',
        message:
          'Only Finance, People Ops, or Super Admin can manage contractor payment batches',
      });
    }
  }
}
