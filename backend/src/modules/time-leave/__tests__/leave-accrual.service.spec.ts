import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { AuditLogEntity } from '@/modules/compliance/entities/audit-log.entity';
import { LeaveAccrualMethod } from '@/modules/country-config/enums/setup-wizard.enum';
import { LeaveTypeEntity } from '@/modules/country-config/entities/leave-type.entity';
import { EmploymentTypeCountryConfigEntity } from '@/modules/country-config/entities/employment-type-country-config.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { WorkerStatus } from '@/modules/core-hr/enums/worker.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeaveBalanceEntity } from '../entities/leave-balance.entity';
import { ACCRUAL_CREDIT_ACTION } from '../leave-accrual.calculator';
import { LeaveAccrualService } from '../leave-accrual.service';

describe('LeaveAccrualService', () => {
  let service: LeaveAccrualService;
  let workerRepository: { find: jest.Mock };
  let leaveTypeRepository: { find: jest.Mock };
  let leaveBalanceRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let matrixRepository: { find: jest.Mock };
  let auditLogRepository: {
    createQueryBuilder: jest.Mock;
  };
  let auditLogService: { append: jest.Mock };
  let auditCount: number;

  const workerId = 'w0000000-0000-4000-8000-000000000001';
  const leaveTypeId = 'lt000000-0000-4000-8000-000000000001';
  const employmentTypeId = 'et000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    auditCount = 0;

    workerRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: workerId,
          tenantId: DIGITARO_TENANT_ID,
          employmentTypeId,
          countryCode: 'PK',
          status: WorkerStatus.ACTIVE,
          startDate: '2026-01-01',
          fteFraction: '1.00',
        } as WorkerEntity,
      ]),
    };

    leaveTypeRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: leaveTypeId,
          tenantId: DIGITARO_TENANT_ID,
          countryCode: 'PK',
          code: 'ANNUAL',
          name: 'Annual leave',
          accrualMethod: LeaveAccrualMethod.ANNUAL,
          daysPerYear: '20.00',
          carryForwardCap: '5.00',
        } as LeaveTypeEntity,
      ]),
    };

    leaveBalanceRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: entity.id ?? 'bal-1',
      })),
    };

    matrixRepository = {
      find: jest.fn().mockResolvedValue([
        {
          tenantId: DIGITARO_TENANT_ID,
          employmentTypeId,
          countryCode: 'PK',
          leaveEnabled: true,
          configJson: {},
        } as EmploymentTypeCountryConfigEntity,
      ]),
    };

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockImplementation(async () => auditCount),
    };
    auditLogRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    auditLogService = {
      append: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveAccrualService,
        { provide: getRepositoryToken(WorkerEntity), useValue: workerRepository },
        {
          provide: getRepositoryToken(LeaveTypeEntity),
          useValue: leaveTypeRepository,
        },
        {
          provide: getRepositoryToken(LeaveBalanceEntity),
          useValue: leaveBalanceRepository,
        },
        {
          provide: getRepositoryToken(EmploymentTypeCountryConfigEntity),
          useValue: matrixRepository,
        },
        {
          provide: getRepositoryToken(AuditLogEntity),
          useValue: auditLogRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(LeaveAccrualService);
  });

  it('credits annual entitlement and writes leave.accrual.credit audit', async () => {
    const result = await service.runMonthlyAccrual(
      new Date('2026-03-01T00:00:00.000Z'),
    );

    expect(result.credited).toBe(1);
    expect(leaveBalanceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        workerId,
        leaveTypeId,
        year: 2026,
        entitled: '20.00',
      }),
    );
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: ACCRUAL_CREDIT_ACTION,
        changes: expect.objectContaining({
          periodKey: { old: null, new: '2026' },
          creditDays: { old: null, new: 20 },
        }),
      }),
    );
  });

  it('is idempotent when accrual audit already exists for the period', async () => {
    auditCount = 1;

    const result = await service.runMonthlyAccrual(
      new Date('2026-03-01T00:00:00.000Z'),
    );

    expect(result.credited).toBe(0);
    expect(leaveBalanceRepository.save).not.toHaveBeenCalled();
    expect(auditLogService.append).not.toHaveBeenCalled();
  });

  it('skips workers when employment-type country config disables leave', async () => {
    matrixRepository.find.mockResolvedValue([
      {
        tenantId: DIGITARO_TENANT_ID,
        employmentTypeId,
        countryCode: 'PK',
        leaveEnabled: false,
        configJson: {},
      },
    ]);

    const result = await service.runMonthlyAccrual(
      new Date('2026-03-01T00:00:00.000Z'),
    );

    expect(result.credited).toBe(0);
    expect(leaveBalanceRepository.save).not.toHaveBeenCalled();
  });

  it('credits monthly accrual for monthly leave types', async () => {
    leaveTypeRepository.find.mockResolvedValue([
      {
        id: leaveTypeId,
        tenantId: DIGITARO_TENANT_ID,
        countryCode: 'PK',
        code: 'ANNUAL',
        name: 'Annual leave',
        accrualMethod: LeaveAccrualMethod.MONTHLY,
        daysPerYear: '24.00',
        carryForwardCap: '0.00',
      } as LeaveTypeEntity,
    ]);

    const result = await service.runMonthlyAccrual(
      new Date('2026-03-01T00:00:00.000Z'),
    );

    expect(result.credited).toBe(1);
    expect(leaveBalanceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ entitled: '2.00' }),
    );
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: expect.objectContaining({
          periodKey: { old: null, new: '2026-03' },
        }),
      }),
    );
  });

  it('applies carry-forward from prior year unused up to cap', async () => {
    leaveBalanceRepository.findOne.mockImplementation(async ({ where }) => {
      if (where?.year === 2025) {
        return {
          id: 'bal-prior',
          tenantId: DIGITARO_TENANT_ID,
          workerId,
          leaveTypeId,
          year: 2025,
          entitled: '20.00',
          used: '12.00',
          pending: '0.00',
        };
      }
      return null;
    });

    const result = await service.runMonthlyAccrual(
      new Date('2026-01-01T00:00:00.000Z'),
    );

    // carry-forward (5) + annual credit (20)
    expect(result.credited).toBe(2);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'leave.accrual.carryforward',
        changes: expect.objectContaining({
          periodKey: { old: null, new: '2026-carryforward' },
          creditDays: { old: null, new: 5 },
        }),
      }),
    );
  });
});
