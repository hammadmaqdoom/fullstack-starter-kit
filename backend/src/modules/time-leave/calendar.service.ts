import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { RbacService } from '@/modules/compliance/rbac.service';
import { HolidayEntity } from '@/modules/country-config/entities/holiday.entity';
import { LeaveTypeEntity } from '@/modules/country-config/entities/leave-type.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { resolveCellStatus } from './calendar-cell.util';
import {
  computeWorkedMinutes,
  groupPunchesByWorkerAndDate,
  type PunchLike,
} from './calendar-punch.util';
import {
  assertCalendarRangeSpan,
  enumerateDates,
  resolveCalendarRange,
} from './calendar-range.util';
import type { CalendarDayCell, CalendarDayPunch } from './calendar.types';
import { QueryCalendarRangeDto } from './dto/calendar.dto';
import { AttendanceDaySummaryEntity } from './entities/attendance-day-summary.entity';
import { AttendancePunchEntity } from './entities/attendance-punch.entity';
import { LeaveRequestEntity } from './entities/leave-request.entity';
import { LeaveRequestStatus } from './enums/leave.enum';
import {
  assertWorkerRecordAccess,
  isPeopleOpsOrAdmin,
  workDateInTimezone,
} from './time-leave-scope.util';

export type StaffCalendarPayload = {
  from: string;
  to: string;
  timezone: string;
  days: CalendarDayCell[];
  leave: Array<{
    leaveRequestId: string;
    leaveTypeId: string;
    leaveTypeName?: string | null;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  holidays: Array<{
    id: string;
    name: string;
    holidayDate: string;
    countryCode: string;
    isCompanyClosure: boolean;
  }>;
};

export type TeamCalendarPayload = {
  from: string;
  to: string;
  days: Array<{
    date: string;
    isHoliday: boolean;
    holidayName?: string | null;
  }>;
  workers: Array<{
    workerId: string;
    workerName: string;
    timezone: string;
    cells: CalendarDayCell[];
  }>;
};

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(LeaveRequestEntity)
    private readonly leaveRequestRepository: Repository<LeaveRequestEntity>,
    @InjectRepository(LeaveTypeEntity)
    private readonly leaveTypeRepository: Repository<LeaveTypeEntity>,
    @InjectRepository(HolidayEntity)
    private readonly holidayRepository: Repository<HolidayEntity>,
    @InjectRepository(AttendanceDaySummaryEntity)
    private readonly daySummaryRepository: Repository<AttendanceDaySummaryEntity>,
    @InjectRepository(AttendancePunchEntity)
    private readonly punchRepository: Repository<AttendancePunchEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly rbacService: RbacService,
  ) {}

  async getMyCalendar(
    query: QueryCalendarRangeDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<StaffCalendarPayload> {
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );
    if (!actingWorkerId) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'No worker profile linked to the current user',
      });
    }
    return this.buildStaffCalendar(actingWorkerId, query, actorUserId, tenantId);
  }

  async getStaffCalendar(
    workerId: string,
    query: QueryCalendarRangeDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<StaffCalendarPayload> {
    return this.buildStaffCalendar(workerId, query, actorUserId, tenantId);
  }

  async getTeamCalendar(
    query: QueryCalendarRangeDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<TeamCalendarPayload> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );

    const actingWorker = actingWorkerId
      ? await this.workerRepository.findOne({
          where: { id: actingWorkerId, tenantId },
        })
      : null;
    const timeZone = actingWorker?.timezone?.trim() || 'UTC';
    const range = resolveCalendarRange(
      query.from,
      query.to,
      new Date(),
      timeZone,
    );
    assertCalendarRangeSpan(range.from, range.to);

    const workers = await this.resolveTeamWorkers(
      auth,
      actingWorkerId,
      query.divisionId,
      tenantId,
    );

    if (workers.length === 0) {
      return {
        from: range.from,
        to: range.to,
        days: enumerateDates(range.from, range.to).map((date) => ({
          date,
          isHoliday: false,
        })),
        workers: [],
      };
    }

    const workerIds = workers.map((w) => w.id);
    const countryCodes = [
      ...new Set(workers.map((w) => w.countryCode).filter(Boolean)),
    ];

    const [holidays, leaveRows, summaries, punches] = await Promise.all([
      this.loadHolidays(tenantId, range.from, range.to, countryCodes),
      this.loadLeaveForWorkers(tenantId, workerIds, range.from, range.to),
      this.loadSummaries(tenantId, workerIds, range.from, range.to),
      this.loadPunches(tenantId, workerIds, range.from, range.to),
    ]);

    const leaveTypeIds = [...new Set(leaveRows.map((r) => r.leaveTypeId))];
    const leaveTypes =
      leaveTypeIds.length > 0
        ? await this.leaveTypeRepository.find({
            where: { id: In(leaveTypeIds), tenantId },
          })
        : [];
    const leaveTypeNameById = new Map(
      leaveTypes.map((lt) => [lt.id, lt.name] as const),
    );

    const timezoneByWorkerId = new Map(
      workers.map((w) => [w.id, w.timezone?.trim() || 'UTC'] as const),
    );
    const punchesByWorkerDate = groupPunchesByWorkerAndDate(
      punches,
      timezoneByWorkerId,
    );

    const dates = enumerateDates(range.from, range.to);
    const holidayByCountryDate = new Map<string, HolidayEntity>();
    for (const h of holidays) {
      const cc = h.calendar?.countryCode ?? '';
      holidayByCountryDate.set(`${cc}:${h.holidayDate}`, h);
    }

    const days = dates.map((date) => {
      const match = holidays.find((h) => h.holidayDate === date);
      return {
        date,
        isHoliday: Boolean(match),
        holidayName: match?.name ?? null,
      };
    });

    return {
      from: range.from,
      to: range.to,
      days,
      workers: workers.map((worker) => {
        const tz = worker.timezone?.trim() || 'UTC';
        const today = workDateInTimezone(new Date(), tz);
        const workerLeave = leaveRows.filter((r) => r.workerId === worker.id);
        const workerSummaries = summaries.filter(
          (s) => s.workerId === worker.id,
        );
        const summaryByDate = new Map(
          workerSummaries.map((s) => [s.workDate, s] as const),
        );

        const cells: CalendarDayCell[] = dates.map((date) => {
          const holiday =
            holidayByCountryDate.get(`${worker.countryCode}:${date}`) ?? null;
          const approvedLeave = workerLeave.find(
            (r) =>
              r.status === LeaveRequestStatus.APPROVED &&
              r.startDate <= date &&
              r.endDate >= date,
          );
          const summary = summaryByDate.get(date) ?? null;
          const status = resolveCellStatus({
            date,
            today,
            isHoliday: Boolean(holiday),
            hasApprovedLeave: Boolean(approvedLeave),
            attendanceStatus: summary?.status ?? null,
          });

          return {
            date,
            status,
            leaveTypeName: approvedLeave
              ? (leaveTypeNameById.get(approvedLeave.leaveTypeId) ?? null)
              : null,
            holidayName: holiday?.name ?? null,
            firstIn: summary?.firstIn?.toISOString() ?? null,
            lastOut: summary?.lastOut?.toISOString() ?? null,
            ...this.dayPunchFields(worker.id, date, punchesByWorkerDate),
          };
        });

        return {
          workerId: worker.id,
          workerName: `${worker.firstName} ${worker.lastName}`.trim(),
          timezone: tz,
          cells,
        };
      }),
    };
  }

  private async buildStaffCalendar(
    workerId: string,
    query: QueryCalendarRangeDto,
    actorUserId: string,
    tenantId: string,
  ): Promise<StaffCalendarPayload> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
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
    assertWorkerRecordAccess(auth, actingWorkerId, worker);

    const timeZone = worker.timezone?.trim() || 'UTC';
    const range = resolveCalendarRange(
      query.from,
      query.to,
      new Date(),
      timeZone,
    );
    assertCalendarRangeSpan(range.from, range.to);
    const today = workDateInTimezone(new Date(), timeZone);

    const [holidays, leaveRows, summaries, punches] = await Promise.all([
      this.loadHolidays(tenantId, range.from, range.to, [worker.countryCode]),
      this.loadLeaveForWorkers(tenantId, [workerId], range.from, range.to),
      this.loadSummaries(tenantId, [workerId], range.from, range.to),
      this.loadPunches(tenantId, [workerId], range.from, range.to),
    ]);

    const leaveTypeIds = [...new Set(leaveRows.map((r) => r.leaveTypeId))];
    const leaveTypes =
      leaveTypeIds.length > 0
        ? await this.leaveTypeRepository.find({
            where: { id: In(leaveTypeIds), tenantId },
          })
        : [];
    const leaveTypeNameById = new Map(
      leaveTypes.map((lt) => [lt.id, lt.name] as const),
    );

    const holidayByDate = new Map(
      holidays.map((h) => [h.holidayDate, h] as const),
    );
    const summaryByDate = new Map(
      summaries.map((s) => [s.workDate, s] as const),
    );
    const punchesByWorkerDate = groupPunchesByWorkerAndDate(
      punches,
      new Map([[workerId, timeZone]]),
    );

    const days: CalendarDayCell[] = enumerateDates(range.from, range.to).map(
      (date) => {
        const holiday = holidayByDate.get(date) ?? null;
        const approvedLeave = leaveRows.find(
          (r) =>
            r.status === LeaveRequestStatus.APPROVED &&
            r.startDate <= date &&
            r.endDate >= date,
        );
        const summary = summaryByDate.get(date) ?? null;
        const status = resolveCellStatus({
          date,
          today,
          isHoliday: Boolean(holiday),
          hasApprovedLeave: Boolean(approvedLeave),
          attendanceStatus: summary?.status ?? null,
        });

        return {
          date,
          status,
          leaveTypeName: approvedLeave
            ? (leaveTypeNameById.get(approvedLeave.leaveTypeId) ?? null)
            : null,
          holidayName: holiday?.name ?? null,
          firstIn: summary?.firstIn?.toISOString() ?? null,
          lastOut: summary?.lastOut?.toISOString() ?? null,
          ...this.dayPunchFields(workerId, date, punchesByWorkerDate),
        };
      },
    );

    return {
      from: range.from,
      to: range.to,
      timezone: timeZone,
      days,
      leave: leaveRows.map((row) => ({
        leaveRequestId: row.id,
        leaveTypeId: row.leaveTypeId,
        leaveTypeName: leaveTypeNameById.get(row.leaveTypeId) ?? null,
        startDate: row.startDate,
        endDate: row.endDate,
        status: row.status,
      })),
      holidays: holidays.map((h) => ({
        id: h.id,
        name: h.name,
        holidayDate: h.holidayDate,
        countryCode: h.calendar?.countryCode ?? worker.countryCode,
        isCompanyClosure: h.isCompanyClosure,
      })),
    };
  }

  private async resolveTeamWorkers(
    auth: Awaited<ReturnType<RbacService['getAuthContext']>>,
    actingWorkerId: string | null,
    divisionId: string | undefined,
    tenantId: string,
  ): Promise<WorkerEntity[]> {
    if (isPeopleOpsOrAdmin(auth)) {
      const where: {
        tenantId: string;
        divisionId?: string;
      } = { tenantId };
      if (divisionId) {
        where.divisionId = divisionId;
      }
      return this.workerRepository.find({
        where,
        order: { firstName: 'ASC', lastName: 'ASC' },
      });
    }

    if (!actingWorkerId) {
      return [];
    }

    const reports = await this.workerRepository.find({
      where: {
        tenantId,
        managerId: actingWorkerId,
        ...(divisionId ? { divisionId } : {}),
      },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });

    const self = await this.workerRepository.findOne({
      where: { id: actingWorkerId, tenantId },
    });
    if (self && !reports.some((r) => r.id === self.id)) {
      return [self, ...reports];
    }
    return reports;
  }

  private async loadHolidays(
    tenantId: string,
    from: string,
    to: string,
    countryCodes: string[],
  ): Promise<HolidayEntity[]> {
    if (countryCodes.length === 0) {
      return [];
    }
    const qb = this.holidayRepository
      .createQueryBuilder('holiday')
      .innerJoinAndSelect('holiday.calendar', 'calendar')
      .where('holiday.tenantId = :tenantId', { tenantId })
      .andWhere('holiday.holidayDate BETWEEN :from AND :to', { from, to })
      .andWhere('calendar.isActive = true')
      .andWhere('calendar.countryCode IN (:...countryCodes)', { countryCodes });
    return qb.getMany();
  }

  private async loadLeaveForWorkers(
    tenantId: string,
    workerIds: string[],
    from: string,
    to: string,
  ): Promise<LeaveRequestEntity[]> {
    if (workerIds.length === 0) {
      return [];
    }
    return this.leaveRequestRepository
      .createQueryBuilder('request')
      .where('request.tenantId = :tenantId', { tenantId })
      .andWhere('request.workerId IN (:...workerIds)', { workerIds })
      .andWhere('request.status IN (:...statuses)', {
        statuses: [LeaveRequestStatus.APPROVED, LeaveRequestStatus.SUBMITTED],
      })
      .andWhere('request.startDate <= :to', { to })
      .andWhere('request.endDate >= :from', { from })
      .orderBy('request.startDate', 'ASC')
      .getMany();
  }

  private dayPunchFields(
    workerId: string,
    date: string,
    grouped: Map<string, PunchLike[]>,
  ): { punches: CalendarDayPunch[]; workedMinutes: number } {
    const list = grouped.get(`${workerId}:${date}`) ?? [];
    return {
      punches: list.map((p) => ({
        id: p.id,
        punchType: p.punchType as 'check_in' | 'check_out',
        punchedAt: p.punchedAt.toISOString(),
      })),
      workedMinutes: computeWorkedMinutes(list),
    };
  }

  private async loadPunches(
    tenantId: string,
    workerIds: string[],
    from: string,
    to: string,
  ): Promise<AttendancePunchEntity[]> {
    if (workerIds.length === 0) {
      return [];
    }
    const fromAt = new Date(`${from}T00:00:00.000Z`);
    const toExclusive = new Date(`${to}T00:00:00.000Z`);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    // Widen by ±1 day so timezone shifts near range edges still load.
    fromAt.setUTCDate(fromAt.getUTCDate() - 1);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

    return this.punchRepository
      .createQueryBuilder('punch')
      .where('punch.tenantId = :tenantId', { tenantId })
      .andWhere('punch.workerId IN (:...workerIds)', { workerIds })
      .andWhere('punch.punchedAt >= :fromAt', { fromAt })
      .andWhere('punch.punchedAt < :toExclusive', { toExclusive })
      .orderBy('punch.punchedAt', 'ASC')
      .getMany();
  }

  private async loadSummaries(
    tenantId: string,
    workerIds: string[],
    from: string,
    to: string,
  ): Promise<AttendanceDaySummaryEntity[]> {
    if (workerIds.length === 0) {
      return [];
    }
    return this.daySummaryRepository
      .createQueryBuilder('summary')
      .where('summary.tenantId = :tenantId', { tenantId })
      .andWhere('summary.workerId IN (:...workerIds)', { workerIds })
      .andWhere('summary.workDate BETWEEN :from AND :to', { from, to })
      .getMany();
  }
}
