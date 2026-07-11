import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ExpenseClaimEntity } from '@/modules/operations/entities/expense-claim.entity';
import { ExpensePolicyEntity } from '@/modules/operations/entities/expense-policy.entity';
import {
  ExpenseCategory,
  ExpenseClaimStatus,
} from '@/modules/operations/enums/expense.enum';
import { ExpenseClaimService } from '@/modules/operations/expense-claim.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

describe('ExpenseClaimService', () => {
  let service: ExpenseClaimService;
  let claimRepository: jest.Mocked<
    Pick<
      Repository<ExpenseClaimEntity>,
      'create' | 'save' | 'findOne' | 'createQueryBuilder'
    >
  >;
  let policyRepository: jest.Mocked<
    Pick<Repository<ExpensePolicyEntity>, 'findOne'>
  >;
  let workerRepository: jest.Mocked<Pick<Repository<WorkerEntity>, 'findOne'>>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let getAuthContext: jest.Mock;
  let dataSourceQuery: jest.Mock;
  let transactionManager: {
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  const employeeWorkerId = 'w0000000-0000-4000-8000-000000000010';
  const managerWorkerId = 'w0000000-0000-4000-8000-000000000011';
  const otherWorkerId = 'w0000000-0000-4000-8000-000000000012';

  const employeeAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'employee-user',
    roleCodes: [PolarisRoleCode.EMPLOYEE],
    assignments: [
      {
        roleId: 'role-employee',
        roleCode: PolarisRoleCode.EMPLOYEE,
        scopeType: ScopeType.OWN,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.OWN,
  };

  const managerAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'manager-user',
    roleCodes: [PolarisRoleCode.MANAGER],
    assignments: [
      {
        roleId: 'role-manager',
        roleCode: PolarisRoleCode.MANAGER,
        scopeType: ScopeType.TEAM,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.TEAM,
  };

  const financeAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'finance-user',
    roleCodes: [PolarisRoleCode.FINANCE],
    assignments: [
      {
        roleId: 'role-finance',
        roleCode: PolarisRoleCode.FINANCE,
        scopeType: ScopeType.ALL,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.ALL,
  };

  const buildClaim = (
    overrides: Partial<ExpenseClaimEntity> = {},
  ): ExpenseClaimEntity =>
    ({
      id: 'claim-1',
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId: null,
      workerId: employeeWorkerId,
      travelRequestId: null,
      category: ExpenseCategory.TRAVEL,
      amount: '100.00',
      currencyCode: 'USD',
      expenseDate: '2026-07-05',
      description: null,
      receiptBlobUrl: 'blob://receipt.png',
      ocrPrefill: null,
      status: ExpenseClaimStatus.DRAFT,
      submittedAt: null,
      managerApprovedBy: null,
      managerApprovedAt: null,
      financeApprovedBy: null,
      financeApprovedAt: null,
      rejectionReason: null,
      policyViolation: null,
      ...overrides,
    }) as ExpenseClaimEntity;

  beforeEach(async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    } as unknown as SelectQueryBuilder<ExpenseClaimEntity>;

    claimRepository = {
      create: jest.fn((entity) => entity as ExpenseClaimEntity),
      save: jest.fn(async (entity) => entity as ExpenseClaimEntity),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as typeof claimRepository;

    policyRepository = { findOne: jest.fn().mockResolvedValue(null) };

    workerRepository = {
      findOne: jest.fn(
        async ({ where }: { where: Record<string, unknown> }) => {
          if ('userId' in where) {
            const userId = where.userId as string;
            if (userId === 'employee-user') {
              return {
                id: employeeWorkerId,
                countryCode: 'PK',
              } as WorkerEntity;
            }
            if (userId === 'manager-user') {
              return { id: managerWorkerId, countryCode: 'PK' } as WorkerEntity;
            }
            return null;
          }
          if (where.id === employeeWorkerId) {
            return {
              id: employeeWorkerId,
              managerId: managerWorkerId,
              countryCode: 'PK',
              legalEntityId: null,
            } as WorkerEntity;
          }
          return { id: where.id, countryCode: 'PK' } as WorkerEntity;
        },
      ),
    };

    auditLogService = { append: jest.fn() };
    getAuthContext = jest.fn().mockResolvedValue(employeeAuth);
    dataSourceQuery = jest.fn().mockResolvedValue([{ total: '0' }]);

    transactionManager = {
      create: jest.fn((_entityClass: unknown, plain: unknown) => plain),
      save: jest.fn(async (entityOrArray: unknown) => {
        if (Array.isArray(entityOrArray)) {
          return entityOrArray.map((line, index) => ({
            ...(line as object),
            id: `line-${index}`,
          }));
        }
        return { ...(entityOrArray as object), id: 'claim-1' };
      }),
      delete: jest.fn(),
    };

    const dataSource = {
      transaction: jest.fn(async (cb: (manager: EntityManager) => unknown) =>
        cb(transactionManager as unknown as EntityManager),
      ),
      query: dataSourceQuery,
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseClaimService,
        {
          provide: getRepositoryToken(ExpenseClaimEntity),
          useValue: claimRepository,
        },
        {
          provide: getRepositoryToken(ExpensePolicyEntity),
          useValue: policyRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: { getAuthContext } },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(ExpenseClaimService);
  });

  describe('create', () => {
    it('creates a draft claim with the given amount and writes an audit log entry', async () => {
      const result = await service.create(
        {
          category: ExpenseCategory.TRAVEL,
          amount: 100,
          currencyCode: 'usd',
          expenseDate: '2026-07-05',
        },
        'employee-user',
        'corr-1',
      );

      expect(result.id).toBe('claim-1');
      expect(result.status).toBe(ExpenseClaimStatus.DRAFT);
      expect(result.workerId).toBe(employeeWorkerId);
      expect(result.amount).toBe('100.00');
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'expense_claim.create' }),
      );
    });

    it('sums line amounts when lines are provided', async () => {
      const result = await service.create(
        {
          category: ExpenseCategory.TRAVEL,
          currencyCode: 'USD',
          expenseDate: '2026-07-05',
          lines: [
            { description: 'Taxi', amount: 40 },
            { description: 'Toll', amount: 10 },
          ],
        },
        'employee-user',
      );

      expect(result.amount).toBe('50.00');
    });

    it('rejects a claim with neither amount nor lines', async () => {
      await expect(
        service.create(
          {
            category: ExpenseCategory.TRAVEL,
            currencyCode: 'USD',
            expenseDate: '2026-07-05',
          },
          'employee-user',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an employee creating a claim for another worker', async () => {
      await expect(
        service.create(
          {
            workerId: otherWorkerId,
            category: ExpenseCategory.TRAVEL,
            amount: 50,
            currencyCode: 'USD',
            expenseDate: '2026-07-05',
          },
          'employee-user',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('submit', () => {
    it('moves a draft claim to submitted and records submittedAt', async () => {
      claimRepository.findOne.mockResolvedValue(buildClaim());

      const result = await service.submit('claim-1', 'employee-user', 'corr-2');

      expect(result.status).toBe(ExpenseClaimStatus.SUBMITTED);
      expect(result.submittedAt).toBeInstanceOf(Date);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'expense_claim.submit' }),
      );
    });

    it('blocks submitting without a receipt when above the policy threshold', async () => {
      claimRepository.findOne.mockResolvedValue(
        buildClaim({ amount: '500.00', receiptBlobUrl: null }),
      );
      policyRepository.findOne.mockResolvedValue({
        id: 'policy-1',
        tenantId: DIGITARO_TENANT_ID,
        countryCode: 'PK',
        category: ExpenseCategory.TRAVEL,
        dailyCap: null,
        monthlyCap: null,
        receiptRequiredAbove: '100.00',
        currencyCode: 'USD',
      } as ExpensePolicyEntity);

      await expect(
        service.submit('claim-1', 'employee-user'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('flags a policy violation when the daily cap is exceeded but still submits', async () => {
      claimRepository.findOne.mockResolvedValue(
        buildClaim({ amount: '150.00' }),
      );
      policyRepository.findOne.mockResolvedValue({
        id: 'policy-1',
        tenantId: DIGITARO_TENANT_ID,
        countryCode: 'PK',
        category: ExpenseCategory.TRAVEL,
        dailyCap: '100.00',
        monthlyCap: null,
        receiptRequiredAbove: null,
        currencyCode: 'USD',
      } as ExpensePolicyEntity);
      dataSourceQuery.mockResolvedValue([{ total: '0' }]);

      const result = await service.submit('claim-1', 'employee-user');

      expect(result.status).toBe(ExpenseClaimStatus.SUBMITTED);
      expect(result.policyViolation).toEqual(
        expect.objectContaining({ type: 'daily_cap' }),
      );
    });

    it('rejects submitting a claim that is not a draft', async () => {
      claimRepository.findOne.mockResolvedValue(
        buildClaim({ status: ExpenseClaimStatus.SUBMITTED }),
      );

      await expect(
        service.submit('claim-1', 'employee-user'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('approveManager', () => {
    it("moves a submitted claim to approved for the worker's manager", async () => {
      getAuthContext.mockResolvedValue(managerAuth);
      claimRepository.findOne.mockResolvedValue(
        buildClaim({ status: ExpenseClaimStatus.SUBMITTED }),
      );

      const result = await service.approveManager(
        'claim-1',
        'manager-user',
        'corr-3',
      );

      expect(result.status).toBe(ExpenseClaimStatus.APPROVED);
      expect(result.managerApprovedBy).toBe('manager-user');
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'expense_claim.approve_manager' }),
      );
    });

    it('rejects a manager who does not manage the claim worker (SoD)', async () => {
      getAuthContext.mockResolvedValue({
        ...managerAuth,
        userId: 'other-manager',
      });
      claimRepository.findOne.mockResolvedValue(
        buildClaim({ status: ExpenseClaimStatus.SUBMITTED }),
      );

      await expect(
        service.approveManager('claim-1', 'other-manager'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('approveFinance and markPaid', () => {
    it('records a finance confirmation without changing status', async () => {
      getAuthContext.mockResolvedValue(financeAuth);
      claimRepository.findOne.mockResolvedValue(
        buildClaim({ status: ExpenseClaimStatus.APPROVED }),
      );

      const result = await service.approveFinance(
        'claim-1',
        'finance-user',
        'corr-4',
      );

      expect(result.status).toBe(ExpenseClaimStatus.APPROVED);
      expect(result.financeApprovedBy).toBe('finance-user');
    });

    it('marks an approved claim as paid', async () => {
      getAuthContext.mockResolvedValue(financeAuth);
      claimRepository.findOne.mockResolvedValue(
        buildClaim({ status: ExpenseClaimStatus.APPROVED }),
      );

      const result = await service.markPaid('claim-1', 'finance-user');

      expect(result.status).toBe(ExpenseClaimStatus.PAID);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'expense_claim.mark_paid' }),
      );
    });

    it('rejects a manager attempting to mark a claim paid', async () => {
      getAuthContext.mockResolvedValue(managerAuth);
      claimRepository.findOne.mockResolvedValue(
        buildClaim({ status: ExpenseClaimStatus.APPROVED }),
      );

      await expect(
        service.markPaid('claim-1', 'manager-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('reject', () => {
    it('rejects a submitted claim with a reason', async () => {
      getAuthContext.mockResolvedValue(managerAuth);
      claimRepository.findOne.mockResolvedValue(
        buildClaim({ status: ExpenseClaimStatus.SUBMITTED }),
      );

      const result = await service.reject(
        'claim-1',
        { reason: 'Duplicate submission' },
        'manager-user',
      );

      expect(result.status).toBe(ExpenseClaimStatus.REJECTED);
      expect(result.rejectionReason).toBe('Duplicate submission');
    });
  });

  describe('list', () => {
    it("prevents an employee from listing another worker's claims", async () => {
      await expect(
        service.list({ workerId: otherWorkerId } as never, 'employee-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('scopes an employee to their own claims when no workerId filter is given', async () => {
      const qb = claimRepository.createQueryBuilder(
        'claim',
      ) as unknown as jest.Mocked<SelectQueryBuilder<ExpenseClaimEntity>>;

      await service.list({} as never, 'employee-user');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'claim.workerId = :actingWorkerId',
        {
          actingWorkerId: employeeWorkerId,
        },
      );
    });
  });
});
