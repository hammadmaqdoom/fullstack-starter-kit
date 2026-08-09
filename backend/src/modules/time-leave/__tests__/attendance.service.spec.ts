import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { RbacService } from '@/modules/compliance/rbac.service';
import { ApprovalDelegationEntity } from '@/modules/core-hr/entities/approval-delegation.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AttendanceService } from '../attendance.service';
import { AttendanceDaySummaryEntity } from '../entities/attendance-day-summary.entity';
import { AttendancePunchEntity } from '../entities/attendance-punch.entity';
import { PunchCorrectionRequestEntity } from '../entities/punch-correction-request.entity';
import {
  AttendanceDayStatus,
  PunchSource,
  PunchType,
} from '../enums/attendance.enum';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let punchRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let daySummaryRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let workerRepository: {
    findOne: jest.Mock;
  };
  let auditLogService: { append: jest.Mock };

  const workerId = 'w0000000-0000-4000-8000-000000000001';
  const userId = 'u0000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    punchRepository = {
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: 'punch-1',
        createdAt: new Date(),
      })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    daySummaryRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: 'summary-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    workerRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: workerId,
        userId,
        tenantId: DIGITARO_TENANT_ID,
        managerId: null,
        divisionId: null,
      } as WorkerEntity),
    };

    auditLogService = { append: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: getRepositoryToken(AttendancePunchEntity),
          useValue: punchRepository,
        },
        {
          provide: getRepositoryToken(AttendanceDaySummaryEntity),
          useValue: daySummaryRepository,
        },
        {
          provide: getRepositoryToken(PunchCorrectionRequestEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        {
          provide: getRepositoryToken(ApprovalDelegationEntity),
          useValue: {},
        },
        { provide: AuditLogService, useValue: auditLogService },
        {
          provide: RbacService,
          useValue: { getAuthContext: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AttendanceService);
  });

  it('checks in, writes day summary, and audits', async () => {
    const result = await service.checkIn(
      { source: PunchSource.WEB, timezone: 'UTC' },
      { userId, correlationId: 'corr-1' },
    );

    expect(result.punch.punchType).toBe(PunchType.CHECK_IN);
    expect(result.daySummary.status).toBe(AttendanceDayStatus.IN);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'attendance.punch.check_in',
        correlationId: 'corr-1',
      }),
    );
  });

  it('rejects second open check-in for the same day', async () => {
    daySummaryRepository.findOne.mockResolvedValue({
      id: 'summary-1',
      workerId,
      workDate: new Date().toISOString().slice(0, 10),
      status: AttendanceDayStatus.IN,
      firstIn: new Date(),
      lastOut: null,
    });

    punchRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'punch-open',
          punchType: PunchType.CHECK_IN,
          punchedAt: new Date(),
        },
      ]),
    });

    await expect(
      service.checkIn({ timezone: 'UTC' }, { userId }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('getToday uses client timezone so early-morning local dates match check-in', async () => {
    // 21:00 UTC Aug 9 == 02:00 Asia/Karachi Aug 10
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-09T21:00:00.000Z'));

    daySummaryRepository.findOne.mockImplementation(async ({ where }) => {
      if (where.workDate === '2026-08-10') {
        return {
          id: 'summary-karachi',
          workerId,
          workDate: '2026-08-10',
          status: AttendanceDayStatus.IN,
          firstIn: new Date('2026-08-09T20:00:00.000Z'),
          lastOut: null,
        };
      }
      return null;
    });

    punchRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'punch-1',
          punchType: PunchType.CHECK_IN,
          punchedAt: new Date('2026-08-09T20:00:00.000Z'),
        },
      ]),
    });

    const result = await service.getToday(
      userId,
      DIGITARO_TENANT_ID,
      'Asia/Karachi',
    );

    expect(result.workDate).toBe('2026-08-10');
    expect(result.daySummary?.status).toBe(AttendanceDayStatus.IN);
    expect(daySummaryRepository.findOne).toHaveBeenCalledWith({
      where: {
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        workDate: '2026-08-10',
      },
    });

    jest.useRealTimers();
  });
});
