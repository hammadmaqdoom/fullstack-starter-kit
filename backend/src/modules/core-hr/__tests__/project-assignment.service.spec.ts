import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { ProjectAssignmentEntity } from '@/modules/core-hr/entities/project-assignment.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ProjectAssignmentService } from '@/modules/core-hr/project-assignment.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

describe('ProjectAssignmentService', () => {
  let service: ProjectAssignmentService;
  let assignmentRepository: jest.Mocked<
    Pick<
      Repository<ProjectAssignmentEntity>,
      'create' | 'save' | 'findOne' | 'remove' | 'createQueryBuilder'
    >
  >;
  let workerRepository: jest.Mocked<
    Pick<Repository<WorkerEntity>, 'find' | 'findOne'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let getAuthContext: jest.Mock;

  const workerId = 'w0000000-0000-4000-8000-000000000010';

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

  beforeEach(async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    } as unknown as SelectQueryBuilder<ProjectAssignmentEntity>;

    assignmentRepository = {
      create: jest.fn((entity) => entity as ProjectAssignmentEntity),
      save: jest.fn(
        async (entity) =>
          ({
            ...entity,
            id: 'assign-1',
          }) as ProjectAssignmentEntity,
      ),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as typeof assignmentRepository;

    workerRepository = {
      find: jest.fn().mockResolvedValue([{ id: workerId } as WorkerEntity]),
      findOne: jest.fn(),
    };

    auditLogService = { append: jest.fn() };
    getAuthContext = jest.fn().mockResolvedValue(peopleOpsAuth);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectAssignmentService,
        {
          provide: getRepositoryToken(ProjectAssignmentEntity),
          useValue: assignmentRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: { getAuthContext } },
      ],
    }).compile();

    service = module.get(ProjectAssignmentService);
  });

  it('creates a project assignment and writes an audit log entry', async () => {
    const result = await service.create(
      { workerId, projectName: 'Polaris Rollout', effectiveFrom: '2026-01-01' },
      'ops-user',
      'corr-1',
    );

    expect(result.id).toBe('assign-1');
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'project_assignment.create',
        entityType: 'project_assignment',
        correlationId: 'corr-1',
      }),
    );
  });

  it('rejects effectiveTo before effectiveFrom', async () => {
    await expect(
      service.create(
        {
          workerId,
          projectName: 'Polaris Rollout',
          effectiveFrom: '2026-06-01',
          effectiveTo: '2026-01-01',
        },
        'ops-user',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('denies mutation for non People-Ops roles', async () => {
    getAuthContext.mockResolvedValue({
      ...peopleOpsAuth,
      roleCodes: [PolarisRoleCode.EMPLOYEE],
      broadestScope: ScopeType.OWN,
    });

    await expect(
      service.create(
        {
          workerId,
          projectName: 'Polaris Rollout',
          effectiveFrom: '2026-01-01',
        },
        'employee-user',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('removes an assignment and writes an audit log entry', async () => {
    assignmentRepository.findOne.mockResolvedValue({
      id: 'assign-1',
      tenantId: DIGITARO_TENANT_ID,
      workerId,
      projectName: 'Polaris Rollout',
      projectCode: null,
      projectLeadId: null,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
    } as ProjectAssignmentEntity);

    await service.remove('assign-1', 'ops-user');

    expect(assignmentRepository.remove).toHaveBeenCalled();
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'project_assignment.delete' }),
    );
  });
});
