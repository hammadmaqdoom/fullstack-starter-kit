import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { TeamsNotificationService } from '@/modules/automation/teams-notification.service';
import { CountryConfigService } from '@/modules/country-config/country-config.service';
import { HolidayEntity } from '@/modules/country-config/entities/holiday.entity';
import { LeaveTypeEntity } from '@/modules/country-config/entities/leave-type.entity';
import { ApprovalDelegationEntity } from '@/modules/core-hr/entities/approval-delegation.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { DelegationScope } from '@/modules/core-hr/enums/delegation.enum';
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
  CreateLeaveRequestDto,
  QueryLeaveRequestsDto,
  QueryStaffCalendarDto,
  QueryTeamCalendarDto,
} from './dto/leave.dto';
import { LeaveBalanceEntity } from './entities/leave-balance.entity';
import { LeaveRequestEntity } from './entities/leave-request.entity';
import { LeaveRequestStatus } from './enums/leave.enum';
import {
  assertWorkerRecordAccess,
  countInclusiveDays,
  decimalToNumber,
  isPeopleOpsOrAdmin,
  toDecimalString,
} from './time-leave-scope.util';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequestEntity)
    private readonly leaveRequestRepository: Repository<LeaveRequestEntity>,
    @InjectRepository(LeaveBalanceEntity)
    private readonly leaveBalanceRepository: Repository<LeaveBalanceEntity>,
    @InjectRepository(LeaveTypeEntity)
    private readonly leaveTypeRepository: Repository<LeaveTypeEntity>,
    @InjectRepository(HolidayEntity)
    private readonly holidayRepository: Repository<HolidayEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(ApprovalDelegationEntity)
    private readonly delegationRepository: Repository<ApprovalDelegationEntity>,
    private readonly countryConfigService: CountryConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly teamsNotificationService: TeamsNotificationService,
  ) {}

  async listTypes(
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<LeaveTypeEntity[]> {
    const worker = await this.findActingWorker(actorUserId, tenantId);
    const qb = this.leaveTypeRepository
      .createQueryBuilder('leaveType')
      .where('leaveType.tenantId = :tenantId', { tenantId })
      .orderBy('leaveType.name', 'ASC');

    if (worker) {
      qb.andWhere('leaveType.countryCode = :countryCode', {
        countryCode: worker.countryCode,
      });
    }

    return qb.getMany();
  }

  async listBalances(
    actorUserId: string,
    workerId?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<LeaveBalanceEntity[]> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );

    let targetWorkerId = workerId;
    if (!targetWorkerId) {
      if (!actingWorkerId) {
        return [];
      }
      targetWorkerId = actingWorkerId;
    } else {
      const target = await this.getWorkerOrThrow(targetWorkerId, tenantId);
      assertWorkerRecordAccess(auth, actingWorkerId, target);
    }

    const year = new Date().getUTCFullYear();
    return this.leaveBalanceRepository.find({
      where: { tenantId, workerId: targetWorkerId, year },
      relations: ['leaveType'],
      order: { leaveTypeId: 'ASC' },
    });
  }

  async createRequest(
    dto: CreateLeaveRequestDto,
    actor: ActorContext,
  ): Promise<LeaveRequestEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const worker = await this.requireActingWorker(actor.userId, tenantId);

    await this.assertLeaveEnabled(worker, tenantId);

    if (dto.endDate < dto.startDate) {
      throw new BadRequestException({
        code: 'INVALID_LEAVE_DATES',
        message: 'endDate must be on or after startDate',
      });
    }

    const leaveType = await this.leaveTypeRepository.findOne({
      where: { id: dto.leaveTypeId, tenantId },
    });
    if (!leaveType) {
      throw new NotFoundException({
        code: 'LEAVE_TYPE_NOT_FOUND',
        message: 'Leave type not found',
      });
    }

    if (leaveType.countryCode !== worker.countryCode) {
      throw new BadRequestException({
        code: 'LEAVE_TYPE_COUNTRY_MISMATCH',
        message: 'Leave type is not available for worker country',
      });
    }

    const days =
      dto.days ?? countInclusiveDays(dto.startDate, dto.endDate);
    if (days <= 0) {
      throw new BadRequestException({
        code: 'INVALID_LEAVE_DAYS',
        message: 'Leave days must be greater than zero',
      });
    }

    const status =
      dto.status === LeaveRequestStatus.DRAFT
        ? LeaveRequestStatus.DRAFT
        : LeaveRequestStatus.SUBMITTED;

    const year = Number.parseInt(dto.startDate.slice(0, 4), 10);
    const balance = await this.getOrCreateBalance(
      worker.id,
      dto.leaveTypeId,
      year,
      tenantId,
    );

    if (status === LeaveRequestStatus.SUBMITTED) {
      this.assertSufficientBalance(balance, days);
    }

    const managerId = await this.resolveManagerOrDelegate(
      worker.managerId,
      tenantId,
    );

    const saved = await this.leaveRequestRepository.save(
      this.leaveRequestRepository.create({
        tenantId,
        workerId: worker.id,
        leaveTypeId: dto.leaveTypeId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        days: toDecimalString(days),
        reason: dto.reason ?? null,
        status,
        approverId: null,
        managerId,
      }),
    );

    if (status === LeaveRequestStatus.SUBMITTED) {
      balance.pending = toDecimalString(
        decimalToNumber(balance.pending) + days,
      );
      await this.leaveBalanceRepository.save(balance);
    }

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'leave.request.create',
      entityType: 'leave_request',
      entityId: saved.id,
      changes: {
        status: { old: null, new: saved.status },
        leaveTypeId: { old: null, new: saved.leaveTypeId },
        startDate: { old: null, new: saved.startDate },
        endDate: { old: null, new: saved.endDate },
        days: { old: null, new: saved.days },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    if (status === LeaveRequestStatus.SUBMITTED && managerId) {
      const manager = await this.workerRepository.findOne({
        where: { id: managerId, tenantId },
      });
      if (manager?.userId) {
        await this.teamsNotificationService.enqueueLeaveApprovalPending({
          approverUserId: manager.userId,
          workerName: `${worker.firstName} ${worker.lastName}`.trim(),
          leaveTypeName: leaveType.name,
          startDate: saved.startDate,
          endDate: saved.endDate,
          leaveRequestId: saved.id,
          tenantId,
        });
      }
    }

    return saved;
  }

  async listRequests(
    query: QueryLeaveRequestsDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<LeaveRequestEntity>> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.leaveRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.leaveType', 'leaveType')
      .leftJoinAndSelect('request.worker', 'worker')
      .where('request.tenantId = :tenantId', { tenantId })
      .orderBy('request.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.workerId) {
      const target = await this.getWorkerOrThrow(query.workerId, tenantId);
      assertWorkerRecordAccess(auth, actingWorkerId, target);
      qb.andWhere('request.workerId = :workerId', { workerId: query.workerId });
    } else if (!isPeopleOpsOrAdmin(auth)) {
      if (!actingWorkerId) {
        return { items: [], meta: { page, limit, totalItems: 0, totalPages: 0 } };
      }
      if (auth.roleCodes.includes(PolarisRoleCode.MANAGER)) {
        qb.andWhere(
          '(request.workerId = :actingWorkerId OR request.managerId = :actingWorkerId OR worker.managerId = :actingWorkerId)',
          { actingWorkerId },
        );
      } else {
        qb.andWhere('request.workerId = :actingWorkerId', { actingWorkerId });
      }
    }

    if (query.status) {
      qb.andWhere('request.status = :status', { status: query.status });
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

  async getRequest(
    id: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<LeaveRequestEntity> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );
    const request = await this.getRequestOrThrow(id, tenantId);
    const worker = await this.getWorkerOrThrow(request.workerId, tenantId);
    assertWorkerRecordAccess(auth, actingWorkerId, worker);
    return request;
  }

  async approveRequest(
    id: string,
    actor: ActorContext,
  ): Promise<LeaveRequestEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const request = await this.getRequestOrThrow(id, tenantId);
    await this.assertCanApproveLeave(actor.userId, request, tenantId);

    if (request.status !== LeaveRequestStatus.SUBMITTED) {
      throw new BadRequestException({
        code: 'INVALID_LEAVE_STATUS',
        message: 'Only submitted leave requests can be approved',
      });
    }

    const days = decimalToNumber(request.days);
    const year = Number.parseInt(request.startDate.slice(0, 4), 10);
    const balance = await this.getOrCreateBalance(
      request.workerId,
      request.leaveTypeId,
      year,
      tenantId,
    );

    const pending = Math.max(0, decimalToNumber(balance.pending) - days);
    const used = decimalToNumber(balance.used) + days;
    balance.pending = toDecimalString(pending);
    balance.used = toDecimalString(used);
    await this.leaveBalanceRepository.save(balance);

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actor.userId,
      tenantId,
    );

    request.status = LeaveRequestStatus.APPROVED;
    request.approverId = actingWorkerId ?? actor.userId;
    const saved = await this.leaveRequestRepository.save(request);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'leave.request.approve',
      entityType: 'leave_request',
      entityId: saved.id,
      changes: {
        status: {
          old: LeaveRequestStatus.SUBMITTED,
          new: LeaveRequestStatus.APPROVED,
        },
        used: { old: toDecimalString(used - days), new: balance.used },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async rejectRequest(
    id: string,
    reason: string,
    actor: ActorContext,
  ): Promise<LeaveRequestEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const request = await this.getRequestOrThrow(id, tenantId);
    await this.assertCanApproveLeave(actor.userId, request, tenantId);

    if (request.status !== LeaveRequestStatus.SUBMITTED) {
      throw new BadRequestException({
        code: 'INVALID_LEAVE_STATUS',
        message: 'Only submitted leave requests can be rejected',
      });
    }

    const days = decimalToNumber(request.days);
    const year = Number.parseInt(request.startDate.slice(0, 4), 10);
    const balance = await this.leaveBalanceRepository.findOne({
      where: {
        tenantId,
        workerId: request.workerId,
        leaveTypeId: request.leaveTypeId,
        year,
      },
    });
    if (balance) {
      balance.pending = toDecimalString(
        Math.max(0, decimalToNumber(balance.pending) - days),
      );
      await this.leaveBalanceRepository.save(balance);
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actor.userId,
      tenantId,
    );

    request.status = LeaveRequestStatus.REJECTED;
    request.approverId = actingWorkerId ?? actor.userId;
    request.reason = request.reason
      ? `${request.reason}\n[Reject] ${reason}`
      : `[Reject] ${reason}`;
    const saved = await this.leaveRequestRepository.save(request);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'leave.request.reject',
      entityType: 'leave_request',
      entityId: saved.id,
      changes: {
        status: {
          old: LeaveRequestStatus.SUBMITTED,
          new: LeaveRequestStatus.REJECTED,
        },
        reason: { old: null, new: reason },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async cancelRequest(
    id: string,
    actor: ActorContext,
  ): Promise<LeaveRequestEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const worker = await this.requireActingWorker(actor.userId, tenantId);
    const request = await this.getRequestOrThrow(id, tenantId);

    if (request.workerId !== worker.id && !(await this.isPrivileged(actor.userId, tenantId))) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the requester or People Ops can cancel this leave',
      });
    }

    if (
      ![LeaveRequestStatus.DRAFT, LeaveRequestStatus.SUBMITTED].includes(
        request.status,
      )
    ) {
      throw new BadRequestException({
        code: 'INVALID_LEAVE_STATUS',
        message: 'Only draft or submitted leave requests can be cancelled',
      });
    }

    if (request.status === LeaveRequestStatus.SUBMITTED) {
      const days = decimalToNumber(request.days);
      const year = Number.parseInt(request.startDate.slice(0, 4), 10);
      const balance = await this.leaveBalanceRepository.findOne({
        where: {
          tenantId,
          workerId: request.workerId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
      });
      if (balance) {
        balance.pending = toDecimalString(
          Math.max(0, decimalToNumber(balance.pending) - days),
        );
        await this.leaveBalanceRepository.save(balance);
      }
    }

    const previous = request.status;
    request.status = LeaveRequestStatus.CANCELLED;
    const saved = await this.leaveRequestRepository.save(request);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'leave.request.cancel',
      entityType: 'leave_request',
      entityId: saved.id,
      changes: {
        status: { old: previous, new: LeaveRequestStatus.CANCELLED },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async teamCalendar(
    query: QueryTeamCalendarDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<
    Array<{
      workerId: string;
      workerName: string;
      leaveRequestId: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      status: LeaveRequestStatus;
    }>
  > {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );

    const qb = this.leaveRequestRepository
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.worker', 'worker')
      .where('request.tenantId = :tenantId', { tenantId })
      .andWhere('request.status = :status', {
        status: LeaveRequestStatus.APPROVED,
      })
      .andWhere('request.startDate <= :to', { to: query.to })
      .andWhere('request.endDate >= :from', { from: query.from })
      .orderBy('request.startDate', 'ASC');

    if (query.divisionId) {
      qb.andWhere('worker.divisionId = :divisionId', {
        divisionId: query.divisionId,
      });
    }

    if (!isPeopleOpsOrAdmin(auth)) {
      if (!actingWorkerId) {
        return [];
      }
      qb.andWhere(
        '(worker.managerId = :actingWorkerId OR request.workerId = :actingWorkerId)',
        { actingWorkerId },
      );
    }

    const rows = await qb.getMany();
    return rows.map((row) => ({
      workerId: row.workerId,
      workerName: row.worker
        ? `${row.worker.firstName} ${row.worker.lastName}`
        : row.workerId,
      leaveRequestId: row.id,
      leaveTypeId: row.leaveTypeId,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
    }));
  }

  async staffCalendar(
    query: QueryStaffCalendarDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<{
    holidays: Array<{
      id: string;
      name: string;
      holidayDate: string;
      countryCode: string;
      isCompanyClosure: boolean;
    }>;
    leave: Array<{
      leaveRequestId: string;
      workerId: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      status: LeaveRequestStatus;
    }>;
  }> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );

    let workerId = query.workerId ?? actingWorkerId;
    let countryCode = query.countryCode;

    if (workerId) {
      const worker = await this.getWorkerOrThrow(workerId, tenantId);
      assertWorkerRecordAccess(auth, actingWorkerId, worker);
      countryCode = countryCode ?? worker.countryCode;
    }

    const holidayQb = this.holidayRepository
      .createQueryBuilder('holiday')
      .innerJoinAndSelect('holiday.calendar', 'calendar')
      .where('holiday.tenantId = :tenantId', { tenantId })
      .andWhere('holiday.holidayDate BETWEEN :from AND :to', {
        from: query.from,
        to: query.to,
      })
      .andWhere('calendar.isActive = true');

    if (countryCode) {
      holidayQb.andWhere('calendar.countryCode = :countryCode', { countryCode });
    }

    const holidays = await holidayQb.getMany();

    const leaveQb = this.leaveRequestRepository
      .createQueryBuilder('request')
      .where('request.tenantId = :tenantId', { tenantId })
      .andWhere('request.status IN (:...statuses)', {
        statuses: [LeaveRequestStatus.APPROVED, LeaveRequestStatus.SUBMITTED],
      })
      .andWhere('request.startDate <= :to', { to: query.to })
      .andWhere('request.endDate >= :from', { from: query.from });

    if (workerId) {
      leaveQb.andWhere('request.workerId = :workerId', { workerId });
    } else if (!isPeopleOpsOrAdmin(auth) && actingWorkerId) {
      leaveQb.andWhere('request.workerId = :workerId', {
        workerId: actingWorkerId,
      });
    }

    const leaveRows = await leaveQb.getMany();

    return {
      holidays: holidays.map((h) => ({
        id: h.id,
        name: h.name,
        holidayDate: h.holidayDate,
        countryCode: h.calendar?.countryCode ?? countryCode ?? '',
        isCompanyClosure: h.isCompanyClosure,
      })),
      leave: leaveRows.map((row) => ({
        leaveRequestId: row.id,
        workerId: row.workerId,
        leaveTypeId: row.leaveTypeId,
        startDate: row.startDate,
        endDate: row.endDate,
        status: row.status,
      })),
    };
  }

  private async assertLeaveEnabled(
    worker: WorkerEntity,
    tenantId: string,
  ): Promise<void> {
    const config =
      await this.countryConfigService.resolveEmploymentTypeCountryRules(
        worker.employmentTypeId,
        worker.countryCode,
        tenantId,
      );

    if (!config.leaveEnabled) {
      throw new BadRequestException({
        code: 'LEAVE_DISABLED',
        message: 'Leave is not enabled for this employment type and country',
      });
    }
  }

  private assertSufficientBalance(
    balance: LeaveBalanceEntity,
    days: number,
  ): void {
    const available =
      decimalToNumber(balance.entitled) -
      decimalToNumber(balance.used) -
      decimalToNumber(balance.pending);

    if (days > available) {
      throw new BadRequestException({
        code: 'LEAVE_INSUFFICIENT_BALANCE',
        message: `Insufficient leave balance. Available: ${available} days.`,
      });
    }
  }

  private async getOrCreateBalance(
    workerId: string,
    leaveTypeId: string,
    year: number,
    tenantId: string,
  ): Promise<LeaveBalanceEntity> {
    let balance = await this.leaveBalanceRepository.findOne({
      where: { tenantId, workerId, leaveTypeId, year },
    });

    if (!balance) {
      balance = await this.leaveBalanceRepository.save(
        this.leaveBalanceRepository.create({
          tenantId,
          workerId,
          leaveTypeId,
          year,
          entitled: '0.00',
          used: '0.00',
          pending: '0.00',
        }),
      );
    }

    return balance;
  }

  private async resolveManagerOrDelegate(
    managerId: string | null,
    tenantId: string,
  ): Promise<string | null> {
    if (!managerId) {
      return null;
    }

    const now = new Date();
    const delegation = await this.delegationRepository.findOne({
      where: [
        {
          tenantId,
          delegatorWorkerId: managerId,
          scope: DelegationScope.APPROVALS,
        },
        {
          tenantId,
          delegatorWorkerId: managerId,
          scope: DelegationScope.ALL,
        },
      ],
    });

    if (
      delegation &&
      delegation.effectiveFrom <= now &&
      delegation.effectiveTo >= now
    ) {
      return delegation.delegateWorkerId;
    }

    return managerId;
  }

  private async assertCanApproveLeave(
    actorUserId: string,
    request: LeaveRequestEntity,
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
        message: 'Insufficient permissions to approve leave',
      });
    }

    if (request.managerId === actingWorkerId) {
      return;
    }

    const worker = await this.getWorkerOrThrow(request.workerId, tenantId);
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
      message: 'Insufficient permissions to approve leave',
    });
  }

  private async isPrivileged(
    actorUserId: string,
    tenantId: string,
  ): Promise<boolean> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    return isPeopleOpsOrAdmin(auth);
  }

  private async findActingWorker(
    userId: string,
    tenantId: string,
  ): Promise<WorkerEntity | null> {
    return this.workerRepository.findOne({ where: { tenantId, userId } });
  }

  private async requireActingWorker(
    userId: string,
    tenantId: string,
  ): Promise<WorkerEntity> {
    const worker = await this.findActingWorker(userId, tenantId);
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

  private async getRequestOrThrow(
    id: string,
    tenantId: string,
  ): Promise<LeaveRequestEntity> {
    const request = await this.leaveRequestRepository.findOne({
      where: { id, tenantId },
      relations: ['leaveType', 'worker'],
    });
    if (!request) {
      throw new NotFoundException({
        code: 'LEAVE_REQUEST_NOT_FOUND',
        message: 'Leave request not found',
      });
    }
    return request;
  }
}
