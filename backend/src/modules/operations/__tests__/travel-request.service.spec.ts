import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { TravelApprovalRuleEntity } from '@/modules/operations/entities/travel-approval-rule.entity';
import { TravelRequestEntity } from '@/modules/operations/entities/travel-request.entity';
import {
  TravelRequestStatus,
  TravelType,
} from '@/modules/operations/enums/travel.enum';
import { TravelRequestService } from '@/modules/operations/travel-request.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

describe('TravelRequestService', () => {
  let service: TravelRequestService;
  let requestRepository: jest.Mocked<
    Pick<
      Repository<TravelRequestEntity>,
      'create' | 'save' | 'findOne' | 'createQueryBuilder' | 'manager'
    >
  >;
  let approvalRuleRepository: jest.Mocked<
    Pick<Repository<TravelApprovalRuleEntity>, 'findOne' | 'create' | 'save'>
  >;
  let workerRepository: jest.Mocked<Pick<Repository<WorkerEntity>, 'findOne'>>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let getAuthContext: jest.Mock;
  let transactionManager: {
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  const employeeWorkerId = 'w0000000-0000-4000-8000-000000000020';
  const managerWorkerId = 'w0000000-0000-4000-8000-000000000021';

  const employeeAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'employee-user',
    roleCodes: [PolarisRoleCode.EMPLOYEE],
    assignments: [],
    broadestScope: ScopeType.OWN,
  };
  const managerAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'manager-user',
    roleCodes: [PolarisRoleCode.MANAGER],
    assignments: [],
    broadestScope: ScopeType.TEAM,
  };
  const financeAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'finance-user',
    roleCodes: [PolarisRoleCode.FINANCE],
    assignments: [],
    broadestScope: ScopeType.ALL,
  };
  const peopleOpsAuth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'people-ops-user',
    roleCodes: [PolarisRoleCode.PEOPLE_OPS],
    assignments: [],
    broadestScope: ScopeType.ALL,
  };

  const buildRequest = (
    overrides: Partial<TravelRequestEntity> = {},
  ): TravelRequestEntity =>
    ({
      id: 'travel-1',
      tenantId: DIGITARO_TENANT_ID,
      workerId: employeeWorkerId,
      destinations: ['Dubai, UAE'],
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      purpose: 'Client workshop',
      travelType: TravelType.INTERNATIONAL,
      estimatedCost: '500.00',
      actualCost: null,
      currencyCode: 'USD',
      status: TravelRequestStatus.SUBMITTED,
      managerApprovedBy: null,
      managerApprovedAt: null,
      financeApprovedBy: null,
      financeApprovedAt: null,
      peopleOpsApprovedBy: null,
      peopleOpsApprovedAt: null,
      rejectionReason: null,
      ...overrides,
    }) as TravelRequestEntity;

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
    } as unknown as SelectQueryBuilder<TravelRequestEntity>;

    requestRepository = {
      create: jest.fn((entity) => entity as TravelRequestEntity),
      save: jest.fn(async (entity) => entity as TravelRequestEntity),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      manager: {
        create: jest.fn(),
        save: jest.fn(),
      } as unknown as EntityManager,
    } as unknown as typeof requestRepository;

    approvalRuleRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((e) => e as TravelApprovalRuleEntity),
      save: jest.fn(
        async (e) => ({ ...e, id: 'rule-1' }) as TravelApprovalRuleEntity,
      ),
    } as unknown as typeof approvalRuleRepository;

    workerRepository = {
      findOne: jest.fn(
        async ({ where }: { where: Record<string, unknown> }) => {
          if ('userId' in where) {
            const userId = where.userId as string;
            if (userId === 'employee-user')
              return { id: employeeWorkerId } as WorkerEntity;
            if (userId === 'manager-user')
              return { id: managerWorkerId } as WorkerEntity;
            return null;
          }
          if (where.id === employeeWorkerId) {
            return {
              id: employeeWorkerId,
              managerId: managerWorkerId,
            } as WorkerEntity;
          }
          return { id: where.id } as WorkerEntity;
        },
      ),
    };

    auditLogService = { append: jest.fn() };
    getAuthContext = jest.fn().mockResolvedValue(employeeAuth);

    transactionManager = {
      create: jest.fn((_entityClass: unknown, plain: unknown) => plain),
      save: jest.fn(async (entityOrArray: unknown) => {
        if (Array.isArray(entityOrArray)) {
          return entityOrArray.map((leg, index) => ({
            ...(leg as object),
            id: `leg-${index}`,
          }));
        }
        return { ...(entityOrArray as object), id: 'travel-1' };
      }),
      delete: jest.fn(),
    };

    const dataSource = {
      transaction: jest.fn(async (cb: (manager: EntityManager) => unknown) =>
        cb(transactionManager as unknown as EntityManager),
      ),
    } as unknown as DataSource;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelRequestService,
        {
          provide: getRepositoryToken(TravelRequestEntity),
          useValue: requestRepository,
        },
        {
          provide: getRepositoryToken(TravelApprovalRuleEntity),
          useValue: approvalRuleRepository,
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

    service = module.get(TravelRequestService);
  });

  describe('create', () => {
    it('creates a draft travel request and writes an audit log entry', async () => {
      const result = await service.create(
        {
          destinations: ['Dubai, UAE'],
          startDate: '2026-08-01',
          endDate: '2026-08-05',
          purpose: 'Client workshop',
          travelType: TravelType.INTERNATIONAL,
          estimatedCost: 500,
          currencyCode: 'usd',
        },
        'employee-user',
        'corr-1',
      );

      expect(result.id).toBe('travel-1');
      expect(result.status).toBe(TravelRequestStatus.DRAFT);
      expect(result.estimatedCost).toBe('500.00');
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'travel_request.create' }),
      );
    });
  });

  describe('approval chain', () => {
    it('moves straight to approved when no finance/people-ops gate applies', async () => {
      requestRepository.findOne.mockResolvedValue(
        buildRequest({ travelType: TravelType.DOMESTIC }),
      );
      approvalRuleRepository.findOne.mockResolvedValue(null);
      getAuthContext.mockResolvedValue(managerAuth);

      const result = await service.approveManager('travel-1', 'manager-user');

      expect(result.status).toBe(TravelRequestStatus.APPROVED);
      expect(result.managerApprovedBy).toBe('manager-user');
    });

    it('stays submitted after manager approval when Finance is required by threshold', async () => {
      requestRepository.findOne.mockResolvedValue(
        buildRequest({
          estimatedCost: '2000.00',
          travelType: TravelType.DOMESTIC,
        }),
      );
      approvalRuleRepository.findOne.mockResolvedValue({
        id: 'rule-1',
        tenantId: DIGITARO_TENANT_ID,
        amountThreshold: '1000.00',
        currencyCode: 'USD',
        requireFinance: true,
        requirePeopleOpsForInternational: false,
      } as TravelApprovalRuleEntity);
      getAuthContext.mockResolvedValue(managerAuth);

      const result = await service.approveManager('travel-1', 'manager-user');

      expect(result.status).toBe(TravelRequestStatus.SUBMITTED);
      expect(result.managerApprovedAt).toBeInstanceOf(Date);
    });

    it('reaches approved once Finance also signs off after manager', async () => {
      const rule = {
        id: 'rule-1',
        tenantId: DIGITARO_TENANT_ID,
        amountThreshold: '1000.00',
        currencyCode: 'USD',
        requireFinance: true,
        requirePeopleOpsForInternational: false,
      } as TravelApprovalRuleEntity;
      approvalRuleRepository.findOne.mockResolvedValue(rule);

      requestRepository.findOne.mockResolvedValue(
        buildRequest({
          estimatedCost: '2000.00',
          travelType: TravelType.DOMESTIC,
          managerApprovedBy: 'manager-user',
          managerApprovedAt: new Date(),
        }),
      );
      getAuthContext.mockResolvedValue(financeAuth);

      const result = await service.approveFinance('travel-1', 'finance-user');

      expect(result.status).toBe(TravelRequestStatus.APPROVED);
      expect(result.financeApprovedBy).toBe('finance-user');
    });

    it('requires manager approval before Finance can approve', async () => {
      requestRepository.findOne.mockResolvedValue(buildRequest());
      getAuthContext.mockResolvedValue(financeAuth);

      await expect(
        service.approveFinance('travel-1', 'finance-user'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires People Ops approval for international travel when configured', async () => {
      const rule = {
        id: 'rule-1',
        tenantId: DIGITARO_TENANT_ID,
        amountThreshold: null,
        currencyCode: null,
        requireFinance: false,
        requirePeopleOpsForInternational: true,
      } as TravelApprovalRuleEntity;
      approvalRuleRepository.findOne.mockResolvedValue(rule);

      requestRepository.findOne.mockResolvedValue(
        buildRequest({
          travelType: TravelType.INTERNATIONAL,
          managerApprovedBy: 'manager-user',
          managerApprovedAt: new Date(),
        }),
      );
      getAuthContext.mockResolvedValue(peopleOpsAuth);

      const result = await service.approvePeopleOps(
        'travel-1',
        'people-ops-user',
      );

      expect(result.status).toBe(TravelRequestStatus.APPROVED);
      expect(result.peopleOpsApprovedBy).toBe('people-ops-user');
    });

    it('rejects a manager attempting to Finance-approve', async () => {
      requestRepository.findOne.mockResolvedValue(
        buildRequest({ managerApprovedAt: new Date() }),
      );
      getAuthContext.mockResolvedValue(managerAuth);

      await expect(
        service.approveFinance('travel-1', 'manager-user'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('post-travel lifecycle', () => {
    it('moves approved -> in_progress -> completed -> reconciled', async () => {
      requestRepository.findOne.mockResolvedValue(
        buildRequest({ status: TravelRequestStatus.APPROVED }),
      );
      getAuthContext.mockResolvedValue(employeeAuth);

      const inProgress = await service.markInProgress(
        'travel-1',
        'employee-user',
      );
      expect(inProgress.status).toBe(TravelRequestStatus.IN_PROGRESS);

      requestRepository.findOne.mockResolvedValue(
        buildRequest({ status: TravelRequestStatus.IN_PROGRESS }),
      );
      const completed = await service.markCompleted(
        'travel-1',
        'employee-user',
      );
      expect(completed.status).toBe(TravelRequestStatus.COMPLETED);

      requestRepository.findOne.mockResolvedValue(
        buildRequest({ status: TravelRequestStatus.COMPLETED }),
      );
      getAuthContext.mockResolvedValue(financeAuth);
      const reconciled = await service.reconcile(
        'travel-1',
        { actualCost: 550 },
        'finance-user',
      );
      expect(reconciled.status).toBe(TravelRequestStatus.RECONCILED);
      expect(reconciled.actualCost).toBe('550.00');
    });
  });

  describe('reject', () => {
    it('rejects a submitted request with a reason', async () => {
      requestRepository.findOne.mockResolvedValue(buildRequest());
      getAuthContext.mockResolvedValue(managerAuth);

      const result = await service.reject(
        'travel-1',
        { reason: 'Over budget' },
        'manager-user',
      );

      expect(result.status).toBe(TravelRequestStatus.REJECTED);
      expect(result.rejectionReason).toBe('Over budget');
    });
  });
});
