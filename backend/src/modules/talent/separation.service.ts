import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import { WorkerService } from '@/modules/core-hr/worker.service';
import { canAccessWorkerRecord } from '@/modules/time-leave/time-leave-scope.util';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ClearClearanceItemDto,
  InitiateSeparationDto,
} from './dto/onboarding.dto';
import { ClearanceItemEntity } from './entities/clearance-item.entity';
import { SeparationCaseEntity } from './entities/separation-case.entity';
import {
  ClearanceCategory,
  ClearanceItemStatus,
  SeparationCaseStatus,
} from './enums/onboarding.enum';
import { OnboardingService } from './onboarding.service';
import {
  isPeopleOpsOrSuperAdmin,
  redactNestedWorker,
  redactSeparationReason,
} from './talent-response.util';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

const DEFAULT_CLEARANCE_ITEMS: Array<{
  category: ClearanceCategory;
  title: string;
}> = [
  {
    category: ClearanceCategory.HR,
    title: 'HR exit checklist & documentation',
  },
  { category: ClearanceCategory.IT, title: 'IT assets & access revocation' },
  {
    category: ClearanceCategory.FINANCE,
    title: 'Finance settlement & advances',
  },
  {
    category: ClearanceCategory.MANAGER,
    title: 'Manager handover & knowledge transfer',
  },
];

const CATEGORY_CLEAR_ROLES: Record<ClearanceCategory, PolarisRoleCode[]> = {
  [ClearanceCategory.HR]: [
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  ],
  [ClearanceCategory.IT]: [
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  ],
  [ClearanceCategory.FINANCE]: [
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  ],
  [ClearanceCategory.MANAGER]: [
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.DIVISION_HEAD,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  ],
};

@Injectable()
export class SeparationService {
  constructor(
    @InjectRepository(SeparationCaseEntity)
    private readonly separationRepository: Repository<SeparationCaseEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly dataSource: DataSource,
    private readonly onboardingService: OnboardingService,
    private readonly workerService: WorkerService,
  ) {}

  async initiate(
    dto: InitiateSeparationDto,
    actor: ActorContext,
  ): Promise<SeparationCaseEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const auth = await this.rbacService.getAuthContext(actor.userId, tenantId);
    this.assertPeopleOpsAuth(auth);
    return this.createOpenSeparation(dto, actor, tenantId, auth);
  }

  /**
   * US-TAL-004 AC2 — manager (or People Ops) may start separation after a
   * probation review is marked terminate.
   */
  async initiateFromProbationTerminate(
    dto: InitiateSeparationDto,
    actor: ActorContext,
    allowedManagerWorkerId: string | null,
  ): Promise<SeparationCaseEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const auth = await this.rbacService.getAuthContext(actor.userId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actor.userId,
      tenantId,
    );
    const allowed =
      isPeopleOpsOrSuperAdmin(auth) ||
      (allowedManagerWorkerId != null &&
        actingWorkerId === allowedManagerWorkerId);
    if (!allowed) {
      throw new ForbiddenException({
        code: 'SEPARATION_ACCESS_DENIED',
        message:
          'Only the review manager or People Ops can trigger separation from a failed probation',
      });
    }
    return this.createOpenSeparation(dto, actor, tenantId, auth);
  }

  private async createOpenSeparation(
    dto: InitiateSeparationDto,
    actor: ActorContext,
    tenantId: string,
    auth: PolarisAuthContext,
  ): Promise<SeparationCaseEntity> {
    const worker = await this.workerRepository.findOne({
      where: { id: dto.workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    const openStatuses = [
      SeparationCaseStatus.INITIATED,
      SeparationCaseStatus.IN_PROGRESS,
    ];
    const existingOpen = await this.separationRepository.findOne({
      where: openStatuses.map((status) => ({
        tenantId,
        workerId: dto.workerId,
        status,
      })),
    });
    if (existingOpen) {
      throw new BadRequestException({
        code: 'SEPARATION_ALREADY_OPEN',
        message: 'An open separation already exists for this worker',
      });
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const separation = await manager.save(
        SeparationCaseEntity,
        manager.create(SeparationCaseEntity, {
          tenantId,
          workerId: dto.workerId,
          lastWorkingDay: dto.lastWorkingDay,
          status: SeparationCaseStatus.INITIATED,
          reason: dto.reason ?? null,
        }),
      );

      await manager.save(
        ClearanceItemEntity,
        DEFAULT_CLEARANCE_ITEMS.map((item) =>
          manager.create(ClearanceItemEntity, {
            separationCaseId: separation.id,
            category: item.category,
            title: item.title,
            status: ClearanceItemStatus.PENDING,
            clearedBy: null,
            clearedAt: null,
          }),
        ),
      );

      return separation;
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'separation.initiate',
      entityType: 'separation_case',
      entityId: saved.id,
      changes: {
        workerId: { old: null, new: dto.workerId },
        lastWorkingDay: { old: null, new: dto.lastWorkingDay },
        status: { old: null, new: SeparationCaseStatus.INITIATED },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
    return this.getSeparationOrFail(saved.id, tenantId, auth);
  }

  async getSeparation(
    id: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<SeparationCaseEntity> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const separation = await this.getSeparationOrFail(id, tenantId, auth);
    await this.assertCanReadSeparation(separation, actorId, tenantId, auth);
    return separation;
  }

  async clearItem(
    separationId: string,
    itemId: string,
    dto: ClearClearanceItemDto,
    actor: ActorContext,
  ): Promise<SeparationCaseEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const auth = await this.rbacService.getAuthContext(actor.userId, tenantId);

    const separation = await this.getSeparationOrFail(
      separationId,
      tenantId,
      auth,
    );
    const item = separation.clearanceItems?.find(
      (entry) => entry.id === itemId,
    );
    if (!item) {
      throw new NotFoundException({
        code: 'CLEARANCE_ITEM_NOT_FOUND',
        message: 'Clearance item not found',
      });
    }

    await this.assertCanClearItem(
      item,
      separation,
      actor.userId,
      tenantId,
      auth,
    );

    if (
      item.status === ClearanceItemStatus.CLEARED ||
      item.status === ClearanceItemStatus.WAIVED
    ) {
      throw new BadRequestException({
        code: 'CLEARANCE_ALREADY_DONE',
        message: 'Clearance item is already cleared or waived',
      });
    }

    const previousStatus = item.status;
    const nextStatus = dto.waive
      ? ClearanceItemStatus.WAIVED
      : ClearanceItemStatus.CLEARED;

    await this.dataSource.transaction(async (manager) => {
      item.status = nextStatus;
      item.clearedBy = actor.userId;
      item.clearedAt = new Date();
      await manager.save(ClearanceItemEntity, item);

      const items = await manager.find(ClearanceItemEntity, {
        where: { separationCaseId: separationId },
      });
      const pending = items.filter(
        (entry) => entry.status === ClearanceItemStatus.PENDING,
      );

      if (pending.length === 0) {
        const previousCaseStatus = separation.status;
        separation.status = SeparationCaseStatus.CLEARED;
        await manager.save(SeparationCaseEntity, separation);

        await this.auditLogService.append({
          tenantId,
          actorId: actor.userId,
          action: 'separation.cleared',
          entityType: 'separation_case',
          entityId: separation.id,
          changes: {
            status: {
              old: previousCaseStatus,
              new: SeparationCaseStatus.CLEARED,
            },
          },
          correlationId: actor.correlationId,
          ipAddress: actor.ipAddress,
        });
      } else if (separation.status === SeparationCaseStatus.INITIATED) {
        separation.status = SeparationCaseStatus.IN_PROGRESS;
        await manager.save(SeparationCaseEntity, separation);
      }
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'separation.clearance.clear',
      entityType: 'clearance_item',
      entityId: itemId,
      changes: {
        status: { old: previousStatus, new: nextStatus },
        separationCaseId: { old: null, new: separationId },
        category: { old: null, new: item.category },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    const refreshed = await this.getSeparationOrFail(
      separationId,
      tenantId,
      auth,
    );
    if (refreshed.status === SeparationCaseStatus.CLEARED) {
      await this.maybeCompleteSeparationOnClearance(refreshed, actor, auth);
    }

    return refreshed;
  }

  async getBoard(
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<Record<SeparationCaseStatus, SeparationCaseEntity[]>> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    this.assertPeopleOpsAuth(auth);

    const cases = await this.separationRepository.find({
      where: { tenantId },
      relations: ['clearanceItems', 'worker'],
      order: { updatedAt: 'DESC' },
    });

    const board: Record<SeparationCaseStatus, SeparationCaseEntity[]> = {
      [SeparationCaseStatus.INITIATED]: [],
      [SeparationCaseStatus.IN_PROGRESS]: [],
      [SeparationCaseStatus.CLEARED]: [],
      [SeparationCaseStatus.ARCHIVED]: [],
    };

    for (const separation of cases) {
      board[separation.status].push(
        this.applyResponseRedaction(separation, auth),
      );
    }

    return board;
  }

  /**
   * Entra disable + worker archival only fire when People Ops completes
   * clearance AND the last working day has arrived. Managers clearing the
   * board must not trigger disable/archive.
   */
  private async maybeCompleteSeparationOnClearance(
    separation: SeparationCaseEntity,
    actor: ActorContext,
    auth: PolarisAuthContext,
  ): Promise<void> {
    if (!isPeopleOpsOrSuperAdmin(auth)) {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (separation.lastWorkingDay > today) {
      await this.auditLogService.append({
        tenantId: actor.tenantId ?? DIGITARO_TENANT_ID,
        actorId: actor.userId,
        action: 'entra.disable.deferred',
        entityType: 'separation_case',
        entityId: separation.id,
        changes: {
          lastWorkingDay: { old: null, new: separation.lastWorkingDay },
          reason: {
            old: null,
            new: 'Clearance complete before last working day; Graph disable and worker archive deferred',
          },
        },
        correlationId: actor.correlationId,
        ipAddress: actor.ipAddress,
      });
      return;
    }

    await this.onboardingService.disableEntraAccount(
      separation.workerId,
      actor,
    );
    await this.archiveWorkerOnSeparation(separation, actor);
  }

  /**
   * Clearance complete AND last working day passed — archive the separated
   * worker (soft delete + status=archived) and mark the separation case
   * archived. Both audit_log entries reference the separation case id so the
   * two lifecycle events are cross-linkable evidence.
   */
  private async archiveWorkerOnSeparation(
    separation: SeparationCaseEntity,
    actor: ActorContext,
  ): Promise<void> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;

    await this.workerService.archive(
      separation.workerId,
      actor.userId,
      actor.correlationId,
      actor.ipAddress,
      tenantId,
    );

    const previousStatus = separation.status;
    separation.status = SeparationCaseStatus.ARCHIVED;
    await this.separationRepository.save(separation);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'separation.archived',
      entityType: 'separation_case',
      entityId: separation.id,
      changes: {
        status: { old: previousStatus, new: SeparationCaseStatus.ARCHIVED },
        workerId: { old: null, new: separation.workerId },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
  }

  private async assertCanClearItem(
    item: ClearanceItemEntity,
    separation: SeparationCaseEntity,
    actorId: string,
    tenantId: string,
    auth: PolarisAuthContext,
  ): Promise<void> {
    const allowedRoles = CATEGORY_CLEAR_ROLES[item.category] ?? [];
    const hasRole = auth.roleCodes.some((code) =>
      allowedRoles.includes(code as PolarisRoleCode),
    );
    if (!hasRole) {
      throw new ForbiddenException({
        code: 'CLEARANCE_ROLE_DENIED',
        message: `Insufficient role to clear ${item.category} clearance items`,
      });
    }

    if (isPeopleOpsOrSuperAdmin(auth)) {
      return;
    }

    // Managers / division heads: only MANAGER category + team/division scope
    if (item.category === ClearanceCategory.MANAGER) {
      const actingWorkerId = await resolveActingWorkerId(
        this.workerRepository,
        actorId,
        tenantId,
      );
      const target = separation.worker ?? {
        id: separation.workerId,
        managerId: null,
        divisionId: null,
      };
      if (
        !canAccessWorkerRecord(auth, actingWorkerId, {
          id: target.id,
          managerId: (target as WorkerEntity).managerId ?? null,
          divisionId: (target as WorkerEntity).divisionId ?? null,
        })
      ) {
        throw new ForbiddenException({
          code: 'CLEARANCE_SCOPE_DENIED',
          message: 'You can only clear manager items for workers in your scope',
        });
      }
      return;
    }

    // Finance / IT_ADMIN: category role is enough (no team forge of HR/IT/Finance by managers)
  }

  private async assertCanReadSeparation(
    separation: SeparationCaseEntity,
    actorId: string,
    tenantId: string,
    auth: PolarisAuthContext,
  ): Promise<void> {
    if (isPeopleOpsOrSuperAdmin(auth)) {
      return;
    }

    const isManager = auth.roleCodes.some((code) =>
      [PolarisRoleCode.MANAGER, PolarisRoleCode.DIVISION_HEAD].includes(
        code as PolarisRoleCode,
      ),
    );
    if (!isManager) {
      throw new ForbiddenException({
        code: 'SEPARATION_ACCESS_DENIED',
        message: 'Insufficient role for separation access',
      });
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorId,
      tenantId,
    );
    const target = separation.worker ?? {
      id: separation.workerId,
      managerId: null,
      divisionId: null,
    };
    if (
      !canAccessWorkerRecord(auth, actingWorkerId, {
        id: target.id,
        managerId: (target as WorkerEntity).managerId ?? null,
        divisionId: (target as WorkerEntity).divisionId ?? null,
      })
    ) {
      throw new ForbiddenException({
        code: 'SEPARATION_SCOPE_DENIED',
        message: 'You do not have access to this separation case',
      });
    }
  }

  private async getSeparationOrFail(
    id: string,
    tenantId: string,
    auth: PolarisAuthContext,
  ): Promise<SeparationCaseEntity> {
    const separation = await this.separationRepository.findOne({
      where: { id, tenantId },
      relations: ['clearanceItems', 'worker'],
    });
    if (!separation) {
      throw new NotFoundException({
        code: 'SEPARATION_NOT_FOUND',
        message: 'Separation case not found',
      });
    }
    return this.applyResponseRedaction(separation, auth);
  }

  private applyResponseRedaction(
    separation: SeparationCaseEntity,
    auth: PolarisAuthContext,
  ): SeparationCaseEntity {
    separation.reason = redactSeparationReason(separation.reason, auth);
    if (separation.worker) {
      separation.worker = redactNestedWorker(
        separation.worker,
        auth,
      ) as unknown as WorkerEntity;
    }
    return separation;
  }

  private assertPeopleOpsAuth(auth: PolarisAuthContext): void {
    if (!isPeopleOpsOrSuperAdmin(auth)) {
      throw new ForbiddenException({
        code: 'SEPARATION_ACCESS_DENIED',
        message: 'People Ops access required',
      });
    }
  }
}
