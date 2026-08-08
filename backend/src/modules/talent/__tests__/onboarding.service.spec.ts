import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OnboardingCaseEntity } from '../entities/onboarding-case.entity';
import { OnboardingTaskEntity } from '../entities/onboarding-task.entity';
import { OnboardingTemplateTaskEntity } from '../entities/onboarding-template-task.entity';
import { OnboardingTemplateEntity } from '../entities/onboarding-template.entity';
import { EntraProvisioningService } from '../entra-provisioning.service';
import {
  OnboardingAssigneeRole,
  OnboardingCaseStatus,
  OnboardingTaskStatus,
  OnboardingTemplateStatus,
} from '../enums/onboarding.enum';
import { OnboardingService } from '../onboarding.service';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let templateRepository: jest.Mocked<
    Pick<Repository<OnboardingTemplateEntity>, 'findOne' | 'save'>
  >;
  let caseRepository: jest.Mocked<
    Pick<Repository<OnboardingCaseEntity>, 'findOne'>
  >;
  let taskRepository: jest.Mocked<
    Pick<Repository<OnboardingTaskEntity>, 'findOne'>
  >;
  let workerRepository: jest.Mocked<Pick<Repository<WorkerEntity>, 'findOne'>>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let dataSource: { transaction: jest.Mock };
  let entraProvisioningService: {
    scheduleProvision: jest.Mock;
    disableAccount: jest.Mock;
  };

  const workerId = 'w0000000-0000-4000-8000-000000000001';
  const templateId = 't0000000-0000-4000-8000-000000000001';
  const templateTaskId = 'tt000000-0000-4000-8000-000000000001';
  const caseId = 'c0000000-0000-4000-8000-000000000001';
  const taskId = 'task0000-0000-4000-8000-000000000001';

  const peopleOpsAuth = {
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
  };

  const publishedTemplate: OnboardingTemplateEntity = {
    id: templateId,
    tenantId: DIGITARO_TENANT_ID,
    name: 'Day-1 Standard',
    countryCode: null,
    employmentTypeId: null,
    version: 1,
    status: OnboardingTemplateStatus.PUBLISHED,
    tasks: [
      {
        id: templateTaskId,
        templateId,
        title: 'Verify profile',
        assigneeRole: OnboardingAssigneeRole.EMPLOYEE,
        sortOrder: 0,
        isRequired: true,
        dueOffsetDays: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OnboardingTemplateTaskEntity,
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    templateRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    caseRepository = {
      findOne: jest.fn(),
    };
    taskRepository = {
      findOne: jest.fn(),
    };
    workerRepository = {
      findOne: jest.fn(),
    };
    auditLogService = { append: jest.fn() };
    entraProvisioningService = {
      scheduleProvision: jest.fn().mockResolvedValue(null),
      disableAccount: jest
        .fn()
        .mockResolvedValue({ success: false, reason: 'not_configured' }),
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
                  id: `saved-${index}`,
                }));
              }
              return {
                ...(data as object),
                id: caseId,
              };
            }),
            find: jest.fn(),
            findOne: jest.fn(),
          };
          return cb(manager);
        },
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: getRepositoryToken(OnboardingTemplateEntity),
          useValue: templateRepository,
        },
        {
          provide: getRepositoryToken(OnboardingCaseEntity),
          useValue: caseRepository,
        },
        {
          provide: getRepositoryToken(OnboardingTaskEntity),
          useValue: taskRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        {
          provide: RbacService,
          useValue: {
            getAuthContext: jest.fn().mockResolvedValue(peopleOpsAuth),
          },
        },
        { provide: DataSource, useValue: dataSource },
        {
          provide: EntraProvisioningService,
          useValue: entraProvisioningService,
        },
      ],
    }).compile();

    service = module.get(OnboardingService);
  });

  it('creates onboarding case by cloning template tasks', async () => {
    workerRepository.findOne.mockResolvedValue({
      id: workerId,
    } as WorkerEntity);
    templateRepository.findOne
      .mockResolvedValueOnce(publishedTemplate)
      .mockResolvedValueOnce({
        ...publishedTemplate,
        id: templateId,
      } as OnboardingTemplateEntity);

    const createdCase: OnboardingCaseEntity = {
      id: caseId,
      tenantId: DIGITARO_TENANT_ID,
      workerId,
      templateId,
      status: OnboardingCaseStatus.IN_PROGRESS,
      startDate: '2026-07-15',
      tasks: [
        {
          id: 'saved-0',
          caseId,
          templateTaskId,
          status: OnboardingTaskStatus.PENDING,
          assigneeWorkerId: null,
          completedAt: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as OnboardingTaskEntity,
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    caseRepository.findOne.mockResolvedValue(createdCase);

    const result = await service.createCase(
      {
        workerId,
        templateId,
        startDate: '2026-07-15',
      },
      { userId: 'ops-user', correlationId: 'corr-1' },
    );

    expect(result.id).toBe(caseId);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks?.[0].templateTaskId).toBe(templateTaskId);
    expect(dataSource.transaction).toHaveBeenCalled();
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'onboarding.case.create',
        entityId: caseId,
        correlationId: 'corr-1',
      }),
    );
    expect(entraProvisioningService.scheduleProvision).toHaveBeenCalledWith(
      workerId,
      '2026-07-15',
      expect.objectContaining({ userId: 'ops-user' }),
    );
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'onboarding.documents.auto_generate',
      }),
    );
  });

  it('completes required task and marks case complete with audit', async () => {
    const onboardingCase: OnboardingCaseEntity = {
      id: caseId,
      tenantId: DIGITARO_TENANT_ID,
      workerId,
      templateId,
      status: OnboardingCaseStatus.IN_PROGRESS,
      startDate: '2026-07-15',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const pendingTask: OnboardingTaskEntity = {
      id: taskId,
      caseId,
      templateTaskId,
      status: OnboardingTaskStatus.PENDING,
      assigneeWorkerId: null,
      completedAt: null,
      notes: null,
      onboardingCase,
      templateTask: {
        id: templateTaskId,
        templateId,
        title: 'Verify profile',
        assigneeRole: OnboardingAssigneeRole.EMPLOYEE,
        sortOrder: 0,
        isRequired: true,
        dueOffsetDays: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OnboardingTemplateTaskEntity,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    taskRepository.findOne.mockResolvedValue(pendingTask);

    dataSource.transaction.mockImplementation(
      async (cb: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          create: jest.fn((_entity: unknown, data: unknown) => data),
          save: jest.fn(async (_entity: unknown, data: unknown) => data),
          find: jest.fn().mockResolvedValue([
            {
              ...pendingTask,
              status: OnboardingTaskStatus.DONE,
            },
          ]),
          findOne: jest.fn().mockResolvedValue({ ...onboardingCase }),
        };
        return cb(manager);
      },
    );

    caseRepository.findOne.mockResolvedValue({
      ...onboardingCase,
      status: OnboardingCaseStatus.COMPLETE,
      tasks: [{ ...pendingTask, status: OnboardingTaskStatus.DONE }],
    });

    const result = await service.completeTask(
      taskId,
      { notes: 'Done' },
      { userId: 'ops-user', correlationId: 'corr-2' },
    );

    expect(result.status).toBe(OnboardingCaseStatus.COMPLETE);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'onboarding.case.complete',
        entityType: 'onboarding_case',
        entityId: caseId,
      }),
    );
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'onboarding.task.complete',
        entityId: taskId,
      }),
    );
  });
});
