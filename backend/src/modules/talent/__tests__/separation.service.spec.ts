import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { WorkerService } from '@/modules/core-hr/worker.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClearanceItemEntity } from '../entities/clearance-item.entity';
import { SeparationCaseEntity } from '../entities/separation-case.entity';
import {
  ClearanceCategory,
  ClearanceItemStatus,
  SeparationCaseStatus,
} from '../enums/onboarding.enum';
import { OnboardingService } from '../onboarding.service';
import { SeparationService } from '../separation.service';

describe('SeparationService', () => {
  let service: SeparationService;
  let moduleRef: TestingModule;
  let separationRepository: jest.Mocked<
    Pick<Repository<SeparationCaseEntity>, 'findOne' | 'save'>
  >;
  let workerRepository: jest.Mocked<Pick<Repository<WorkerEntity>, 'findOne'>>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let dataSource: { transaction: jest.Mock };
  let onboardingService: jest.Mocked<
    Pick<OnboardingService, 'disableEntraAccount'>
  >;
  let workerService: jest.Mocked<Pick<WorkerService, 'archive'>>;

  const workerId = 'w0000000-0000-4000-8000-000000000002';
  const separationId = 's0000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    separationRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (entity) => entity),
    } as unknown as typeof separationRepository;
    workerRepository = {
      findOne: jest.fn().mockResolvedValue({ id: workerId } as WorkerEntity),
    };
    auditLogService = { append: jest.fn() };
    onboardingService = {
      disableEntraAccount: jest.fn(),
    };
    workerService = {
      archive: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(
        async (cb: (manager: unknown) => Promise<unknown>) => {
          const manager = {
            create: jest.fn((_entity: unknown, data: unknown) => data),
            save: jest.fn(async (_entity: unknown, data: unknown) => {
              if (Array.isArray(data)) {
                return data.map((item, index) => ({
                  ...(item as object),
                  id: `clearance-${index}`,
                }));
              }
              return {
                ...(data as object),
                id: separationId,
              };
            }),
            find: jest.fn(),
            findOne: jest.fn(),
          };
          return cb(manager);
        },
      ),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        SeparationService,
        {
          provide: getRepositoryToken(SeparationCaseEntity),
          useValue: separationRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        {
          provide: RbacService,
          useValue: {
            getAuthContext: jest.fn().mockResolvedValue({
              tenantId: DIGITARO_TENANT_ID,
              userId: 'ops-user',
              roleCodes: [PolarisRoleCode.PEOPLE_OPS],
              assignments: [
                {
                  roleId: 'role-id',
                  roleCode: PolarisRoleCode.PEOPLE_OPS,
                  scopeType: ScopeType.ALL,
                  scopeId: null,
                },
              ],
              broadestScope: ScopeType.ALL,
            }),
          },
        },
        { provide: DataSource, useValue: dataSource },
        { provide: OnboardingService, useValue: onboardingService },
        { provide: WorkerService, useValue: workerService },
      ],
    }).compile();

    service = moduleRef.get(SeparationService);
  });

  it('initiates separation with default hr/it/finance/manager clearance items', async () => {
    separationRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: separationId,
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        lastWorkingDay: '2026-08-31',
        status: SeparationCaseStatus.INITIATED,
        reason: 'Resignation',
        clearanceItems: [
          {
            id: 'clearance-0',
            separationCaseId: separationId,
            category: ClearanceCategory.HR,
            title: 'HR exit checklist & documentation',
            status: ClearanceItemStatus.PENDING,
            clearedBy: null,
            clearedAt: null,
          },
          {
            id: 'clearance-1',
            separationCaseId: separationId,
            category: ClearanceCategory.IT,
            title: 'IT assets & access revocation',
            status: ClearanceItemStatus.PENDING,
            clearedBy: null,
            clearedAt: null,
          },
          {
            id: 'clearance-2',
            separationCaseId: separationId,
            category: ClearanceCategory.FINANCE,
            title: 'Finance settlement & advances',
            status: ClearanceItemStatus.PENDING,
            clearedBy: null,
            clearedAt: null,
          },
          {
            id: 'clearance-3',
            separationCaseId: separationId,
            category: ClearanceCategory.MANAGER,
            title: 'Manager handover & knowledge transfer',
            status: ClearanceItemStatus.PENDING,
            clearedBy: null,
            clearedAt: null,
          },
        ] as ClearanceItemEntity[],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SeparationCaseEntity);

    const result = await service.initiate(
      {
        workerId,
        lastWorkingDay: '2026-08-31',
        reason: 'Resignation',
      },
      { userId: 'ops-user', correlationId: 'corr-sep-1' },
    );

    expect(result.id).toBe(separationId);
    expect(result.clearanceItems).toHaveLength(4);
    expect(result.clearanceItems?.map((item) => item.category).sort()).toEqual([
      ClearanceCategory.FINANCE,
      ClearanceCategory.HR,
      ClearanceCategory.IT,
      ClearanceCategory.MANAGER,
    ]);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'separation.initiate',
        entityId: separationId,
        correlationId: 'corr-sep-1',
      }),
    );
  });

  it('rejects manager clearing an HR clearance item', async () => {
    const rbac = moduleRef.get(RbacService) as {
      getAuthContext: jest.Mock;
    };
    rbac.getAuthContext.mockResolvedValue({
      tenantId: DIGITARO_TENANT_ID,
      userId: 'mgr-user',
      roleCodes: [PolarisRoleCode.MANAGER],
      assignments: [
        {
          roleId: 'role-id',
          roleCode: PolarisRoleCode.MANAGER,
          scopeType: ScopeType.TEAM,
          scopeId: null,
        },
      ],
      broadestScope: ScopeType.TEAM,
    });

    separationRepository.findOne.mockResolvedValue({
      id: separationId,
      tenantId: DIGITARO_TENANT_ID,
      workerId,
      lastWorkingDay: '2026-08-31',
      status: SeparationCaseStatus.IN_PROGRESS,
      reason: 'Resignation',
      worker: {
        id: workerId,
        managerId: 'mgr-worker',
        divisionId: null,
      } as WorkerEntity,
      clearanceItems: [
        {
          id: 'clearance-hr',
          separationCaseId: separationId,
          category: ClearanceCategory.HR,
          title: 'HR exit checklist',
          status: ClearanceItemStatus.PENDING,
          clearedBy: null,
          clearedAt: null,
        },
      ] as ClearanceItemEntity[],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SeparationCaseEntity);

    await expect(
      service.clearItem(
        separationId,
        'clearance-hr',
        {},
        { userId: 'mgr-user' },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'CLEARANCE_ROLE_DENIED' }),
    });
    expect(onboardingService.disableEntraAccount).not.toHaveBeenCalled();
  });

  it('defers Entra disable when People Ops clears before last working day', async () => {
    const futureLwd = '2099-12-31';
    const items: ClearanceItemEntity[] = [
      {
        id: 'c-hr',
        separationCaseId: separationId,
        category: ClearanceCategory.HR,
        title: 'HR',
        status: ClearanceItemStatus.PENDING,
        clearedBy: null,
        clearedAt: null,
      } as ClearanceItemEntity,
    ];

    separationRepository.findOne
      .mockResolvedValueOnce({
        id: separationId,
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        lastWorkingDay: futureLwd,
        status: SeparationCaseStatus.IN_PROGRESS,
        reason: 'Resignation',
        worker: { id: workerId } as WorkerEntity,
        clearanceItems: items,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SeparationCaseEntity)
      .mockResolvedValueOnce({
        id: separationId,
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        lastWorkingDay: futureLwd,
        status: SeparationCaseStatus.CLEARED,
        reason: 'Resignation',
        worker: { id: workerId } as WorkerEntity,
        clearanceItems: [
          { ...items[0], status: ClearanceItemStatus.CLEARED },
        ] as ClearanceItemEntity[],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SeparationCaseEntity);

    dataSource.transaction.mockImplementation(
      async (cb: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          save: jest.fn(async (_e: unknown, data: unknown) => data),
          find: jest
            .fn()
            .mockResolvedValue([
              { ...items[0], status: ClearanceItemStatus.CLEARED },
            ]),
        };
        return cb(manager);
      },
    );

    await service.clearItem(
      separationId,
      'c-hr',
      {},
      { userId: 'ops-user', correlationId: 'corr-clear' },
    );

    expect(onboardingService.disableEntraAccount).not.toHaveBeenCalled();
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'entra.disable.deferred' }),
    );
  });

  it('disables Entra and archives the worker when clearance completes on/after the last working day', async () => {
    const pastLwd = '2020-01-01';
    const items: ClearanceItemEntity[] = [
      {
        id: 'c-hr',
        separationCaseId: separationId,
        category: ClearanceCategory.HR,
        title: 'HR',
        status: ClearanceItemStatus.PENDING,
        clearedBy: null,
        clearedAt: null,
      } as ClearanceItemEntity,
    ];

    separationRepository.findOne
      .mockResolvedValueOnce({
        id: separationId,
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        lastWorkingDay: pastLwd,
        status: SeparationCaseStatus.IN_PROGRESS,
        reason: 'Resignation',
        worker: { id: workerId } as WorkerEntity,
        clearanceItems: items,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SeparationCaseEntity)
      .mockResolvedValueOnce({
        id: separationId,
        tenantId: DIGITARO_TENANT_ID,
        workerId,
        lastWorkingDay: pastLwd,
        status: SeparationCaseStatus.CLEARED,
        reason: 'Resignation',
        worker: { id: workerId } as WorkerEntity,
        clearanceItems: [
          { ...items[0], status: ClearanceItemStatus.CLEARED },
        ] as ClearanceItemEntity[],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as SeparationCaseEntity);

    dataSource.transaction.mockImplementation(
      async (cb: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          save: jest.fn(async (_e: unknown, data: unknown) => data),
          find: jest
            .fn()
            .mockResolvedValue([
              { ...items[0], status: ClearanceItemStatus.CLEARED },
            ]),
        };
        return cb(manager);
      },
    );

    await service.clearItem(
      separationId,
      'c-hr',
      {},
      { userId: 'ops-user', correlationId: 'corr-archive' },
    );

    expect(onboardingService.disableEntraAccount).toHaveBeenCalledWith(
      workerId,
      expect.objectContaining({ userId: 'ops-user' }),
    );
    expect(workerService.archive).toHaveBeenCalledWith(
      workerId,
      'ops-user',
      'corr-archive',
      undefined,
      DIGITARO_TENANT_ID,
    );
    expect(separationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: SeparationCaseStatus.ARCHIVED }),
    );
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'separation.archived',
        entityId: separationId,
        correlationId: 'corr-archive',
      }),
    );
  });
});
