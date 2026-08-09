import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { HolidayEntity } from '@/modules/country-config/entities/holiday.entity';
import { LeaveTypeEntity } from '@/modules/country-config/entities/leave-type.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CalendarService } from '../calendar.service';
import { AttendanceDaySummaryEntity } from '../entities/attendance-day-summary.entity';
import { AttendancePunchEntity } from '../entities/attendance-punch.entity';
import { LeaveRequestEntity } from '../entities/leave-request.entity';
import { AttendanceDayStatus } from '../enums/attendance.enum';
import { LeaveRequestStatus } from '../enums/leave.enum';

function createQbMock(rows: unknown[]) {
  const qb: Record<string, jest.Mock> = {
    innerJoinAndSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
  Object.keys(qb).forEach((key) => {
    if (key !== 'getMany') {
      qb[key].mockReturnValue(qb);
    }
  });
  return qb;
}

describe('CalendarService', () => {
  let service: CalendarService;
  let leaveRequestRepository: { createQueryBuilder: jest.Mock };
  let leaveTypeRepository: { find: jest.Mock };
  let holidayRepository: { createQueryBuilder: jest.Mock };
  let daySummaryRepository: { createQueryBuilder: jest.Mock };
  let punchRepository: { createQueryBuilder: jest.Mock };
  let workerRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let rbacService: { getAuthContext: jest.Mock };

  const workerId = 'w0000000-0000-4000-8000-000000000001';
  const otherWorkerId = 'w0000000-0000-4000-8000-000000000099';
  const userId = 'u0000000-0000-4000-8000-000000000001';
  const otherUserId = 'u0000000-0000-4000-8000-000000000099';
  const managerId = 'w0000000-0000-4000-8000-000000000002';
  const managerUserId = 'u0000000-0000-4000-8000-000000000002';

  const worker = {
    id: workerId,
    userId,
    tenantId: DIGITARO_TENANT_ID,
    managerId,
    divisionId: null,
    countryCode: 'PK',
    timezone: 'UTC',
    firstName: 'Ada',
    lastName: 'Employee',
  } as WorkerEntity;

  const otherWorker = {
    id: otherWorkerId,
    userId: otherUserId,
    tenantId: DIGITARO_TENANT_ID,
    managerId: null,
    divisionId: null,
    countryCode: 'PK',
    timezone: 'UTC',
    firstName: 'Other',
    lastName: 'Person',
  } as WorkerEntity;

  beforeEach(async () => {
    leaveRequestRepository = { createQueryBuilder: jest.fn() };
    leaveTypeRepository = { find: jest.fn().mockResolvedValue([]) };
    holidayRepository = { createQueryBuilder: jest.fn() };
    daySummaryRepository = { createQueryBuilder: jest.fn() };
    punchRepository = { createQueryBuilder: jest.fn() };
    workerRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    rbacService = {
      getAuthContext: jest.fn().mockResolvedValue({
        tenantId: DIGITARO_TENANT_ID,
        userId,
        roleCodes: [PolarisRoleCode.EMPLOYEE],
        assignments: [
          {
            roleId: 'role-1',
            roleCode: PolarisRoleCode.EMPLOYEE,
            scopeType: ScopeType.OWN,
            scopeId: null,
          },
        ],
        broadestScope: ScopeType.OWN,
      }),
    };

    workerRepository.findOne.mockImplementation(async ({ where }) => {
      if (where?.userId === userId || where?.id === workerId) {
        return worker;
      }
      if (where?.userId === otherUserId || where?.id === otherWorkerId) {
        return otherWorker;
      }
      if (where?.userId === managerUserId || where?.id === managerId) {
        return {
          id: managerId,
          userId: managerUserId,
          tenantId: DIGITARO_TENANT_ID,
          managerId: null,
          divisionId: null,
          countryCode: 'PK',
          timezone: 'UTC',
          firstName: 'Mgr',
          lastName: 'One',
        } as WorkerEntity;
      }
      return null;
    });

    holidayRepository.createQueryBuilder.mockReturnValue(createQbMock([]));
    leaveRequestRepository.createQueryBuilder.mockReturnValue(createQbMock([]));
    daySummaryRepository.createQueryBuilder.mockReturnValue(createQbMock([]));
    punchRepository.createQueryBuilder.mockReturnValue(createQbMock([]));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        {
          provide: getRepositoryToken(LeaveRequestEntity),
          useValue: leaveRequestRepository,
        },
        {
          provide: getRepositoryToken(LeaveTypeEntity),
          useValue: leaveTypeRepository,
        },
        {
          provide: getRepositoryToken(HolidayEntity),
          useValue: holidayRepository,
        },
        {
          provide: getRepositoryToken(AttendanceDaySummaryEntity),
          useValue: daySummaryRepository,
        },
        {
          provide: getRepositoryToken(AttendancePunchEntity),
          useValue: punchRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: RbacService, useValue: rbacService },
      ],
    }).compile();

    service = module.get(CalendarService);
  });

  it('getMyCalendar defaults to current week when from/to omitted', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));

    const result = await service.getMyCalendar({}, userId);

    expect(result.from).toBe('2026-08-03');
    expect(result.to).toBe('2026-08-09');
    expect(result.days).toHaveLength(7);

    jest.useRealTimers();
  });

  it('getStaffCalendar forbids employee viewing another worker', async () => {
    await expect(
      service.getStaffCalendar(otherWorkerId, {}, userId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('marks holiday days as holiday in cells', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));

    holidayRepository.createQueryBuilder.mockReturnValue(
      createQbMock([
        {
          id: 'h-1',
          name: 'Independence Day',
          holidayDate: '2026-08-05',
          isCompanyClosure: false,
          calendar: { countryCode: 'PK', isActive: true },
        },
      ]),
    );

    const result = await service.getMyCalendar(
      { from: '2026-08-03', to: '2026-08-09' },
      userId,
    );

    const day = result.days.find((d) => d.date === '2026-08-05');
    expect(day?.status).toBe('holiday');
    expect(day?.holidayName).toBe('Independence Day');

    jest.useRealTimers();
  });

  it('getTeamCalendar returns only direct reports for manager (plus self)', async () => {
    rbacService.getAuthContext.mockResolvedValue({
      tenantId: DIGITARO_TENANT_ID,
      userId: managerUserId,
      roleCodes: [PolarisRoleCode.MANAGER],
      assignments: [
        {
          roleId: 'role-m',
          roleCode: PolarisRoleCode.MANAGER,
          scopeType: ScopeType.TEAM,
          scopeId: null,
        },
      ],
      broadestScope: ScopeType.TEAM,
    });

    workerRepository.find.mockResolvedValue([worker]);

    daySummaryRepository.createQueryBuilder.mockReturnValue(
      createQbMock([
        {
          workerId,
          workDate: '2026-08-04',
          status: AttendanceDayStatus.OUT,
          firstIn: new Date('2026-08-04T09:00:00.000Z'),
          lastOut: new Date('2026-08-04T17:00:00.000Z'),
        },
      ]),
    );

    const result = await service.getTeamCalendar(
      { from: '2026-08-03', to: '2026-08-09' },
      managerUserId,
    );

    expect(result.workers.map((w) => w.workerId).sort()).toEqual(
      [managerId, workerId].sort(),
    );

    const report = result.workers.find((w) => w.workerId === workerId);
    const cell = report?.cells.find((c) => c.date === '2026-08-04');
    expect(cell?.status).toBe('out');
  });

  it('attaches punches and workedMinutes to staff calendar days', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));

    punchRepository.createQueryBuilder.mockReturnValue(
      createQbMock([
        {
          id: 'punch-in',
          workerId,
          punchType: 'check_in',
          punchedAt: new Date('2026-08-04T09:00:00.000Z'),
        },
        {
          id: 'punch-out',
          workerId,
          punchType: 'check_out',
          punchedAt: new Date('2026-08-04T17:00:00.000Z'),
        },
      ]),
    );

    const result = await service.getMyCalendar(
      { from: '2026-08-03', to: '2026-08-09' },
      userId,
    );

    const day = result.days.find((d) => d.date === '2026-08-04');
    expect(day?.punches).toEqual([
      {
        id: 'punch-in',
        punchType: 'check_in',
        punchedAt: '2026-08-04T09:00:00.000Z',
      },
      {
        id: 'punch-out',
        punchType: 'check_out',
        punchedAt: '2026-08-04T17:00:00.000Z',
      },
    ]);
    expect(day?.workedMinutes).toBe(480);
    expect(result.days.every((d) => Array.isArray(d.punches))).toBe(true);

    jest.useRealTimers();
  });
});
