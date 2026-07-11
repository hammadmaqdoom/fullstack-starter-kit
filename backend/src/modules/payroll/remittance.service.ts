import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { RbacService } from '@/modules/compliance/rbac.service';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import { ContractorInvoiceEntity } from '@/modules/operations/entities/contractor-invoice.entity';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import { File } from '@nest-lab/fastify-multer';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateRemittanceCorridorConfigDto,
  QueryRemittanceCorridorConfigsDto,
  UpdateRemittanceCorridorConfigDto,
  UploadRemittanceDocumentDto,
} from './dto/remittance.dto';
import { RemittanceCorridorConfigEntity } from './entities/remittance-corridor-config.entity';
import { RemittancePackDocumentEntity } from './entities/remittance-pack-document.entity';
import { RemittancePackEntity } from './entities/remittance-pack.entity';
import { PayslipEntity } from './entities/payslip.entity';
import {
  RemittanceCorridorAppliesTo,
  RemittanceDocumentSource,
  RemittanceDocumentStatus,
  RemittanceDocumentType,
  RemittancePackStatus,
  RemittancePaymentSourceType,
} from './enums/remittance.enum';
import { buildPaymentAdvicePdf } from './payment-advice-pdf.builder';
import { isPayrollAdmin } from './payroll-scope.util';
import { PayslipBlobStorageService } from './payslip-blob-storage.service';
import { buildZipBuffer } from './remittance-zip.builder';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

export interface RemittancePackWithDocuments {
  pack: RemittancePackEntity;
  documents: RemittancePackDocumentEntity[];
}

export interface RemittancePackDownload extends RemittancePackWithDocuments {
  zipUrl: string;
}

@Injectable()
export class RemittanceService {
  private readonly logger = new Logger(RemittanceService.name);

  constructor(
    @InjectRepository(RemittanceCorridorConfigEntity)
    private readonly corridorRepository: Repository<RemittanceCorridorConfigEntity>,
    @InjectRepository(RemittancePackEntity)
    private readonly packRepository: Repository<RemittancePackEntity>,
    @InjectRepository(RemittancePackDocumentEntity)
    private readonly documentRepository: Repository<RemittancePackDocumentEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(LegalEntityEntity)
    private readonly legalEntityRepository: Repository<LegalEntityEntity>,
    @InjectRepository(PayslipEntity)
    private readonly payslipRepository: Repository<PayslipEntity>,
    @InjectRepository(ContractorInvoiceEntity)
    private readonly invoiceRepository: Repository<ContractorInvoiceEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly blobStorageService: PayslipBlobStorageService,
  ) {}

  // ---------------------------------------------------------------------
  // Corridor config CRUD (Finance / People Ops / Super Admin)
  // ---------------------------------------------------------------------

  async createCorridorConfig(
    dto: CreateRemittanceCorridorConfigDto,
    actor: ActorContext,
  ): Promise<RemittanceCorridorConfigEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPayrollAdmin(actor.userId, tenantId);

    const saved = await this.corridorRepository.save(
      this.corridorRepository.create({
        tenantId,
        payerCountryCode: dto.payerCountryCode.toUpperCase(),
        beneficiaryBankCountryCode: dto.beneficiaryBankCountryCode.toUpperCase(),
        legalEntityId: dto.legalEntityId ?? null,
        appliesTo: dto.appliesTo,
        requiredDocTypes: dto.requiredDocTypes,
        isActive: dto.isActive ?? true,
        effectiveFrom: dto.effectiveFrom,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.remittance_corridor_config.create',
      entityType: 'remittance_corridor_config',
      entityId: saved.id,
      changes: {
        payerCountryCode: { old: null, new: saved.payerCountryCode },
        beneficiaryBankCountryCode: {
          old: null,
          new: saved.beneficiaryBankCountryCode,
        },
        appliesTo: { old: null, new: saved.appliesTo },
        requiredDocTypes: { old: null, new: saved.requiredDocTypes },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async listCorridorConfigs(
    query: QueryRemittanceCorridorConfigsDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<RemittanceCorridorConfigEntity>> {
    await this.assertPayrollAdmin(actorUserId, tenantId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.corridorRepository
      .createQueryBuilder('corridor')
      .where('corridor.tenantId = :tenantId', { tenantId })
      .orderBy('corridor.effectiveFrom', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.legalEntityId) {
      qb.andWhere('corridor.legalEntityId = :legalEntityId', {
        legalEntityId: query.legalEntityId,
      });
    }
    if (query.payerCountryCode) {
      qb.andWhere('corridor.payerCountryCode = :payerCountryCode', {
        payerCountryCode: query.payerCountryCode,
      });
    }
    if (query.beneficiaryBankCountryCode) {
      qb.andWhere(
        'corridor.beneficiaryBankCountryCode = :beneficiaryBankCountryCode',
        { beneficiaryBankCountryCode: query.beneficiaryBankCountryCode },
      );
    }
    if (query.appliesTo) {
      qb.andWhere('corridor.appliesTo = :appliesTo', {
        appliesTo: query.appliesTo,
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

  async updateCorridorConfig(
    id: string,
    dto: UpdateRemittanceCorridorConfigDto,
    actor: ActorContext,
  ): Promise<RemittanceCorridorConfigEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPayrollAdmin(actor.userId, tenantId);

    const corridor = await this.corridorRepository.findOne({
      where: { id, tenantId },
    });
    if (!corridor) {
      throw new NotFoundException({
        code: 'REMITTANCE_CORRIDOR_CONFIG_NOT_FOUND',
        message: 'Remittance corridor config not found',
      });
    }

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (dto.legalEntityId !== undefined) {
      changes.legalEntityId = {
        old: corridor.legalEntityId,
        new: dto.legalEntityId,
      };
      corridor.legalEntityId = dto.legalEntityId;
    }
    if (dto.appliesTo !== undefined) {
      changes.appliesTo = { old: corridor.appliesTo, new: dto.appliesTo };
      corridor.appliesTo = dto.appliesTo;
    }
    if (dto.requiredDocTypes !== undefined) {
      changes.requiredDocTypes = {
        old: corridor.requiredDocTypes,
        new: dto.requiredDocTypes,
      };
      corridor.requiredDocTypes = dto.requiredDocTypes;
    }
    if (dto.isActive !== undefined) {
      changes.isActive = { old: corridor.isActive, new: dto.isActive };
      corridor.isActive = dto.isActive;
    }
    if (dto.effectiveFrom !== undefined) {
      changes.effectiveFrom = {
        old: corridor.effectiveFrom,
        new: dto.effectiveFrom,
      };
      corridor.effectiveFrom = dto.effectiveFrom;
    }

    const saved = await this.corridorRepository.save(corridor);

    if (Object.keys(changes).length) {
      await this.auditLogService.append({
        tenantId,
        actorId: actor.userId,
        action: 'payroll.remittance_corridor_config.update',
        entityType: 'remittance_corridor_config',
        entityId: saved.id,
        changes,
        correlationId: actor.correlationId,
        ipAddress: actor.ipAddress,
      });
    }

    return saved;
  }

  // ---------------------------------------------------------------------
  // Pack creation hooks (FLW-PAY-005 steps 1-2)
  // ---------------------------------------------------------------------

  /** Hook called from `PayslipService.releasePayslips` on payslip release. */
  async ensurePackForPayslip(input: {
    tenantId: string;
    workerId: string;
    legalEntityId: string;
    payRunId: string;
    paymentSourceId: string;
    actor: ActorContext;
  }): Promise<RemittancePackEntity | null> {
    return this.ensurePackForPayment({
      tenantId: input.tenantId,
      workerId: input.workerId,
      legalEntityId: input.legalEntityId,
      appliesTo: RemittanceCorridorAppliesTo.EMPLOYEE_PAYROLL,
      paymentSourceType: RemittancePaymentSourceType.PAY_RUN_LINE,
      paymentSourceId: input.paymentSourceId,
      invoiceId: null,
      payRunId: input.payRunId,
      actor: input.actor,
    });
  }

  /** Hook called from `ContractorPaymentBatchService.markLinePaid`. */
  async ensurePackForContractorPayment(input: {
    tenantId: string;
    workerId: string;
    legalEntityId: string;
    invoiceId: string;
    paymentSourceId: string;
    actor: ActorContext;
  }): Promise<RemittancePackEntity | null> {
    return this.ensurePackForPayment({
      tenantId: input.tenantId,
      workerId: input.workerId,
      legalEntityId: input.legalEntityId,
      appliesTo: RemittanceCorridorAppliesTo.CONTRACTOR_INVOICE,
      paymentSourceType: RemittancePaymentSourceType.CONTRACTOR_PAYMENT_LINE,
      paymentSourceId: input.paymentSourceId,
      invoiceId: input.invoiceId,
      payRunId: null,
      actor: input.actor,
    });
  }

  /**
   * Preconditions (feature-flows.md FLW-PAY-005): payer (legal entity)
   * country must differ from the worker's beneficiary bank country, and an
   * active corridor config must match. Idempotent on
   * `(tenantId, paymentSourceType, paymentSourceId)`.
   */
  private async ensurePackForPayment(input: {
    tenantId: string;
    workerId: string;
    legalEntityId: string;
    appliesTo:
      | RemittanceCorridorAppliesTo.EMPLOYEE_PAYROLL
      | RemittanceCorridorAppliesTo.CONTRACTOR_INVOICE;
    paymentSourceType: RemittancePaymentSourceType;
    paymentSourceId: string;
    invoiceId: string | null;
    payRunId: string | null;
    actor: ActorContext;
  }): Promise<RemittancePackEntity | null> {
    const { tenantId } = input;

    const existing = await this.packRepository.findOne({
      where: {
        tenantId,
        paymentSourceType: input.paymentSourceType,
        paymentSourceId: input.paymentSourceId,
      },
    });
    if (existing) {
      return existing;
    }

    const [worker, legalEntity] = await Promise.all([
      this.workerRepository.findOne({
        where: { id: input.workerId, tenantId },
      }),
      this.legalEntityRepository.findOne({
        where: { id: input.legalEntityId, tenantId },
      }),
    ]);
    if (!worker || !legalEntity) {
      this.logger.warn(
        `Cannot evaluate remittance corridor for ${input.paymentSourceType}:${input.paymentSourceId} — worker or legal entity not found`,
      );
      return null;
    }

    const beneficiaryCountryCode = worker.bankCountryCode || worker.countryCode;
    const payerCountryCode = legalEntity.countryCode;
    if (
      !beneficiaryCountryCode ||
      !payerCountryCode ||
      beneficiaryCountryCode === payerCountryCode
    ) {
      // Domestic payment — no remittance pack required.
      return null;
    }

    const corridor = await this.matchCorridor(
      tenantId,
      input.legalEntityId,
      payerCountryCode,
      beneficiaryCountryCode,
      input.appliesTo,
    );
    if (!corridor) {
      this.logger.warn(
        `No active remittance corridor ${payerCountryCode}->${beneficiaryCountryCode} for tenant ${tenantId}; skipping pack for ${input.paymentSourceType}:${input.paymentSourceId}`,
      );
      return null;
    }

    const pack = await this.packRepository.save(
      this.packRepository.create({
        tenantId,
        workerId: input.workerId,
        paymentSourceType: input.paymentSourceType,
        paymentSourceId: input.paymentSourceId,
        invoiceId: input.invoiceId,
        payRunId: input.payRunId,
        corridorConfigId: corridor.id,
        status: RemittancePackStatus.ASSEMBLING,
        paymentReference: null,
        completedAt: null,
      }),
    );

    const requiredDocTypes = corridor.requiredDocTypes ?? [];
    if (requiredDocTypes.length) {
      await this.documentRepository.save(
        requiredDocTypes.map((documentType) =>
          this.documentRepository.create({
            tenantId,
            packId: pack.id,
            documentType,
            source: RemittanceDocumentSource.AUTO,
            blobUrl: null,
            status: RemittanceDocumentStatus.PENDING,
            uploadedBy: null,
            uploadedAt: null,
          }),
        ),
      );
    }

    await this.auditLogService.append({
      tenantId,
      actorId: input.actor.userId,
      action: 'payroll.remittance_pack.create',
      entityType: 'remittance_pack',
      entityId: pack.id,
      changes: {
        corridorConfigId: { old: null, new: corridor.id },
        paymentSourceType: { old: null, new: pack.paymentSourceType },
        paymentSourceId: { old: null, new: pack.paymentSourceId },
        requiredDocTypes: { old: null, new: requiredDocTypes },
      },
      correlationId: input.actor.correlationId,
      ipAddress: input.actor.ipAddress,
    });

    return pack;
  }

  /**
   * Picks the most specific active corridor: legal-entity-specific over
   * tenant-wide, `appliesTo`-specific over `all`, then most recent
   * `effectiveFrom`.
   */
  private async matchCorridor(
    tenantId: string,
    legalEntityId: string,
    payerCountryCode: string,
    beneficiaryCountryCode: string,
    appliesTo:
      | RemittanceCorridorAppliesTo.EMPLOYEE_PAYROLL
      | RemittanceCorridorAppliesTo.CONTRACTOR_INVOICE,
  ): Promise<RemittanceCorridorConfigEntity | null> {
    const today = new Date().toISOString().slice(0, 10);

    const candidates = await this.corridorRepository.find({
      where: {
        tenantId,
        payerCountryCode,
        beneficiaryBankCountryCode: beneficiaryCountryCode,
        isActive: true,
      },
    });

    const eligible = candidates.filter(
      (corridor) =>
        corridor.effectiveFrom <= today &&
        (corridor.appliesTo === appliesTo ||
          corridor.appliesTo === RemittanceCorridorAppliesTo.ALL) &&
        (corridor.legalEntityId === null ||
          corridor.legalEntityId === legalEntityId),
    );

    if (!eligible.length) {
      return null;
    }

    eligible.sort((a, b) => {
      const scoreOf = (corridor: RemittanceCorridorConfigEntity) =>
        (corridor.legalEntityId ? 2 : 0) +
        (corridor.appliesTo !== RemittanceCorridorAppliesTo.ALL ? 1 : 0);
      const scoreDiff = scoreOf(b) - scoreOf(a);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return b.effectiveFrom.localeCompare(a.effectiveFrom);
    });

    return eligible[0];
  }

  // ---------------------------------------------------------------------
  // Finance uploads (FLW-PAY-005 step 6)
  // ---------------------------------------------------------------------

  async uploadForPayRunLine(
    lineId: string,
    dto: UploadRemittanceDocumentDto,
    file: File,
    actor: ActorContext,
  ): Promise<RemittancePackDocumentEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPayrollAdmin(actor.userId, tenantId);
    const pack = await this.findPackBySourceOrFail(
      tenantId,
      RemittancePaymentSourceType.PAY_RUN_LINE,
      lineId,
    );
    return this.uploadDocument(
      pack,
      dto,
      file,
      RemittanceDocumentSource.FINANCE_UPLOAD,
      actor,
    );
  }

  async uploadForContractorPaymentLine(
    lineId: string,
    dto: UploadRemittanceDocumentDto,
    file: File,
    actor: ActorContext,
  ): Promise<RemittancePackDocumentEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPayrollAdmin(actor.userId, tenantId);
    const pack = await this.findPackBySourceOrFail(
      tenantId,
      RemittancePaymentSourceType.CONTRACTOR_PAYMENT_LINE,
      lineId,
    );
    return this.uploadDocument(
      pack,
      dto,
      file,
      RemittanceDocumentSource.FINANCE_UPLOAD,
      actor,
    );
  }

  private async uploadDocument(
    pack: RemittancePackEntity,
    dto: UploadRemittanceDocumentDto,
    file: File,
    source: RemittanceDocumentSource,
    actor: ActorContext,
  ): Promise<RemittancePackDocumentEntity> {
    if (!file) {
      throw new BadRequestException({
        code: 'REMITTANCE_DOCUMENT_FILE_REQUIRED',
        message: 'A file is required',
      });
    }

    const tenantId = pack.tenantId;
    const blobUrl = await this.blobStorageService.upload(
      file.buffer,
      'remittance-documents',
      `${pack.id}-${dto.documentType}-${Date.now()}-${file.originalname}`,
      file.mimetype,
    );

    let document = await this.documentRepository.findOne({
      where: {
        tenantId,
        packId: pack.id,
        documentType: dto.documentType,
        status: RemittanceDocumentStatus.PENDING,
      },
    });

    const uploadedAt = new Date();
    if (document) {
      document.blobUrl = blobUrl;
      document.status = RemittanceDocumentStatus.AVAILABLE;
      document.source = source;
      document.uploadedBy = actor.userId;
      document.uploadedAt = uploadedAt;
    } else {
      document = this.documentRepository.create({
        tenantId,
        packId: pack.id,
        documentType: dto.documentType,
        source,
        blobUrl,
        status: RemittanceDocumentStatus.AVAILABLE,
        uploadedBy: actor.userId,
        uploadedAt,
      });
    }
    const savedDocument = await this.documentRepository.save(document);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.remittance_pack.upload_document',
      entityType: 'remittance_pack_document',
      entityId: savedDocument.id,
      changes: {
        packId: { old: null, new: pack.id },
        documentType: { old: null, new: savedDocument.documentType },
        blobUrl: { old: null, new: savedDocument.blobUrl },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    await this.recomputePackStatus(pack, actor);

    return savedDocument;
  }

  /**
   * FLW-PAY-005 step 4 — generates the `payment_advice` document instead of
   * requiring a manual Finance upload. Currently scoped to payroll
   * (`pay_run_line`) packs, since the amount/period comes from the released
   * payslip; contractor payment advices still go through the manual
   * upload flow above.
   */
  async generatePaymentAdvice(
    packId: string,
    actor: ActorContext,
  ): Promise<RemittancePackDocumentEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPayrollAdmin(actor.userId, tenantId);

    const pack = await this.packRepository.findOne({
      where: { id: packId, tenantId },
    });
    if (!pack) {
      throw new NotFoundException({
        code: 'REMITTANCE_PACK_NOT_FOUND',
        message: 'Remittance pack not found',
      });
    }
    if (pack.paymentSourceType !== RemittancePaymentSourceType.PAY_RUN_LINE) {
      throw new BadRequestException({
        code: 'REMITTANCE_PAYMENT_ADVICE_UNSUPPORTED_SOURCE',
        message:
          'Payment advice generation currently supports payroll (pay run line) packs only',
      });
    }

    const [worker, payslip] = await Promise.all([
      this.workerRepository.findOne({
        where: { id: pack.workerId, tenantId },
      }),
      this.payslipRepository.findOne({
        where: { tenantId, payRunLineItemId: pack.paymentSourceId },
      }),
    ]);
    if (!worker || !payslip) {
      throw new NotFoundException({
        code: 'REMITTANCE_PAYMENT_ADVICE_SOURCE_NOT_FOUND',
        message: 'Worker or payslip not found for this remittance pack',
      });
    }

    const legalEntity = await this.legalEntityRepository.findOne({
      where: { id: payslip.legalEntityId, tenantId },
    });

    const pdfBuffer = await buildPaymentAdvicePdf({
      packId: pack.id,
      workerName: `${worker.firstName} ${worker.lastName}`,
      legalEntityName: legalEntity?.registeredName ?? 'N/A',
      periodStart: payslip.periodStart,
      periodEnd: payslip.periodEnd,
      netPay: payslip.netPay,
      currencyCode: payslip.currencyCode,
      paymentReference: pack.paymentReference,
      generatedAt: new Date(),
    });
    const blobUrl = await this.blobStorageService.upload(
      pdfBuffer,
      'remittance-documents',
      `${pack.id}-payment-advice-${Date.now()}.pdf`,
    );

    let document = await this.documentRepository.findOne({
      where: {
        tenantId,
        packId: pack.id,
        documentType: RemittanceDocumentType.PAYMENT_ADVICE,
      },
    });
    const uploadedAt = new Date();
    if (document) {
      document.blobUrl = blobUrl;
      document.status = RemittanceDocumentStatus.AVAILABLE;
      document.source = RemittanceDocumentSource.GENERATED;
      document.uploadedBy = actor.userId;
      document.uploadedAt = uploadedAt;
    } else {
      document = this.documentRepository.create({
        tenantId,
        packId: pack.id,
        documentType: RemittanceDocumentType.PAYMENT_ADVICE,
        source: RemittanceDocumentSource.GENERATED,
        blobUrl,
        status: RemittanceDocumentStatus.AVAILABLE,
        uploadedBy: actor.userId,
        uploadedAt,
      });
    }
    const saved = await this.documentRepository.save(document);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.remittance_pack.generate_payment_advice',
      entityType: 'remittance_pack_document',
      entityId: saved.id,
      changes: {
        packId: { old: null, new: pack.id },
        blobUrl: { old: null, new: saved.blobUrl },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    await this.recomputePackStatus(pack, actor);

    return saved;
  }

  private async recomputePackStatus(
    pack: RemittancePackEntity,
    actor: ActorContext,
  ): Promise<void> {
    const documents = await this.documentRepository.find({
      where: { tenantId: pack.tenantId, packId: pack.id },
    });
    const availableCount = documents.filter(
      (document) => document.status === RemittanceDocumentStatus.AVAILABLE,
    ).length;

    let nextStatus = pack.status;
    if (documents.length > 0 && availableCount === documents.length) {
      nextStatus = RemittancePackStatus.COMPLETE;
    } else if (availableCount > 0) {
      nextStatus = RemittancePackStatus.PARTIAL;
    }

    if (nextStatus === pack.status) {
      return;
    }

    const previousStatus = pack.status;
    pack.status = nextStatus;
    pack.completedAt =
      nextStatus === RemittancePackStatus.COMPLETE
        ? new Date()
        : pack.completedAt;
    await this.packRepository.save(pack);

    await this.auditLogService.append({
      tenantId: pack.tenantId,
      actorId: actor.userId,
      action: 'payroll.remittance_pack.status_change',
      entityType: 'remittance_pack',
      entityId: pack.id,
      changes: { status: { old: previousStatus, new: nextStatus } },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
  }

  // ---------------------------------------------------------------------
  // Reads (FLW-PAY-005 step 5, 8)
  // ---------------------------------------------------------------------

  async getPackForPayRunLine(
    lineId: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<RemittancePackWithDocuments> {
    await this.assertPayrollAdmin(actorUserId, tenantId);
    const pack = await this.findPackBySourceOrFail(
      tenantId,
      RemittancePaymentSourceType.PAY_RUN_LINE,
      lineId,
    );
    return { pack, documents: await this.listDocuments(pack) };
  }

  async getPackForContractorPaymentLine(
    lineId: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<RemittancePackWithDocuments> {
    await this.assertPayrollAdmin(actorUserId, tenantId);
    const pack = await this.findPackBySourceOrFail(
      tenantId,
      RemittancePaymentSourceType.CONTRACTOR_PAYMENT_LINE,
      lineId,
    );
    return { pack, documents: await this.listDocuments(pack) };
  }

  async getPackForPayslip(
    payslipId: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<RemittancePackWithDocuments> {
    const payslip = await this.payslipRepository.findOne({
      where: { id: payslipId, tenantId },
    });
    if (!payslip) {
      throw new NotFoundException({
        code: 'PAYSLIP_NOT_FOUND',
        message: 'Payslip not found',
      });
    }
    await this.assertOwnWorkerOrAdmin(payslip.workerId, actorUserId, tenantId);
    const pack = await this.findPackBySourceOrFail(
      tenantId,
      RemittancePaymentSourceType.PAY_RUN_LINE,
      payslip.payRunLineItemId,
    );
    return { pack, documents: await this.listDocuments(pack) };
  }

  async downloadPackForPayslip(
    payslipId: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<RemittancePackDownload> {
    const { pack, documents } = await this.getPackForPayslip(
      payslipId,
      actorUserId,
      tenantId,
    );
    return this.buildDownload(pack, documents);
  }

  async getPackForInvoice(
    invoiceId: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<RemittancePackWithDocuments> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, tenantId },
    });
    if (!invoice) {
      throw new NotFoundException({
        code: 'CONTRACTOR_INVOICE_NOT_FOUND',
        message: 'Contractor invoice not found',
      });
    }
    await this.assertOwnWorkerOrAdmin(invoice.workerId, actorUserId, tenantId);

    const pack = await this.packRepository.findOne({
      where: { tenantId, invoiceId: invoice.id },
    });
    if (!pack) {
      throw new NotFoundException({
        code: 'REMITTANCE_PACK_NOT_FOUND',
        message: 'No remittance pack exists for this invoice',
      });
    }
    return { pack, documents: await this.listDocuments(pack) };
  }

  async downloadPackForInvoice(
    invoiceId: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<RemittancePackDownload> {
    const { pack, documents } = await this.getPackForInvoice(
      invoiceId,
      actorUserId,
      tenantId,
    );
    return this.buildDownload(pack, documents);
  }

  private async buildDownload(
    pack: RemittancePackEntity,
    documents: RemittancePackDocumentEntity[],
  ): Promise<RemittancePackDownload> {
    const entries =
      documents.length > 0
        ? documents.map((document) => ({
            filename: `${document.documentType}.txt`,
            content: Buffer.from(
              [
                `Document type: ${document.documentType}`,
                `Status: ${document.status}`,
                `Source: ${document.source}`,
                document.blobUrl
                  ? `URL: ${document.blobUrl}`
                  : 'URL: (not yet uploaded)',
              ].join('\n'),
              'utf-8',
            ),
          }))
        : [
            {
              filename: 'README.txt',
              content: Buffer.from(
                'No documents in this remittance pack yet.',
                'utf-8',
              ),
            },
          ];

    const zipBuffer = buildZipBuffer(entries);
    const zipUrl = await this.blobStorageService.upload(
      zipBuffer,
      'remittance-pack-downloads',
      `${pack.id}-${Date.now()}.zip`,
      'application/zip',
    );

    return { pack, documents, zipUrl };
  }

  private async listDocuments(
    pack: RemittancePackEntity,
  ): Promise<RemittancePackDocumentEntity[]> {
    return this.documentRepository.find({
      where: { tenantId: pack.tenantId, packId: pack.id },
    });
  }

  private async findPackBySourceOrFail(
    tenantId: string,
    paymentSourceType: RemittancePaymentSourceType,
    paymentSourceId: string,
  ): Promise<RemittancePackEntity> {
    const pack = await this.packRepository.findOne({
      where: { tenantId, paymentSourceType, paymentSourceId },
    });
    if (!pack) {
      throw new NotFoundException({
        code: 'REMITTANCE_PACK_NOT_FOUND',
        message: 'No remittance pack exists for this payment line',
      });
    }
    return pack;
  }

  private async assertPayrollAdmin(
    actorUserId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    if (!isPayrollAdmin(auth)) {
      throw new ForbiddenException({
        code: 'REMITTANCE_ACCESS_DENIED',
        message: 'Only Finance, People Ops, or Super Admin can manage remittance packs',
      });
    }
  }

  private async assertOwnWorkerOrAdmin(
    workerId: string,
    actorUserId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    if (isPayrollAdmin(auth)) {
      return;
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );
    if (!actingWorkerId || actingWorkerId !== workerId) {
      throw new ForbiddenException({
        code: 'REMITTANCE_PACK_ACCESS_DENIED',
        message: 'You do not have access to this remittance pack',
      });
    }
  }
}
