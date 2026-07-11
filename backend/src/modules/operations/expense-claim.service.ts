import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  CreateExpenseClaimDto,
  ExpenseClaimLineDto,
  QueryExpenseClaimsDto,
  RejectExpenseClaimDto,
  UpdateExpenseClaimDto,
  UpsertExpensePolicyDto,
} from './dto/expense.dto';
import { ExpenseClaimLineEntity } from './entities/expense-claim-line.entity';
import {
  ExpenseClaimEntity,
  ExpensePolicyViolation,
} from './entities/expense-claim.entity';
import { ExpensePolicyEntity } from './entities/expense-policy.entity';
import { ExpenseCategory, ExpenseClaimStatus } from './enums/expense.enum';

/**
 * FLW-OPS-001 — expense claim submission & approvals (PRD §6.9).
 * Draft → Submitted → Approved → Paid | Rejected. Policy caps are resolved
 * per `tenantId` + worker `countryCode` + `category` (`expense_policies`) —
 * never hard-coded per country.
 */
@Injectable()
export class ExpenseClaimService {
  constructor(
    @InjectRepository(ExpenseClaimEntity)
    private readonly claimRepository: Repository<ExpenseClaimEntity>,
    @InjectRepository(ExpensePolicyEntity)
    private readonly policyRepository: Repository<ExpensePolicyEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    query: QueryExpenseClaimsDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<ExpenseClaimEntity>> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const isPrivileged = this.isFinanceOrPeopleOpsOrSuperAdmin(auth.roleCodes);
    const isManager = auth.roleCodes.includes(PolarisRoleCode.MANAGER);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const qb = this.claimRepository
      .createQueryBuilder('claim')
      .leftJoinAndSelect('claim.lines', 'lines')
      .where('claim.tenantId = :tenantId', { tenantId })
      .orderBy('claim.createdAt', 'DESC');

    if (isPrivileged) {
      if (query.workerId) {
        qb.andWhere('claim.workerId = :targetWorkerId', {
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
            code: 'EXPENSE_CLAIM_ACCESS_DENIED',
            message: 'Cannot list claims for another worker',
          });
        }
        qb.andWhere('claim.workerId = :targetWorkerId', {
          targetWorkerId: query.workerId,
        });
      } else if (isManager) {
        qb.leftJoin('claim.worker', 'worker').andWhere(
          '(claim.workerId = :actingWorkerId OR worker.managerId = :actingWorkerId)',
          { actingWorkerId },
        );
      } else {
        qb.andWhere('claim.workerId = :actingWorkerId', { actingWorkerId });
      }
    }

    if (query.status) {
      qb.andWhere('claim.status = :status', { status: query.status });
    }
    if (query.category) {
      qb.andWhere('claim.category = :category', { category: query.category });
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
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.getClaimOrThrow(id, tenantId, ['lines']);
    await this.assertCanView(claim, actorId, tenantId);
    return claim;
  }

  async create(
    dto: CreateExpenseClaimDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ExpenseClaimEntity> {
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

    const amount = this.resolveAmount(dto.amount, dto.lines);

    const saved = await this.dataSource.transaction(async (manager) => {
      const claim = manager.create(ExpenseClaimEntity, {
        tenantId,
        legalEntityId: dto.legalEntityId ?? worker.legalEntityId ?? null,
        workerId,
        travelRequestId: dto.travelRequestId ?? null,
        category: dto.category,
        amount: amount.toFixed(2),
        currencyCode: dto.currencyCode.toUpperCase(),
        expenseDate: dto.expenseDate,
        description: dto.description ?? null,
        receiptBlobUrl: dto.receiptBlobUrl ?? null,
        status: ExpenseClaimStatus.DRAFT,
      });
      const savedClaim = await manager.save(claim);

      if (dto.lines) {
        savedClaim.lines = await manager.save(
          this.buildLineEntities(manager, dto.lines, tenantId, savedClaim.id),
        );
      }

      return savedClaim;
    });

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'expense_claim.create',
      entityType: 'expense_claim',
      entityId: saved.id,
      changes: {
        workerId: { old: null, new: saved.workerId },
        category: { old: null, new: saved.category },
        amount: { old: null, new: saved.amount },
        status: { old: null, new: saved.status },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateExpenseClaimDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.getClaimOrThrow(id, tenantId, ['lines']);
    await this.assertOwnerOrPrivileged(claim.workerId, actorId, tenantId);
    this.assertStatus(claim, [ExpenseClaimStatus.DRAFT], 'update');

    if (dto.travelRequestId !== undefined) {
      claim.travelRequestId = dto.travelRequestId;
    }
    if (dto.category !== undefined) {
      claim.category = dto.category;
    }
    if (dto.currencyCode !== undefined) {
      claim.currencyCode = dto.currencyCode.toUpperCase();
    }
    if (dto.expenseDate !== undefined) {
      claim.expenseDate = dto.expenseDate;
    }
    if (dto.description !== undefined) {
      claim.description = dto.description;
    }
    if (dto.receiptBlobUrl !== undefined) {
      claim.receiptBlobUrl = dto.receiptBlobUrl;
    }

    const before = { amount: claim.amount };

    const saved = await this.dataSource.transaction(async (manager) => {
      if (dto.lines) {
        await manager.delete(ExpenseClaimLineEntity, {
          expenseClaimId: claim.id,
        });
        claim.lines = await manager.save(
          this.buildLineEntities(manager, dto.lines, tenantId, claim.id),
        );
        claim.amount = this.resolveAmount(undefined, dto.lines).toFixed(2);
      } else if (dto.amount !== undefined) {
        claim.amount = dto.amount.toFixed(2);
      }

      return manager.save(ExpenseClaimEntity, claim);
    });

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'expense_claim.update',
      entityType: 'expense_claim',
      entityId: saved.id,
      changes: { amount: { old: before.amount, new: saved.amount } },
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
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.getClaimOrThrow(id, tenantId);
    await this.assertOwnerOrPrivileged(claim.workerId, actorId, tenantId);
    this.assertStatus(claim, [ExpenseClaimStatus.DRAFT], 'submit');

    const worker = await this.workerRepository.findOne({
      where: { id: claim.workerId, tenantId },
    });
    const policy = worker
      ? await this.policyRepository.findOne({
          where: {
            tenantId,
            countryCode: worker.countryCode,
            category: claim.category,
          },
        })
      : null;

    if (
      policy?.receiptRequiredAbove &&
      Number(claim.amount) > Number(policy.receiptRequiredAbove) &&
      !claim.receiptBlobUrl
    ) {
      throw new BadRequestException({
        code: 'EXPENSE_CLAIM_RECEIPT_REQUIRED',
        message: `A receipt is required for claims above ${policy.receiptRequiredAbove} ${policy.currencyCode}`,
      });
    }

    const violation = policy
      ? await this.checkPolicyCaps(claim, policy, tenantId)
      : null;

    const before = claim.status;
    claim.status = ExpenseClaimStatus.SUBMITTED;
    claim.submittedAt = new Date();
    claim.policyViolation = violation;
    const saved = await this.claimRepository.save(claim);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'expense_claim.submit',
      entityType: 'expense_claim',
      entityId: saved.id,
      changes: {
        status: { old: before, new: saved.status },
        policyViolation: { old: null, new: saved.policyViolation },
      },
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
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.getClaimOrThrow(id, tenantId);
    await this.assertManagerOrPrivileged(claim.workerId, actorId, tenantId);
    this.assertStatus(claim, [ExpenseClaimStatus.SUBMITTED], 'approve-manager');

    const before = claim.status;
    claim.status = ExpenseClaimStatus.APPROVED;
    claim.managerApprovedBy = actorId;
    claim.managerApprovedAt = new Date();
    const saved = await this.claimRepository.save(claim);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'expense_claim.approve_manager',
      entityType: 'expense_claim',
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
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.getClaimOrThrow(id, tenantId);
    await this.assertFinanceAuth(actorId, tenantId);
    this.assertStatus(claim, [ExpenseClaimStatus.APPROVED], 'approve-finance');

    claim.financeApprovedBy = actorId;
    claim.financeApprovedAt = new Date();
    const saved = await this.claimRepository.save(claim);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'expense_claim.approve_finance',
      entityType: 'expense_claim',
      entityId: saved.id,
      changes: {
        financeApprovedAt: { old: null, new: saved.financeApprovedAt },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async markPaid(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.getClaimOrThrow(id, tenantId);
    await this.assertFinanceAuth(actorId, tenantId);
    this.assertStatus(claim, [ExpenseClaimStatus.APPROVED], 'mark-paid');

    const before = claim.status;
    claim.status = ExpenseClaimStatus.PAID;
    const saved = await this.claimRepository.save(claim);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'expense_claim.mark_paid',
      entityType: 'expense_claim',
      entityId: saved.id,
      changes: { status: { old: before, new: saved.status } },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async reject(
    id: string,
    dto: RejectExpenseClaimDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.getClaimOrThrow(id, tenantId);
    await this.assertManagerOrPrivileged(claim.workerId, actorId, tenantId);
    this.assertStatus(
      claim,
      [ExpenseClaimStatus.SUBMITTED, ExpenseClaimStatus.APPROVED],
      'reject',
    );

    const before = claim.status;
    claim.status = ExpenseClaimStatus.REJECTED;
    claim.rejectionReason = dto.reason;
    const saved = await this.claimRepository.save(claim);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'expense_claim.reject',
      entityType: 'expense_claim',
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

  async listPolicies(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ExpensePolicyEntity[]> {
    return this.policyRepository.find({
      where: { tenantId },
      order: { countryCode: 'ASC', category: 'ASC' },
    });
  }

  async upsertPolicy(
    dto: UpsertExpensePolicyDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ExpensePolicyEntity> {
    const countryCode = dto.countryCode.toUpperCase();
    const existing = await this.policyRepository.findOne({
      where: { tenantId, countryCode, category: dto.category },
    });

    const before = existing
      ? { dailyCap: existing.dailyCap, monthlyCap: existing.monthlyCap }
      : null;

    const policy = this.policyRepository.create({
      ...existing,
      tenantId,
      countryCode,
      category: dto.category,
      dailyCap: dto.dailyCap !== undefined ? dto.dailyCap.toFixed(2) : null,
      monthlyCap:
        dto.monthlyCap !== undefined ? dto.monthlyCap.toFixed(2) : null,
      receiptRequiredAbove:
        dto.receiptRequiredAbove !== undefined
          ? dto.receiptRequiredAbove.toFixed(2)
          : null,
      currencyCode: dto.currencyCode.toUpperCase(),
    });

    const saved = await this.policyRepository.save(policy);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: existing ? 'expense_policy.update' : 'expense_policy.create',
      entityType: 'expense_policy',
      entityId: saved.id,
      changes: {
        dailyCap: { old: before?.dailyCap ?? null, new: saved.dailyCap },
        monthlyCap: { old: before?.monthlyCap ?? null, new: saved.monthlyCap },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  private async checkPolicyCaps(
    claim: ExpenseClaimEntity,
    policy: ExpensePolicyEntity,
    tenantId: string,
  ): Promise<ExpensePolicyViolation | null> {
    const activeStatuses = [
      ExpenseClaimStatus.SUBMITTED,
      ExpenseClaimStatus.APPROVED,
      ExpenseClaimStatus.PAID,
    ];

    if (policy.dailyCap) {
      const dailyTotal = await this.sumClaimsInRange(
        claim.workerId,
        claim.category,
        claim.expenseDate,
        claim.expenseDate,
        activeStatuses,
        tenantId,
        claim.id,
      );
      const total = dailyTotal + Number(claim.amount);
      if (total > Number(policy.dailyCap)) {
        return {
          type: 'daily_cap',
          capAmount: policy.dailyCap,
          actualAmount: total.toFixed(2),
          currencyCode: policy.currencyCode,
        };
      }
    }

    if (policy.monthlyCap) {
      const month = claim.expenseDate.slice(0, 7);
      const monthlyTotal = await this.sumClaimsInRange(
        claim.workerId,
        claim.category,
        `${month}-01`,
        `${month}-31`,
        activeStatuses,
        tenantId,
        claim.id,
      );
      const total = monthlyTotal + Number(claim.amount);
      if (total > Number(policy.monthlyCap)) {
        return {
          type: 'monthly_cap',
          capAmount: policy.monthlyCap,
          actualAmount: total.toFixed(2),
          currencyCode: policy.currencyCode,
        };
      }
    }

    return null;
  }

  private async sumClaimsInRange(
    workerId: string,
    category: ExpenseCategory,
    from: string,
    to: string,
    statuses: ExpenseClaimStatus[],
    tenantId: string,
    excludeId: string,
  ): Promise<number> {
    const rows: Array<{ total: string | null }> = await this.dataSource.query(
      `
      SELECT SUM(amount) AS total
      FROM expense_claims
      WHERE "tenantId" = $1
        AND "workerId" = $2
        AND category = $3
        AND "expenseDate" BETWEEN $4 AND $5
        AND status = ANY($6)
        AND id != $7
      `,
      [tenantId, workerId, category, from, to, statuses, excludeId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  private resolveAmount(
    amount: number | undefined,
    lines: ExpenseClaimLineDto[] | undefined,
  ): number {
    if (lines && lines.length > 0) {
      return lines.reduce((total, line) => total + line.amount, 0);
    }
    if (amount === undefined) {
      throw new BadRequestException({
        code: 'EXPENSE_CLAIM_AMOUNT_REQUIRED',
        message: 'Provide either amount or lines',
      });
    }
    return amount;
  }

  private buildLineEntities(
    manager: EntityManager,
    lines: ExpenseClaimLineDto[],
    tenantId: string,
    expenseClaimId: string,
  ): ExpenseClaimLineEntity[] {
    return lines.map((line) =>
      manager.create(ExpenseClaimLineEntity, {
        tenantId,
        expenseClaimId,
        description: line.description,
        amount: line.amount.toFixed(2),
        expenseDate: line.expenseDate ?? null,
      }),
    );
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
          code: 'EXPENSE_CLAIM_WORKER_REQUIRED',
          message: 'workerId is required',
        });
      }
      return workerId;
    }

    if (!actingWorkerId) {
      throw new ForbiddenException({
        code: 'EXPENSE_CLAIM_ACCESS_DENIED',
        message: 'No worker profile linked to this account',
      });
    }
    if (dtoWorkerId && dtoWorkerId !== actingWorkerId) {
      throw new ForbiddenException({
        code: 'EXPENSE_CLAIM_ACCESS_DENIED',
        message: 'Cannot create a claim for another worker',
      });
    }
    return actingWorkerId;
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
        code: 'EXPENSE_CLAIM_ACCESS_DENIED',
        message: 'Finance access required for this action',
      });
    }
  }

  private async assertOwnerOrPrivileged(
    claimWorkerId: string,
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
    if (!actingWorkerId || actingWorkerId !== claimWorkerId) {
      throw new ForbiddenException({
        code: 'EXPENSE_CLAIM_ACCESS_DENIED',
        message:
          'Only the claimant or Finance/People Ops may manage this claim',
      });
    }
  }

  private async assertManagerOrPrivileged(
    claimWorkerId: string,
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
          where: { id: claimWorkerId, tenantId },
        }),
        resolveActingWorkerId(this.workerRepository, actorId, tenantId),
      ]);
      // SoD: a manager cannot approve/reject their own claim.
      if (
        worker &&
        actingWorkerId &&
        worker.managerId === actingWorkerId &&
        claimWorkerId !== actingWorkerId
      ) {
        return;
      }
    }

    throw new ForbiddenException({
      code: 'EXPENSE_CLAIM_ACCESS_DENIED',
      message: 'Manager or Finance/People Ops access required',
    });
  }

  private async assertCanView(
    claim: ExpenseClaimEntity,
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
    if (actingWorkerId && actingWorkerId === claim.workerId) {
      return;
    }

    if (auth.roleCodes.includes(PolarisRoleCode.MANAGER) && actingWorkerId) {
      const worker = await this.workerRepository.findOne({
        where: { id: claim.workerId, tenantId },
      });
      if (worker && worker.managerId === actingWorkerId) {
        return;
      }
    }

    throw new ForbiddenException({
      code: 'EXPENSE_CLAIM_ACCESS_DENIED',
      message: 'Insufficient permissions to view this claim',
    });
  }

  private assertStatus(
    claim: ExpenseClaimEntity,
    allowed: ExpenseClaimStatus[],
    action: string,
  ): void {
    if (!allowed.includes(claim.status)) {
      throw new BadRequestException({
        code: 'EXPENSE_CLAIM_INVALID_STATUS',
        message: `Cannot ${action} a claim in status ${claim.status}`,
      });
    }
  }

  private async getClaimOrThrow(
    id: string,
    tenantId: string,
    relations: string[] = [],
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.claimRepository.findOne({
      where: { id, tenantId },
      relations,
    });

    if (!claim) {
      throw new NotFoundException({
        code: 'EXPENSE_CLAIM_NOT_FOUND',
        message: 'Expense claim not found',
      });
    }

    return claim;
  }
}
