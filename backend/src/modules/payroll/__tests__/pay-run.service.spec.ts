import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { WorkerStatus } from '@/modules/core-hr/enums/worker.enum';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompensationRecordEntity } from '../entities/compensation-record.entity';
import { EmployeeBenefitEntity } from '../entities/employee-benefit.entity';
import { PayRunLineItemEntity } from '../entities/pay-run-line-item.entity';
import { PayRunEntity } from '../entities/pay-run.entity';
import { PayRunStatus } from '../enums/payroll.enum';
import { PayRunCalculatorService } from '../pay-run-calculator.service';
import { PAY_RUN_LOP_PROVIDER } from '../pay-run-lop-provider';
import { PayRunService } from '../pay-run.service';
import { StatutoryRateService } from '../statutory-rate.service';

describe('PayRunService', () => {
  let service: PayRunService;
  let payRunRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let lineItemRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let workerRepository: { createQueryBuilder: jest.Mock };
  let compensationRepository: { createQueryBuilder: jest.Mock };
  let employeeBenefitRepository: { createQueryBuilder: jest.Mock };
  let statutoryRateService: { resolveRates: jest.Mock };
  let auditLogService: { append: jest.Mock };
  let rbacService: { getAuthContext: jest.Mock };
  let lopProvider: { resolveLopDays: jest.Mock };

  const userId = 'u0000000-0000-4000-8000-000000000001';
  const legalEntityId = 'le000000-0000-4000-8000-000000000001';
  const payRunId = 'pr000000-0000-4000-8000-000000000001';
  const workerId = 'w0000000-0000-4000-8000-000000000001';

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
    userId,
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

  const buildPayRun = (overrides: Partial<PayRunEntity> = {}): PayRunEntity =>
    ({
      id: payRunId,
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      countryCode: 'PK',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      status: PayRunStatus.DRAFT,
      functionalCurrency: 'PKR',
      financeExportProfileId: null,
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as PayRunEntity;

  const buildWorker = (overrides: Partial<WorkerEntity> = {}): WorkerEntity =>
    ({
      id: workerId,
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      countryCode: 'PK',
      bankCountryCode: 'PK',
      status: WorkerStatus.ACTIVE,
      startDate: '2020-01-01',
      endDate: null,
      ...overrides,
    }) as WorkerEntity;

  function mockQueryBuilder<T>(result: T[]) {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(result),
      getManyAndCount: jest.fn().mockResolvedValue([result, result.length]),
    };
  }

  beforeEach(async () => {
    payRunRepository = {
      findOne: jest.fn().mockResolvedValue(buildPayRun()),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: entity.id ?? payRunId,
        createdAt: entity.createdAt ?? new Date(),
        updatedAt: new Date(),
      })),
      createQueryBuilder: jest.fn(),
    };

    lineItemRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entities) =>
        entities.map(
          (entity: Partial<PayRunLineItemEntity>, index: number) => ({
            ...entity,
            id: `li00000-0000-4000-8000-00000000000${index}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
      ),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    workerRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValue(mockQueryBuilder([buildWorker()])),
    };

    compensationRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValue(mockQueryBuilder([{ amount: '100000.00' }])),
    };

    employeeBenefitRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder([])),
    };

    statutoryRateService = { resolveRates: jest.fn().mockResolvedValue([]) };
    auditLogService = { append: jest.fn() };
    rbacService = { getAuthContext: jest.fn().mockResolvedValue(financeAuth) };
    lopProvider = { resolveLopDays: jest.fn().mockResolvedValue(0) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayRunService,
        PayRunCalculatorService,
        {
          provide: getRepositoryToken(PayRunEntity),
          useValue: payRunRepository,
        },
        {
          provide: getRepositoryToken(PayRunLineItemEntity),
          useValue: lineItemRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        {
          provide: getRepositoryToken(CompensationRecordEntity),
          useValue: compensationRepository,
        },
        {
          provide: getRepositoryToken(EmployeeBenefitEntity),
          useValue: employeeBenefitRepository,
        },
        { provide: StatutoryRateService, useValue: statutoryRateService },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: rbacService },
        { provide: PAY_RUN_LOP_PROVIDER, useValue: lopProvider },
      ],
    }).compile();

    service = module.get(PayRunService);
  });

  describe('createPayRun', () => {
    it('creates a pay run in draft status and writes an audit_log entry', async () => {
      const result = await service.createPayRun(
        {
          legalEntityId,
          countryCode: 'PK',
          periodStart: '2026-08-01',
          periodEnd: '2026-08-31',
          functionalCurrency: 'PKR',
        },
        { userId, correlationId: 'corr-pr-1' },
      );

      expect(result.status).toBe(PayRunStatus.DRAFT);
      expect(payRunRepository.save).toHaveBeenCalledTimes(1);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.pay_run.create',
          entityType: 'pay_run',
          correlationId: 'corr-pr-1',
          changes: expect.objectContaining({
            status: { old: null, new: PayRunStatus.DRAFT },
          }),
        }),
      );
    });
  });

  describe('calculatePayRun', () => {
    it('rebuilds line items and moves the pay run to review status', async () => {
      const result = await service.calculatePayRun(payRunId, { userId });

      expect(lineItemRepository.delete).toHaveBeenCalledWith({
        payRunId,
        tenantId: DIGITARO_TENANT_ID,
      });
      expect(lineItemRepository.save).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(PayRunStatus.REVIEW);
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0].workerId).toBe(workerId);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.pay_run.calculate',
          changes: expect.objectContaining({
            status: { old: PayRunStatus.DRAFT, new: PayRunStatus.REVIEW },
          }),
        }),
      );
    });

    it('is allowed from review status too (recalculation replaces prior lines)', async () => {
      payRunRepository.findOne.mockResolvedValue(
        buildPayRun({ status: PayRunStatus.REVIEW }),
      );

      const result = await service.calculatePayRun(payRunId, { userId });

      expect(result.status).toBe(PayRunStatus.REVIEW);
      expect(lineItemRepository.delete).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestException when the pay run is already approved', async () => {
      payRunRepository.findOne.mockResolvedValue(
        buildPayRun({ status: PayRunStatus.APPROVED }),
      );

      await expect(
        service.calculatePayRun(payRunId, { userId }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(lineItemRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('approvePayRun', () => {
    it('approves a pay run in review status, sets approvedBy/At and writes an audit_log entry', async () => {
      payRunRepository.findOne.mockResolvedValue(
        buildPayRun({ status: PayRunStatus.REVIEW }),
      );

      const result = await service.approvePayRun(payRunId, {
        userId,
        correlationId: 'corr-pr-2',
      });

      expect(result.status).toBe(PayRunStatus.APPROVED);
      expect(result.approvedBy).toBe(userId);
      expect(result.approvedAt).toBeInstanceOf(Date);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payroll.pay_run.approve',
          correlationId: 'corr-pr-2',
          changes: expect.objectContaining({
            status: { old: PayRunStatus.REVIEW, new: PayRunStatus.APPROVED },
          }),
        }),
      );
    });

    it('is idempotent when the pay run is already approved', async () => {
      const approvedPayRun = buildPayRun({
        status: PayRunStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date('2026-08-01T00:00:00Z'),
      });
      payRunRepository.findOne.mockResolvedValue(approvedPayRun);

      const result = await service.approvePayRun(payRunId, { userId });

      expect(result.status).toBe(PayRunStatus.APPROVED);
      expect(payRunRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.append).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the actor is not a payroll admin', async () => {
      rbacService.getAuthContext.mockResolvedValue(employeeAuth);
      payRunRepository.findOne.mockResolvedValue(
        buildPayRun({ status: PayRunStatus.REVIEW }),
      );

      await expect(
        service.approvePayRun(payRunId, { userId }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(payRunRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.append).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when approving from draft status', async () => {
      payRunRepository.findOne.mockResolvedValue(
        buildPayRun({ status: PayRunStatus.DRAFT }),
      );

      await expect(
        service.approvePayRun(payRunId, { userId }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(payRunRepository.save).not.toHaveBeenCalled();
      expect(auditLogService.append).not.toHaveBeenCalled();
    });
  });
});
