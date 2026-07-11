import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { ManagerRelationshipEntity } from '@/modules/core-hr/entities/manager-relationship.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { RelationshipType } from '@/modules/core-hr/enums/org.enum';
import { ManagerRelationshipService } from '@/modules/core-hr/manager-relationship.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

describe('ManagerRelationshipService', () => {
  let service: ManagerRelationshipService;
  let relationshipRepository: jest.Mocked<
    Pick<
      Repository<ManagerRelationshipEntity>,
      'create' | 'save' | 'findOne' | 'remove' | 'createQueryBuilder'
    >
  >;
  let workerRepository: jest.Mocked<
    Pick<Repository<WorkerEntity>, 'find' | 'findOne'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let getAuthContext: jest.Mock;

  const workerId = 'w0000000-0000-4000-8000-000000000010';
  const managerId = 'w0000000-0000-4000-8000-000000000011';

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
    const overlapQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
    } as unknown as SelectQueryBuilder<ManagerRelationshipEntity>;

    relationshipRepository = {
      create: jest.fn((entity) => entity as ManagerRelationshipEntity),
      save: jest.fn(
        async (entity) =>
          ({
            ...entity,
            id: 'rel-1',
          }) as ManagerRelationshipEntity,
      ),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(overlapQb),
    } as unknown as typeof relationshipRepository;

    workerRepository = {
      find: jest
        .fn()
        .mockResolvedValue([
          { id: workerId } as WorkerEntity,
          { id: managerId } as WorkerEntity,
        ]),
      findOne: jest.fn(),
    };

    auditLogService = { append: jest.fn() };
    getAuthContext = jest.fn().mockResolvedValue(peopleOpsAuth);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManagerRelationshipService,
        {
          provide: getRepositoryToken(ManagerRelationshipEntity),
          useValue: relationshipRepository,
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RbacService, useValue: { getAuthContext } },
      ],
    }).compile();

    service = module.get(ManagerRelationshipService);
  });

  it('creates a manager relationship and writes an audit log entry', async () => {
    const result = await service.create(
      { workerId, managerId, effectiveFrom: '2026-01-01' },
      'ops-user',
      'corr-1',
    );

    expect(result.id).toBe('rel-1');
    expect(result.relationshipType).toBe(RelationshipType.DIRECT);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'manager_relationship.create',
        entityType: 'manager_relationship',
        correlationId: 'corr-1',
      }),
    );
  });

  it('rejects a worker managing themselves', async () => {
    await expect(
      service.create(
        { workerId, managerId: workerId, effectiveFrom: '2026-01-01' },
        'ops-user',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects effectiveTo before effectiveFrom', async () => {
    await expect(
      service.create(
        {
          workerId,
          managerId,
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
      roleCodes: [PolarisRoleCode.MANAGER],
      broadestScope: ScopeType.TEAM,
    });

    await expect(
      service.create(
        { workerId, managerId, effectiveFrom: '2026-01-01' },
        'manager-user',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('removes a relationship and writes an audit log entry', async () => {
    relationshipRepository.findOne.mockResolvedValue({
      id: 'rel-1',
      tenantId: DIGITARO_TENANT_ID,
      workerId,
      managerId,
      relationshipType: RelationshipType.DIRECT,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
    } as ManagerRelationshipEntity);

    await service.remove('rel-1', 'ops-user');

    expect(relationshipRepository.remove).toHaveBeenCalled();
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'manager_relationship.delete' }),
    );
  });
});
