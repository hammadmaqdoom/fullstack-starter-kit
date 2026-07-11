import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  ContractorInvoiceLineItemDto,
  ContractorInvoiceOcrPrefill,
  CreateContractorInvoiceDto,
  QueryContractorInvoicesDto,
  RejectContractorInvoiceDto,
  UpdateContractorInvoiceDto,
} from './dto/contractor-invoice.dto';
import { ContractorInvoiceLineItemEntity } from './entities/contractor-invoice-line-item.entity';
import { ContractorInvoiceEntity } from './entities/contractor-invoice.entity';
import { ContractorInvoiceStatus } from './enums/contractor-invoice.enum';

/**
 * FLW-OPS-004 — contractor invoice submission & approvals (PRD §6.20.2/6.20.3).
 * Draft → Submitted → Manager approved → Finance approved. `queued`/`paid`
 * are owned by the contractor payment batch flow (FLW-PAY-002) — not set here.
 */
@Injectable()
export class ContractorInvoiceService {
  constructor(
    @InjectRepository(ContractorInvoiceEntity)
    private readonly invoiceRepository: Repository<ContractorInvoiceEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    query: QueryContractorInvoicesDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<ContractorInvoiceEntity>> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const isPrivileged = this.isFinanceOrPeopleOpsOrSuperAdmin(auth.roleCodes);
    const isManager = auth.roleCodes.includes(PolarisRoleCode.MANAGER);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const qb = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.lineItems', 'lineItems')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .orderBy('invoice.createdAt', 'DESC');

    if (isPrivileged) {
      if (query.workerId) {
        qb.andWhere('invoice.workerId = :targetWorkerId', {
          targetWorkerId: query.workerId,
        });
      }
    } else {
      const actingWorkerId = await resolveActingWorkerId(
        this.workerRepository,
        actorId,
        tenantId,
      );
      if (!actingWorkerId) {
        return { items: [], meta: { page, limit, total: 0, totalPages: 0 } };
      }

      if (query.workerId && query.workerId !== actingWorkerId) {
        const canViewTeamMember =
          isManager &&
          (await this.isManagedBy(query.workerId, actingWorkerId, tenantId));
        if (!canViewTeamMember) {
          throw new ForbiddenException({
            code: 'CONTRACTOR_INVOICE_ACCESS_DENIED',
            message: 'Cannot list invoices for another worker',
          });
        }
        qb.andWhere('invoice.workerId = :targetWorkerId', {
          targetWorkerId: query.workerId,
        });
      } else if (isManager) {
        qb.leftJoin('invoice.worker', 'worker').andWhere(
          '(invoice.workerId = :actingWorkerId OR worker.managerId = :actingWorkerId)',
          { actingWorkerId },
        );
      } else {
        qb.andWhere('invoice.workerId = :actingWorkerId', { actingWorkerId });
      }
    }

    if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
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

  async findOne(
    id: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ContractorInvoiceEntity> {
    const invoice = await this.getInvoiceOrThrow(id, tenantId, ['lineItems']);
    await this.assertCanView(invoice, actorId, tenantId);
    return invoice;
  }

  async create(
    dto: CreateContractorInvoiceDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ContractorInvoiceEntity> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const isPrivileged = this.isFinanceOrPeopleOpsOrSuperAdmin(auth.roleCodes);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );

    const workerId = this.resolveWorkerIdForCreate(
      dto.workerId,
      actingWorkerId,
      isPrivileged,
    );

    const worker = await this.workerRepository.findOne({
      where: { id: workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    await this.assertNoDuplicateInvoiceNumber(dto.invoiceNumber, tenantId);

    const grossAmount = this.sumLineItems(dto.lineItems);

    const saved = await this.dataSource.transaction(async (manager) => {
      const invoice = manager.create(ContractorInvoiceEntity, {
        tenantId,
        legalEntityId: dto.legalEntityId,
        workerId,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: dto.invoiceDate,
        dueDate: dto.dueDate,
        servicePeriodFrom: dto.servicePeriodFrom ?? null,
        servicePeriodTo: dto.servicePeriodTo ?? null,
        currencyCode: dto.currencyCode.toUpperCase(),
        grossAmount: grossAmount.toFixed(2),
        taxAmount:
          dto.taxAmount !== undefined ? dto.taxAmount.toFixed(2) : null,
        pdfBlobUrl: dto.pdfBlobUrl ?? null,
        status: ContractorInvoiceStatus.DRAFT,
      });
      const savedInvoice = await manager.save(invoice);

      const lineItems = this.buildLineItemEntities(
        manager,
        dto.lineItems,
        tenantId,
        savedInvoice.id,
      );
      savedInvoice.lineItems = await manager.save(lineItems);

      return savedInvoice;
    });

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'contractor_invoice.create',
      entityType: 'contractor_invoice',
      entityId: saved.id,
      changes: {
        workerId: { old: null, new: saved.workerId },
        invoiceNumber: { old: null, new: saved.invoiceNumber },
        grossAmount: { old: null, new: saved.grossAmount },
        status: { old: null, new: saved.status },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateContractorInvoiceDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ContractorInvoiceEntity> {
    const invoice = await this.getInvoiceOrThrow(id, tenantId, ['lineItems']);
    await this.assertOwnerOrPrivileged(invoice.workerId, actorId, tenantId);
    this.assertStatus(invoice, [ContractorInvoiceStatus.DRAFT], 'update');

    if (dto.invoiceNumber && dto.invoiceNumber !== invoice.invoiceNumber) {
      await this.assertNoDuplicateInvoiceNumber(
        dto.invoiceNumber,
        tenantId,
        invoice.id,
      );
      invoice.invoiceNumber = dto.invoiceNumber;
    }
    if (dto.invoiceDate !== undefined) {
      invoice.invoiceDate = dto.invoiceDate;
    }
    if (dto.dueDate !== undefined) {
      invoice.dueDate = dto.dueDate;
    }
    if (dto.servicePeriodFrom !== undefined) {
      invoice.servicePeriodFrom = dto.servicePeriodFrom;
    }
    if (dto.servicePeriodTo !== undefined) {
      invoice.servicePeriodTo = dto.servicePeriodTo;
    }
    if (dto.currencyCode !== undefined) {
      invoice.currencyCode = dto.currencyCode.toUpperCase();
    }
    if (dto.taxAmount !== undefined) {
      invoice.taxAmount = dto.taxAmount.toFixed(2);
    }
    if (dto.pdfBlobUrl !== undefined) {
      invoice.pdfBlobUrl = dto.pdfBlobUrl;
    }

    const before = {
      grossAmount: invoice.grossAmount,
      invoiceNumber: invoice.invoiceNumber,
    };

    const saved = await this.dataSource.transaction(async (manager) => {
      if (dto.lineItems) {
        await manager.delete(ContractorInvoiceLineItemEntity, {
          invoiceId: invoice.id,
        });
        const lineItems = this.buildLineItemEntities(
          manager,
          dto.lineItems,
          tenantId,
          invoice.id,
        );
        invoice.lineItems = await manager.save(lineItems);
        invoice.grossAmount = this.sumLineItems(dto.lineItems).toFixed(2);
      }

      return manager.save(ContractorInvoiceEntity, invoice);
    });

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'contractor_invoice.update',
      entityType: 'contractor_invoice',
      entityId: saved.id,
      changes: {
        invoiceNumber: { old: before.invoiceNumber, new: saved.invoiceNumber },
        grossAmount: { old: before.grossAmount, new: saved.grossAmount },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async submit(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ContractorInvoiceEntity> {
    const invoice = await this.getInvoiceOrThrow(id, tenantId);
    await this.assertOwnerOrPrivileged(invoice.workerId, actorId, tenantId);
    this.assertStatus(invoice, [ContractorInvoiceStatus.DRAFT], 'submit');

    if (!invoice.pdfBlobUrl) {
      throw new BadRequestException({
        code: 'CONTRACTOR_INVOICE_PDF_REQUIRED',
        message: 'A PDF attachment is required before submitting',
      });
    }

    const before = invoice.status;
    invoice.status = ContractorInvoiceStatus.SUBMITTED;
    const saved = await this.invoiceRepository.save(invoice);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'contractor_invoice.submit',
      entityType: 'contractor_invoice',
      entityId: saved.id,
      changes: { status: { old: before, new: saved.status } },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async approveManager(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ContractorInvoiceEntity> {
    const invoice = await this.getInvoiceOrThrow(id, tenantId);
    await this.assertManagerOrPrivileged(invoice.workerId, actorId, tenantId);
    this.assertStatus(
      invoice,
      [ContractorInvoiceStatus.SUBMITTED],
      'approve-manager',
    );

    const before = invoice.status;
    invoice.status = ContractorInvoiceStatus.MANAGER_APPROVED;
    invoice.managerApprovedBy = actorId;
    invoice.managerApprovedAt = new Date();
    const saved = await this.invoiceRepository.save(invoice);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'contractor_invoice.approve_manager',
      entityType: 'contractor_invoice',
      entityId: saved.id,
      changes: { status: { old: before, new: saved.status } },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async approveFinance(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ContractorInvoiceEntity> {
    const invoice = await this.getInvoiceOrThrow(id, tenantId);
    await this.assertFinanceAuth(actorId, tenantId);
    this.assertStatus(
      invoice,
      [ContractorInvoiceStatus.MANAGER_APPROVED],
      'approve-finance',
    );

    const before = invoice.status;
    invoice.status = ContractorInvoiceStatus.FINANCE_APPROVED;
    invoice.financeApprovedBy = actorId;
    invoice.financeApprovedAt = new Date();
    const saved = await this.invoiceRepository.save(invoice);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'contractor_invoice.approve_finance',
      entityType: 'contractor_invoice',
      entityId: saved.id,
      changes: { status: { old: before, new: saved.status } },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async reject(
    id: string,
    dto: RejectContractorInvoiceDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ContractorInvoiceEntity> {
    const invoice = await this.getInvoiceOrThrow(id, tenantId);
    await this.assertManagerOrPrivileged(invoice.workerId, actorId, tenantId);
    this.assertStatus(
      invoice,
      [
        ContractorInvoiceStatus.SUBMITTED,
        ContractorInvoiceStatus.MANAGER_APPROVED,
      ],
      'reject',
    );

    const before = invoice.status;
    invoice.status = ContractorInvoiceStatus.REJECTED;
    invoice.rejectionReason = dto.reason;
    const saved = await this.invoiceRepository.save(invoice);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'contractor_invoice.reject',
      entityType: 'contractor_invoice',
      entityId: saved.id,
      changes: {
        status: { old: before, new: saved.status },
        rejectionReason: { old: null, new: saved.rejectionReason },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  /**
   * OCR-assist stub (PRD §6.20.2) — no real OCR provider wired up in Phase 2
   * Wave 4. Always returns an empty prefill so the frontend can build the
   * "review & confirm" UI now and swap in a real provider later without an
   * API contract change.
   */
  ocrPrefill(): ContractorInvoiceOcrPrefill {
    return {};
  }

  private async isManagedBy(
    workerId: string,
    managerWorkerId: string,
    tenantId: string,
  ): Promise<boolean> {
    const worker = await this.workerRepository.findOne({
      where: { id: workerId, tenantId },
    });
    return worker?.managerId === managerWorkerId;
  }

  private resolveWorkerIdForCreate(
    dtoWorkerId: string | undefined,
    actingWorkerId: string | null,
    isPrivileged: boolean,
  ): string {
    if (isPrivileged) {
      const workerId = dtoWorkerId ?? actingWorkerId;
      if (!workerId) {
        throw new BadRequestException({
          code: 'CONTRACTOR_INVOICE_WORKER_REQUIRED',
          message: 'workerId is required',
        });
      }
      return workerId;
    }

    if (!actingWorkerId) {
      throw new ForbiddenException({
        code: 'CONTRACTOR_INVOICE_ACCESS_DENIED',
        message: 'No worker profile linked to this account',
      });
    }
    if (dtoWorkerId && dtoWorkerId !== actingWorkerId) {
      throw new ForbiddenException({
        code: 'CONTRACTOR_INVOICE_ACCESS_DENIED',
        message: 'Cannot create an invoice for another worker',
      });
    }
    return actingWorkerId;
  }

  private buildLineItemEntities(
    manager: EntityManager,
    lineItems: ContractorInvoiceLineItemDto[],
    tenantId: string,
    invoiceId: string,
  ): ContractorInvoiceLineItemEntity[] {
    return lineItems.map((line) =>
      manager.create(ContractorInvoiceLineItemEntity, {
        tenantId,
        invoiceId,
        description: line.description,
        quantity: line.quantity.toFixed(2),
        unitPrice: line.unitPrice.toFixed(2),
        amount: line.amount.toFixed(2),
      }),
    );
  }

  private sumLineItems(lineItems: ContractorInvoiceLineItemDto[]): number {
    return lineItems.reduce((total, line) => total + line.amount, 0);
  }

  private isFinanceOrPeopleOpsOrSuperAdmin(roleCodes: string[]): boolean {
    return roleCodes.some((code) =>
      [
        PolarisRoleCode.FINANCE,
        PolarisRoleCode.PEOPLE_OPS,
        PolarisRoleCode.SUPER_ADMIN,
      ].includes(code as PolarisRoleCode),
    );
  }

  private async assertFinanceAuth(
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    if (!this.isFinanceOrPeopleOpsOrSuperAdmin(auth.roleCodes)) {
      throw new ForbiddenException({
        code: 'CONTRACTOR_INVOICE_ACCESS_DENIED',
        message: 'Finance access required to approve this invoice',
      });
    }
  }

  private async assertOwnerOrPrivileged(
    invoiceWorkerId: string,
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    if (this.isFinanceOrPeopleOpsOrSuperAdmin(auth.roleCodes)) {
      return;
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );
    if (!actingWorkerId || actingWorkerId !== invoiceWorkerId) {
      throw new ForbiddenException({
        code: 'CONTRACTOR_INVOICE_ACCESS_DENIED',
        message:
          'Only the contractor or Finance/People Ops may manage this invoice',
      });
    }
  }

  private async assertManagerOrPrivileged(
    invoiceWorkerId: string,
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    if (this.isFinanceOrPeopleOpsOrSuperAdmin(auth.roleCodes)) {
      return;
    }

    if (auth.roleCodes.includes(PolarisRoleCode.MANAGER)) {
      const [worker, actingWorkerId] = await Promise.all([
        this.workerRepository.findOne({
          where: { id: invoiceWorkerId, tenantId },
        }),
        resolveActingWorkerId(this.workerRepository, actorId, tenantId),
      ]);
      if (worker && actingWorkerId && worker.managerId === actingWorkerId) {
        return;
      }
    }

    throw new ForbiddenException({
      code: 'CONTRACTOR_INVOICE_ACCESS_DENIED',
      message: 'Manager or Finance/People Ops access required',
    });
  }

  private async assertCanView(
    invoice: ContractorInvoiceEntity,
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    if (this.isFinanceOrPeopleOpsOrSuperAdmin(auth.roleCodes)) {
      return;
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );
    if (actingWorkerId && actingWorkerId === invoice.workerId) {
      return;
    }

    if (auth.roleCodes.includes(PolarisRoleCode.MANAGER) && actingWorkerId) {
      const worker = await this.workerRepository.findOne({
        where: { id: invoice.workerId, tenantId },
      });
      if (worker && worker.managerId === actingWorkerId) {
        return;
      }
    }

    throw new ForbiddenException({
      code: 'CONTRACTOR_INVOICE_ACCESS_DENIED',
      message: 'Insufficient permissions to view this invoice',
    });
  }

  private assertStatus(
    invoice: ContractorInvoiceEntity,
    allowed: ContractorInvoiceStatus[],
    action: string,
  ): void {
    if (!allowed.includes(invoice.status)) {
      throw new BadRequestException({
        code: 'CONTRACTOR_INVOICE_INVALID_STATUS',
        message: `Cannot ${action} an invoice in status ${invoice.status}`,
      });
    }
  }

  private async assertNoDuplicateInvoiceNumber(
    invoiceNumber: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.invoiceNumber = :invoiceNumber', { invoiceNumber });

    if (excludeId) {
      qb.andWhere('invoice.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException({
        code: 'CONTRACTOR_INVOICE_DUPLICATE_NUMBER',
        message: 'An invoice with this number already exists for this tenant',
      });
    }
  }

  private async getInvoiceOrThrow(
    id: string,
    tenantId: string,
    relations: string[] = [],
  ): Promise<ContractorInvoiceEntity> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, tenantId },
      relations,
    });

    if (!invoice) {
      throw new NotFoundException({
        code: 'CONTRACTOR_INVOICE_NOT_FOUND',
        message: 'Contractor invoice not found',
      });
    }

    return invoice;
  }
}
