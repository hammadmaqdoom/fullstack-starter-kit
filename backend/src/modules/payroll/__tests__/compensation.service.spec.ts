import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompensationService } from '../compensation.service';
import { CompensationRecordEntity } from '../entities/compensation-record.entity';
import { PayComponentEntity } from '../entities/pay-component.entity';
import { PayComponentType, PayFrequency } from '../enums/payroll.enum';

describe('CompensationService', () => {
  let service: CompensationService;
  let compensationRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let workerRepository: { findOne: jest.Mock };
  let payComponentRepository: { findOne: jest.Mock };
  let auditLogService: { append: jest.Mock };
  let rbacService: { getAuthContext: jest.Mock };

  const workerId = 'w0000000-0000-4000-8000-000000000001';
  const userId = 'u0000000-0000-4000-8000-000000000001';
  const employeeUserId = 'u0000000-0000-4000-8000-000000000002';
  const payComponentId = 'pc000000-0000-4000-8000-000000000001';
  const compensationId = 'cr000000-0000-4000-8000-000000000001';

  const pkWorker = {
    id: workerId,
    userId,
    tenantId: DIGITARO_TENANT_ID,
    countryCode: 'PK',
  } as WorkerEntity;

  const payComponent = {
    id: payComponentId,
    tenantId: DIGITARO_TENANT_ID,
    code: 'BASE_SALARY',
    name: 'Base Salary',
    componentType: PayComponentType.EARNING,
  } as PayComponentEntity;

  const financeAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId,
    roleCodes: [PolarisRoleCode.FINANCE],
    assignments: [
      {
        roleId: 'role-1',
        roleCode: PolarisRoleCode.FINANCE,
        scopeType: ScopeType.ALL,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.ALL,
  };

  const employeeAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: employeeUserId,
    roleCodes: [PolarisRoleCode.EMPLOYEE],
    assignments: [
      {
        roleId: 'role-2',
        roleCode: PolarisRoleCode.EMPLOYEE,
        scopeType: ScopeType.OWN,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.OWN,
  };

  const buildRecord = (
    overrides: Partial<CompensationRecordEntity> = {},
  ): CompensationRecordEntity =>
    ({
      id: compensationId,
      tenantId: DIGITARO_TENANT_ID,
      workerId,
      payComponentId,
      amount: '150000.00',
      currencyCode: 'PKR',
      payFrequency: PayFrequency.MONTHLY,
      effectiveFrom: '2026-08-01',
      effectiveTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as CompensationRecordEntity;

  beforeEach(async () => {
    compensationRepository = {
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: entity.id ?? compensationId,
        createdAt: entity.createdAt ?? new Date(),
        updatedAt: new Date(),
      })),
      createQueryBuilder: jest.fn(),
    };

    workerRepository = {
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        if (where?.id === workerId || where?.userId === userId) {
          return pkWorker;
        }
        return null;
      }),
    };

    payComponentRepository = {
      findOne: jest.fn().mockResolvedValue(payComponent),
    };

    auditLogService = { append: jest.fn() };
    rbacService = { getAuthContext: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompensationService,
        {
          provide: getRepositoryToken(CompensationRecordEntity),
          useValue: compensationRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        {
          provide: getRepositoryToken(PayComponentEntity),
          useValue: payComponentRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: rbacService },
      ],
    }).compile();

    service = module.get(CompensationService);
  });

  describe('createCompensation', () => {
    it('creates a compensation record and writes an audit_log entry', async () => {
      const result = await service.createCompensation(
        {
          workerId,
          payComponentId,
          amount: 150000,
          currencyCode: 'PKR',
          payFrequency: PayFrequency.MONTHLY,
          effectiveFrom: '2026-08-01',
        },
        { userId, correlationId: 'corr-comp-1' },
      );

      expect(result.workerId).toBe(workerId);
      expect(compensationRepository.save).toHaveBeenCalledTimes(1);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.compensation_record.create',
          entityType: 'compensation_record',
          correlationId: 'corr-comp-1',
          changes: expect.objectContaining({
            workerId: { old: null, new: workerId },
            payComponentId: { old: null, new: payComponentId },
          }),
        }),
      );
    });

    it('rejects when the worker does not exist', async () => {
      workerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createCompensation(
          {
            workerId: 'missing-worker',
            payComponentId,
            amount: 150000,
            currencyCode: 'PKR',
            effectiveFrom: '2026-08-01',
          },
          { userId },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(compensationRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.append).not.toHaveBeenCalled();
    });
  });

  describe('updateCompensation', () => {
    it('updates a compensation record and writes an audit_log entry', async () => {
      compensationRepository.findOne.mockResolvedValue(buildRecord());

      const result = await service.updateCompensation(
        compensationId,
        { amount: 160000, effectiveTo: '2026-12-31' },
        { userId, correlationId: 'corr-comp-2' },
      );

      expect(result.amount).toBe('160000');
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.compensation_record.update',
          entityType: 'compensation_record',
          entityId: compensationId,
          correlationId: 'corr-comp-2',
          changes: expect.objectContaining({
            amount: { old: '150000.00', new: '160000' },
            effectiveTo: { old: null, new: '2026-12-31' },
          }),
        }),
      );
    });

    it('throws NotFoundException when the record does not exist', async () => {
      compensationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateCompensation(
          'missing-record',
          { amount: 160000 },
          { userId },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(auditLogService.append).not.toHaveBeenCalled();
    });
  });

  describe('listCompensationRecords', () => {
    it('includes amounts for Finance', async () => {
      rbacService.getAuthContext.mockResolvedValue(financeAuth);
      const record = buildRecord();
      const getManyAndCount = jest.fn().mockResolvedValue([[record], 1]);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      compensationRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listCompensationRecords(
        { workerId } as any,
        userId,
      );

      expect(result.items[0].amount).toBe('150000.00');
    });

    it('redacts amount for non-Finance roles', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);
      workerRepository.findOne.mockImplementation(async ({ where }) => {
        if (where?.userId === employeeUserId) {
          return { ...pkWorker, id: workerId, userId: employeeUserId };
        }
        return null;
      });
      const record = buildRecord();
      const getManyAndCount = jest.fn().mockResolvedValue([[record], 1]);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      compensationRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listCompensationRecords(
        {} as any,
        employeeUserId,
      );

      expect(result.items[0].amount).toBeNull();
    });
  });

  describe('getCompensationRecord', () => {
    it('redacts amount when the actor is not Finance/People Ops/Super Admin', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);
      compensationRepository.findOne.mockResolvedValue(buildRecord());

      const result = await service.getCompensationRecord(
        compensationId,
        employeeUserId,
      );

      expect(result.amount).toBeNull();
    });

    it('returns the amount when the actor is Finance', async () => {
      rbacService.getAuthContext.mockResolvedValue(financeAuth);
      compensationRepository.findOne.mockResolvedValue(buildRecord());

      const result = await service.getCompensationRecord(
        compensationId,
        userId,
      );

      expect(result.amount).toBe('150000.00');
    });
  });
});
