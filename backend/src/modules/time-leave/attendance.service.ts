import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { ApprovalDelegationEntity } from '@/modules/core-hr/entities/approval-delegation.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { DelegationScope } from '@/modules/core-hr/enums/delegation.enum';
import { WorkerStatus } from '@/modules/core-hr/enums/worker.enum';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
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
  CheckInDto,
  CreatePunchCorrectionDto,
  QueryPunchesDto,
} from './dto/attendance.dto';
import { AttendanceDaySummaryEntity } from './entities/attendance-day-summary.entity';
import { AttendancePunchEntity } from './entities/attendance-punch.entity';
import { PunchCorrectionRequestEntity } from './entities/punch-correction-request.entity';
import {
  AttendanceDayStatus,
  PunchCorrectionStatus,
  PunchSource,
  PunchType,
} from './enums/attendance.enum';
import { LeaveRequestStatus } from './enums/leave.enum';
import {
  assertWorkerRecordAccess,
  isPeopleOpsOrAdmin,
  workDateInTimezone,
} from './time-leave-scope.util';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendancePunchEntity)
    private readonly punchRepository: Repository<AttendancePunchEntity>,
    @InjectRepository(AttendanceDaySummaryEntity)
    private readonly daySummaryRepository: Repository<AttendanceDaySummaryEntity>,
    @InjectRepository(PunchCorrectionRequestEntity)
    private readonly correctionRepository: Repository<PunchCorrectionRequestEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(ApprovalDelegationEntity)
    private readonly delegationRepository: Repository<ApprovalDelegationEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async checkIn(
    dto: CheckInDto,
    actor: ActorContext,
  ): Promise<{ punch: AttendancePunchEntity; daySummary: AttendanceDaySummaryEntity }> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const worker = await this.requireActingWorker(actor.userId, tenantId);
    const punchedAt = dto.clientPunchedAt
      ? new Date(dto.clientPunchedAt)
      : new Date();
    const timezone = dto.timezone ?? 'UTC';
    const workDate = workDateInTimezone(punchedAt, timezone);

    const existingSummary = await this.daySummaryRepository.findOne({
      where: { tenantId, workerId: worker.id, workDate },
    });

    if (
      existingSummary
      && (existingSummary.status === AttendanceDayStatus.IN
        || existingSummary.firstIn !== null)
    ) {
      const openCheckIn = await this.findOpenCheckIn(
        worker.id,
        workDate,
        timezone,
        tenantId,
      );
      // Allow another check-in after a completed check-out (multi-session days).
      if (openCheckIn || existingSummary.status === AttendanceDayStatus.IN) {
        throw new BadRequestException({
          code: 'ALREADY_CHECKED_IN',
          message: 'An open check-in already exists for today',
        });
      }
    }

    const punch = await this.punchRepository.save(
      this.punchRepository.create({
        tenantId,
        workerId: worker.id,
        punchType: PunchType.CHECK_IN,
        punchedAt,
        latitude: dto.latitude != null ? String(dto.latitude) : null,
        longitude: dto.longitude != null ? String(dto.longitude) : null,
        source: dto.source ?? PunchSource.WEB,
        timezone,
      }),
    );

    const daySummary = await this.upsertDaySummary({
      tenantId,
      workerId: worker.id,
      workDate,
      status: AttendanceDayStatus.IN,
      firstIn: existingSummary?.firstIn ?? punchedAt,
      lastOut: existingSummary?.lastOut ?? null,
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'attendance.punch.check_in',
      entityType: 'attendance_punch',
      entityId: punch.id,
      changes: {
        punchType: { old: null, new: PunchType.CHECK_IN },
        workDate: { old: null, new: workDate },
        source: { old: null, new: punch.source },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return { punch, daySummary };
  }

  async checkOut(
    dto: CheckInDto,
    actor: ActorContext,
  ): Promise<{ punch: AttendancePunchEntity; daySummary: AttendanceDaySummaryEntity }> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const worker = await this.requireActingWorker(actor.userId, tenantId);
    const punchedAt = dto.clientPunchedAt
      ? new Date(dto.clientPunchedAt)
      : new Date();
    const timezone = dto.timezone ?? 'UTC';
    const workDate = workDateInTimezone(punchedAt, timezone);

    const summary = await this.daySummaryRepository.findOne({
      where: { tenantId, workerId: worker.id, workDate },
    });

    if (!summary?.firstIn) {
      throw new BadRequestException({
        code: 'NO_CHECK_IN',
        message: 'Check-in is required before check-out',
      });
    }

    if (summary.status === AttendanceDayStatus.OUT && summary.lastOut) {
      throw new BadRequestException({
        code: 'ALREADY_CHECKED_OUT',
        message: 'Already checked out for today',
      });
    }

    const punch = await this.punchRepository.save(
      this.punchRepository.create({
        tenantId,
        workerId: worker.id,
        punchType: PunchType.CHECK_OUT,
        punchedAt,
        latitude: dto.latitude != null ? String(dto.latitude) : null,
        longitude: dto.longitude != null ? String(dto.longitude) : null,
        source: dto.source ?? PunchSource.WEB,
        timezone,
      }),
    );

    const daySummary = await this.upsertDaySummary({
      tenantId,
      workerId: worker.id,
      workDate,
      status: AttendanceDayStatus.OUT,
      firstIn: summary.firstIn,
      lastOut: punchedAt,
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'attendance.punch.check_out',
      entityType: 'attendance_punch',
      entityId: punch.id,
      changes: {
        punchType: { old: null, new: PunchType.CHECK_OUT },
        workDate: { old: null, new: workDate },
        source: { old: null, new: punch.source },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return { punch, daySummary };
  }

  async getToday(
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
    clientTimezone?: string,
  ): Promise<{
    workerId: string;
    workDate: string;
    daySummary: AttendanceDaySummaryEntity | null;
    punches: AttendancePunchEntity[];
  }> {
    const worker = await this.requireActingWorker(actorUserId, tenantId);
    // Match check-in: prefer client TZ (browser), then worker profile, then UTC.
    // Hardcoding UTC here caused "already checked in" while Home showed not checked in
    // for workers east of UTC (local date ahead of UTC date overnight / early morning).
    const timezone
      = clientTimezone?.trim() || worker.timezone?.trim() || 'UTC';
    const workDate = workDateInTimezone(new Date(), timezone);
    const daySummary = await this.daySummaryRepository.findOne({
      where: { tenantId, workerId: worker.id, workDate },
    });
    const punches = await this.punchRepository
      .createQueryBuilder('punch')
      .where('punch.tenantId = :tenantId', { tenantId })
      .andWhere('punch.workerId = :workerId', { workerId: worker.id })
      .andWhere(`(punch."punchedAt" AT TIME ZONE :tz)::date = :workDate`, {
        tz: timezone,
        workDate,
      })
      .orderBy('punch.punchedAt', 'ASC')
      .getMany();

    return { workerId: worker.id, workDate, daySummary, punches };
  }

  async listPunches(
    query: QueryPunchesDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<AttendancePunchEntity>> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.punchRepository
      .createQueryBuilder('punch')
      .innerJoinAndSelect('punch.worker', 'worker')
      .where('punch.tenantId = :tenantId', { tenantId })
      .orderBy('punch.punchedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.workerId) {
      const target = await this.getWorkerOrThrow(query.workerId, tenantId);
      assertWorkerRecordAccess(auth, actingWorkerId, target);
      qb.andWhere('punch.workerId = :workerId', { workerId: query.workerId });
    } else if (!isPeopleOpsOrAdmin(auth)) {
      if (!actingWorkerId) {
        return { items: [], meta: { page, limit, totalItems: 0, totalPages: 0 } };
      }
      if (auth.roleCodes.includes(PolarisRoleCode.MANAGER)) {
        qb.andWhere(
          '(punch.workerId = :actingWorkerId OR worker.managerId = :actingWorkerId)',
          { actingWorkerId },
        );
      } else {
        qb.andWhere('punch.workerId = :actingWorkerId', { actingWorkerId });
      }
    }

    if (query.from) {
      qb.andWhere('punch.punchedAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('punch.punchedAt <= :to', { to: new Date(query.to) });
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

  async createCorrection(
    dto: CreatePunchCorrectionDto,
    actor: ActorContext,
  ): Promise<PunchCorrectionRequestEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const worker = await this.requireActingWorker(actor.userId, tenantId);

    if (dto.punchId) {
      const punch = await this.punchRepository.findOne({
        where: { id: dto.punchId, tenantId, workerId: worker.id },
      });
      if (!punch) {
        throw new NotFoundException({
          code: 'PUNCH_NOT_FOUND',
          message: 'Punch not found',
        });
      }
    }

    const saved = await this.correctionRepository.save(
      this.correctionRepository.create({
        tenantId,
        workerId: worker.id,
        punchId: dto.punchId ?? null,
        requestedAt: new Date(),
        proposedType: dto.proposedType,
        proposedTime: new Date(dto.proposedTime),
        reason: dto.reason,
        status: PunchCorrectionStatus.SUBMITTED,
        approverId: null,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'attendance.punch_correction.create',
      entityType: 'punch_correction_request',
      entityId: saved.id,
      changes: {
        proposedType: { old: null, new: saved.proposedType },
        proposedTime: { old: null, new: saved.proposedTime.toISOString() },
        status: { old: null, new: saved.status },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async approveCorrection(
    id: string,
    actor: ActorContext,
  ): Promise<PunchCorrectionRequestEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const correction = await this.getCorrectionOrThrow(id, tenantId);
    await this.assertCanApproveForWorker(actor.userId, correction.workerId, tenantId);

    if (correction.status !== PunchCorrectionStatus.SUBMITTED) {
      throw new BadRequestException({
        code: 'INVALID_CORRECTION_STATUS',
        message: 'Only submitted corrections can be approved',
      });
    }

    const actingWorker = await resolveActingWorkerId(
      this.workerRepository,
      actor.userId,
      tenantId,
    );

    const punch = await this.punchRepository.save(
      this.punchRepository.create({
        tenantId,
        workerId: correction.workerId,
        punchType: correction.proposedType,
        punchedAt: correction.proposedTime,
        latitude: null,
        longitude: null,
        source: PunchSource.WEB,
        timezone: 'UTC',
      }),
    );

    const workDate = workDateInTimezone(correction.proposedTime, 'UTC');
    const existing = await this.daySummaryRepository.findOne({
      where: { tenantId, workerId: correction.workerId, workDate },
    });

    if (correction.proposedType === PunchType.CHECK_IN) {
      await this.upsertDaySummary({
        tenantId,
        workerId: correction.workerId,
        workDate,
        status: existing?.lastOut
          ? AttendanceDayStatus.OUT
          : AttendanceDayStatus.IN,
        firstIn: existing?.firstIn ?? correction.proposedTime,
        lastOut: existing?.lastOut ?? null,
      });
    } else {
      await this.upsertDaySummary({
        tenantId,
        workerId: correction.workerId,
        workDate,
        status: AttendanceDayStatus.OUT,
        firstIn: existing?.firstIn ?? correction.proposedTime,
        lastOut: correction.proposedTime,
      });
    }

    correction.status = PunchCorrectionStatus.APPROVED;
    correction.approverId = actingWorker ?? actor.userId;
    const saved = await this.correctionRepository.save(correction);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'attendance.punch_correction.approve',
      entityType: 'punch_correction_request',
      entityId: saved.id,
      changes: {
        status: {
          old: PunchCorrectionStatus.SUBMITTED,
          new: PunchCorrectionStatus.APPROVED,
        },
        punchId: { old: correction.punchId, new: punch.id },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async rejectCorrection(
    id: string,
    reason: string,
    actor: ActorContext,
  ): Promise<PunchCorrectionRequestEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const correction = await this.getCorrectionOrThrow(id, tenantId);
    await this.assertCanApproveForWorker(actor.userId, correction.workerId, tenantId);

    if (correction.status !== PunchCorrectionStatus.SUBMITTED) {
      throw new BadRequestException({
        code: 'INVALID_CORRECTION_STATUS',
        message: 'Only submitted corrections can be rejected',
      });
    }

    const actingWorker = await resolveActingWorkerId(
      this.workerRepository,
      actor.userId,
      tenantId,
    );

    correction.status = PunchCorrectionStatus.REJECTED;
    correction.approverId = actingWorker ?? actor.userId;
    correction.reason = `${correction.reason}\n[Reject] ${reason}`;
    const saved = await this.correctionRepository.save(correction);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'attendance.punch_correction.reject',
      entityType: 'punch_correction_request',
      entityId: saved.id,
      changes: {
        status: {
          old: PunchCorrectionStatus.SUBMITTED,
          new: PunchCorrectionStatus.REJECTED,
        },
        reason: { old: null, new: reason },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  private async findOpenCheckIn(
    workerId: string,
    workDate: string,
    timezone: string,
    tenantId: string,
  ): Promise<AttendancePunchEntity | null> {
    const punches = await this.punchRepository
      .createQueryBuilder('punch')
      .where('punch.tenantId = :tenantId', { tenantId })
      .andWhere('punch.workerId = :workerId', { workerId })
      .andWhere(`(punch."punchedAt" AT TIME ZONE :tz)::date = :workDate`, {
        tz: timezone,
        workDate,
      })
      .orderBy('punch.punchedAt', 'ASC')
      .getMany();

    let open = false;
    let lastCheckIn: AttendancePunchEntity | null = null;
    for (const punch of punches) {
      if (punch.punchType === PunchType.CHECK_IN) {
        open = true;
        lastCheckIn = punch;
      } else {
        open = false;
        lastCheckIn = null;
      }
    }
    return open ? lastCheckIn : null;
  }

  private async upsertDaySummary(input: {
    tenantId: string;
    workerId: string;
    workDate: string;
    status: AttendanceDayStatus;
    firstIn: Date | null;
    lastOut: Date | null;
  }): Promise<AttendanceDaySummaryEntity> {
    let summary = await this.daySummaryRepository.findOne({
      where: {
        tenantId: input.tenantId,
        workerId: input.workerId,
        workDate: input.workDate,
      },
    });

    if (!summary) {
      summary = this.daySummaryRepository.create(input);
    } else {
      summary.status = input.status;
      summary.firstIn = input.firstIn;
      summary.lastOut = input.lastOut;
    }

    return this.daySummaryRepository.save(summary);
  }

  private async assertCanApproveForWorker(
    actorUserId: string,
    workerId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    if (isPeopleOpsOrAdmin(auth)) {
      return;
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );
    if (!actingWorkerId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to approve punch corrections',
      });
    }

    const worker = await this.getWorkerOrThrow(workerId, tenantId);
    if (worker.managerId === actingWorkerId) {
      return;
    }

    if (worker.managerId) {
      const now = new Date();
      const delegation = await this.delegationRepository.findOne({
        where: {
          tenantId,
          delegatorWorkerId: worker.managerId,
          delegateWorkerId: actingWorkerId,
          scope: In([DelegationScope.APPROVALS, DelegationScope.ALL]),
        },
      });

      if (
        delegation &&
        delegation.effectiveFrom <= now &&
        delegation.effectiveTo >= now
      ) {
        return;
      }
    }

    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to approve punch corrections',
    });
  }

  /**
   * System query for the daily check-in nudge cron — active workers with
   * no attendance summary (or a MISSING one) for `workDate`, excluding
   * anyone on approved leave that day. No RBAC: internal job context only.
   */
  async listWorkersMissingCheckIn(
    workDate: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<WorkerEntity[]> {
    return this.workerRepository
      .createQueryBuilder('worker')
      .where('worker.tenantId = :tenantId', { tenantId })
      .andWhere('worker.status = :status', { status: WorkerStatus.ACTIVE })
      .andWhere('worker.userId IS NOT NULL')
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM attendance_day_summaries ads
          WHERE ads."tenantId" = worker."tenantId"
            AND ads."workerId" = worker.id
            AND ads."workDate" = :workDate
            AND ads."status" IN (:...activeStatuses)
        )`,
        {
          workDate,
          activeStatuses: [
            AttendanceDayStatus.IN,
            AttendanceDayStatus.OUT,
            AttendanceDayStatus.ON_LEAVE,
            AttendanceDayStatus.INCOMPLETE,
          ],
        },
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM leave_requests lr
          WHERE lr."tenantId" = worker."tenantId"
            AND lr."workerId" = worker.id
            AND lr."status" = :approvedStatus
            AND lr."startDate" <= :workDate
            AND lr."endDate" >= :workDate
        )`,
        { approvedStatus: LeaveRequestStatus.APPROVED },
      )
      .getMany();
  }

  private async requireActingWorker(
    userId: string,
    tenantId: string,
  ): Promise<WorkerEntity> {
    const worker = await this.workerRepository.findOne({
      where: { tenantId, userId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'No worker profile linked to the current user',
      });
    }
    return worker;
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

  private async getCorrectionOrThrow(
    id: string,
    tenantId: string,
  ): Promise<PunchCorrectionRequestEntity> {
    const correction = await this.correctionRepository.findOne({
      where: { id, tenantId },
    });
    if (!correction) {
      throw new NotFoundException({
        code: 'PUNCH_CORRECTION_NOT_FOUND',
        message: 'Punch correction request not found',
      });
    }
    return correction;
  }
}
