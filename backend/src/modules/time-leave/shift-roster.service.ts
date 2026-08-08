import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
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
import { DataSource, Repository } from 'typeorm';
import {
  CreateShiftRosterDto,
  PublishShiftAssignmentsDto,
  QueryShiftAssignmentsDto,
  QueryShiftRostersDto,
  UpdateShiftRosterDto,
} from './dto/shift-roster.dto';
import { ShiftAssignmentEntity } from './entities/shift-assignment.entity';
import { ShiftRosterEntity } from './entities/shift-roster.entity';
import { LeaveRequestEntity } from './entities/leave-request.entity';
import { LeaveRequestStatus } from './enums/leave.enum';
import {
  assertWorkerRecordAccess,
  canAccessWorkerRecord,
  isPeopleOpsOrAdmin,
} from './time-leave-scope.util';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

export type ShiftAssignmentConflict = {
  workerId: string;
  shiftDate: string;
  leaveRequestId: string;
};

const PUBLISHER_ROLES = [
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@Injectable()
export class ShiftRosterService {
  constructor(
    @InjectRepository(ShiftRosterEntity)
    private readonly rosterRepository: Repository<ShiftRosterEntity>,
    @InjectRepository(ShiftAssignmentEntity)
    private readonly assignmentRepository: Repository<ShiftAssignmentEntity>,
    @InjectRepository(LeaveRequestEntity)
    private readonly leaveRequestRepository: Repository<LeaveRequestEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly dataSource: DataSource,
  ) {}

  async createRoster(
    dto: CreateShiftRosterDto,
    actor: ActorContext,
  ): Promise<ShiftRosterEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPublisher(actor.userId, tenantId);

    if (
      dto.effectiveTo &&
      new Date(dto.effectiveTo) < new Date(dto.effectiveFrom)
    ) {
      throw new BadRequestException({
        code: 'INVALID_ROSTER_DATES',
        message: 'effectiveTo must be on or after effectiveFrom',
      });
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actor.userId,
      tenantId,
    );

    const saved = await this.rosterRepository.save(
      this.rosterRepository.create({
        tenantId,
        name: dto.name,
        divisionId: dto.divisionId ?? null,
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo ?? null,
        createdBy: actingWorkerId ?? null,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'shift_roster.create',
      entityType: 'shift_roster',
      entityId: saved.id,
      changes: {
        name: { old: null, new: saved.name },
        divisionId: { old: null, new: saved.divisionId },
        effectiveFrom: { old: null, new: saved.effectiveFrom },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async listRosters(
    query: QueryShiftRostersDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<ShiftRosterEntity>> {
    await this.assertPublisher(actorUserId, tenantId);
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.rosterRepository
      .createQueryBuilder('roster')
      .where('roster.tenantId = :tenantId', { tenantId })
      .orderBy('roster.effectiveFrom', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.divisionId) {
      qb.andWhere('roster.divisionId = :divisionId', {
        divisionId: query.divisionId,
      });
    }

    if (!isPeopleOpsOrAdmin(auth)) {
      const divisionScopeIds = auth.assignments
        .filter((a) => a.scopeType === ScopeType.DIVISION && a.scopeId)
        .map((a) => a.scopeId as string);

      if (divisionScopeIds.length > 0) {
        qb.andWhere(
          '(roster.divisionId IN (:...divisionScopeIds) OR roster.createdBy = :actingWorkerId)',
          { divisionScopeIds, actingWorkerId },
        );
      } else if (actingWorkerId) {
        const actingWorker = await this.workerRepository.findOne({
          where: { id: actingWorkerId, tenantId },
        });
        qb.andWhere(
          '(roster.createdBy = :actingWorkerId OR (roster.divisionId = :ownDivisionId AND roster.divisionId IS NOT NULL))',
          {
            actingWorkerId,
            ownDivisionId: actingWorker?.divisionId ?? null,
          },
        );
      } else {
        return { items: [], meta: { page, limit, totalItems: 0, totalPages: 0 } };
      }
    }

    const [items, totalItems] = await qb.getManyAndCount();
    return {
      items,
      meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 0 },
    };
  }

  async getRoster(
    id: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ShiftRosterEntity> {
    await this.assertPublisher(actorUserId, tenantId);
    return this.getRosterOrThrow(id, tenantId, ['assignments']);
  }

  async updateRoster(
    id: string,
    dto: UpdateShiftRosterDto,
    actor: ActorContext,
  ): Promise<ShiftRosterEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPublisher(actor.userId, tenantId);
    const roster = await this.getRosterOrThrow(id, tenantId);
    const before = { ...roster };

    roster.name = dto.name ?? roster.name;
    roster.effectiveFrom = dto.effectiveFrom ?? roster.effectiveFrom;
    if (dto.effectiveTo !== undefined) {
      roster.effectiveTo = dto.effectiveTo;
    }

    const saved = await this.rosterRepository.save(roster);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'shift_roster.update',
      entityType: 'shift_roster',
      entityId: saved.id,
      changes: {
        name: { old: before.name, new: saved.name },
        effectiveFrom: { old: before.effectiveFrom, new: saved.effectiveFrom },
        effectiveTo: { old: before.effectiveTo, new: saved.effectiveTo },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async deleteRoster(id: string, actor: ActorContext): Promise<void> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPublisher(actor.userId, tenantId);
    const roster = await this.getRosterOrThrow(id, tenantId, ['assignments']);

    if (roster.assignments && roster.assignments.length > 0) {
      throw new BadRequestException({
        code: 'ROSTER_HAS_ASSIGNMENTS',
        message: 'Cannot delete a roster with published assignments',
      });
    }

    await this.rosterRepository.remove(roster);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'shift_roster.delete',
      entityType: 'shift_roster',
      entityId: id,
      changes: { name: { old: roster.name, new: null } },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
  }

  /**
   * FLW-TIME-005 — publish shift assignments for a roster.
   * Flags conflicts with approved leave; advisory by default, blocked unless `force` set.
   */
  async publishAssignments(
    rosterId: string,
    dto: PublishShiftAssignmentsDto,
    actor: ActorContext,
  ): Promise<{
    assignments: ShiftAssignmentEntity[];
    conflicts: ShiftAssignmentConflict[];
  }> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const auth = await this.rbacService.getAuthContext(actor.userId, tenantId);
    if (!isPeopleOpsOrAdmin(auth) && !auth.roleCodes.includes(PolarisRoleCode.MANAGER)) {
      throw new ForbiddenException({
        code: 'SHIFT_ROSTER_ACCESS_DENIED',
        message: 'Insufficient role to publish shift assignments',
      });
    }

    const roster = await this.getRosterOrThrow(rosterId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actor.userId,
      tenantId,
    );

    if (!dto.assignments?.length) {
      throw new BadRequestException({
        code: 'NO_ASSIGNMENTS',
        message: 'At least one assignment is required',
      });
    }

    const workerCache = new Map<string, WorkerEntity>();
    for (const item of dto.assignments) {
      if (!workerCache.has(item.workerId)) {
        const worker = await this.workerRepository.findOne({
          where: { id: item.workerId, tenantId },
        });
        if (!worker) {
          throw new NotFoundException({
            code: 'WORKER_NOT_FOUND',
            message: `Worker ${item.workerId} not found`,
          });
        }
        workerCache.set(item.workerId, worker);
      }

      const target = workerCache.get(item.workerId) as WorkerEntity;
      assertWorkerRecordAccess(auth, actingWorkerId, {
        id: target.id,
        managerId: target.managerId,
        divisionId: target.divisionId,
      });
    }

    const conflicts = await this.findLeaveConflicts(dto.assignments, tenantId);
    if (conflicts.length > 0 && !dto.force) {
      throw new BadRequestException({
        code: 'SHIFT_ROSTER_LEAVE_CONFLICT',
        message: 'Shift assignments conflict with approved leave',
        conflicts,
      });
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const results: ShiftAssignmentEntity[] = [];
      for (const item of dto.assignments) {
        let assignment = await manager.findOne(ShiftAssignmentEntity, {
          where: { tenantId, workerId: item.workerId, shiftDate: item.shiftDate },
        });

        if (assignment) {
          assignment.shiftRosterId = rosterId;
          assignment.shiftType = item.shiftType;
          assignment.startTime = item.startTime;
          assignment.endTime = item.endTime;
        } else {
          assignment = manager.create(ShiftAssignmentEntity, {
            tenantId,
            shiftRosterId: rosterId,
            workerId: item.workerId,
            shiftDate: item.shiftDate,
            shiftType: item.shiftType,
            startTime: item.startTime,
            endTime: item.endTime,
          });
        }
        results.push(await manager.save(ShiftAssignmentEntity, assignment));
      }
      return results;
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'shift_roster.assignments.publish',
      entityType: 'shift_roster',
      entityId: roster.id,
      changes: {
        assignmentCount: { old: null, new: saved.length },
        conflictCount: { old: null, new: conflicts.length },
        forced: { old: null, new: Boolean(dto.force) },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return { assignments: saved, conflicts };
  }

  async listAssignments(
    query: QueryShiftAssignmentsDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<ShiftAssignmentEntity>> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const qb = this.assignmentRepository
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.worker', 'worker')
      .where('assignment.tenantId = :tenantId', { tenantId })
      .andWhere('assignment.shiftDate BETWEEN :from AND :to', {
        from: query.from,
        to: query.to,
      })
      .orderBy('assignment.shiftDate', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.shiftRosterId) {
      qb.andWhere('assignment.shiftRosterId = :shiftRosterId', {
        shiftRosterId: query.shiftRosterId,
      });
    }

    if (query.divisionId) {
      qb.andWhere('worker.divisionId = :divisionId', {
        divisionId: query.divisionId,
      });
    }

    if (query.workerId) {
      const target = await this.getWorkerOrThrow(query.workerId, tenantId);
      assertWorkerRecordAccess(auth, actingWorkerId, target);
      qb.andWhere('assignment.workerId = :workerId', { workerId: query.workerId });
    } else if (!isPeopleOpsOrAdmin(auth)) {
      if (!actingWorkerId) {
        return { items: [], meta: { page, limit, totalItems: 0, totalPages: 0 } };
      }
      if (auth.roleCodes.includes(PolarisRoleCode.MANAGER)) {
        qb.andWhere(
          '(assignment.workerId = :actingWorkerId OR worker.managerId = :actingWorkerId)',
          { actingWorkerId },
        );
      } else {
        qb.andWhere('assignment.workerId = :actingWorkerId', { actingWorkerId });
      }
    }

    const [items, totalItems] = await qb.getManyAndCount();
    return {
      items,
      meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 0 },
    };
  }

  private async findLeaveConflicts(
    assignments: PublishShiftAssignmentsDto['assignments'],
    tenantId: string,
  ): Promise<ShiftAssignmentConflict[]> {
    const conflicts: ShiftAssignmentConflict[] = [];
    const workerIds = [...new Set(assignments.map((a) => a.workerId))];
    if (workerIds.length === 0) {
      return conflicts;
    }

    const approvedLeave = await this.leaveRequestRepository.find({
      where: { tenantId, status: LeaveRequestStatus.APPROVED },
    });
    const relevantLeave = approvedLeave.filter((leave) =>
      workerIds.includes(leave.workerId),
    );

    for (const item of assignments) {
      const conflict = relevantLeave.find(
        (leave) =>
          leave.workerId === item.workerId &&
          leave.startDate <= item.shiftDate &&
          leave.endDate >= item.shiftDate,
      );
      if (conflict) {
        conflicts.push({
          workerId: item.workerId,
          shiftDate: item.shiftDate,
          leaveRequestId: conflict.id,
        });
      }
    }

    return conflicts;
  }

  private async getRosterOrThrow(
    id: string,
    tenantId: string,
    relations: string[] = [],
  ): Promise<ShiftRosterEntity> {
    const roster = await this.rosterRepository.findOne({
      where: { id, tenantId },
      relations,
    });
    if (!roster) {
      throw new NotFoundException({
        code: 'SHIFT_ROSTER_NOT_FOUND',
        message: 'Shift roster not found',
      });
    }
    return roster;
  }

  private async getWorkerOrThrow(
    workerId: string,
    tenantId: string,
  ): Promise<WorkerEntity> {
    const worker = await this.workerRepository.findOne({
      where: { id: workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }
    return worker;
  }

  private async assertPublisher(
    actorUserId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const allowed = auth.roleCodes.some((code) =>
      PUBLISHER_ROLES.includes(code as PolarisRoleCode),
    );
    if (!allowed) {
      throw new ForbiddenException({
        code: 'SHIFT_ROSTER_ACCESS_DENIED',
        message: 'Manager, Division Head, or People Ops access required',
      });
    }
  }
}

/** Re-export for controller-level scope checks without duplicating logic. */
export { canAccessWorkerRecord };
