import { NotFoundException } from '@nestjs/common';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { ScopeType } from '../enums/scope-type.enum';
import { RoleAssignmentService } from '../role-assignment.service';

describe('RoleAssignmentService', () => {
  const OTHER = 'b0000000-0000-4000-8000-000000000099';

  function buildService(overrides?: {
    roleRepo?: Partial<Record<string, jest.Mock>>;
    assignmentRepo?: Partial<Record<string, jest.Mock>>;
    userRepo?: Partial<Record<string, jest.Mock>>;
    workerRepo?: Partial<Record<string, jest.Mock>>;
    audit?: { append: jest.Mock };
  }) {
    const roleRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({
        id: 'role-1',
        tenantId: DIGITARO_TENANT_ID,
        code: 'people_ops',
        name: 'People Ops',
      }),
      ...overrides?.roleRepo,
    };
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const assignmentRepo = {
      find: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'asg-1', ...x })),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      ...overrides?.assignmentRepo,
    };
    const userRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@digitaro.co',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
      ...overrides?.userRepo,
    };
    const workerRepo = {
      find: jest.fn().mockResolvedValue([]),
      ...overrides?.workerRepo,
    };
    const audit = overrides?.audit ?? { append: jest.fn() };

    const service = new RoleAssignmentService(
      roleRepo as never,
      assignmentRepo as never,
      userRepo as never,
      workerRepo as never,
      audit as never,
    );

    return { service, roleRepo, assignmentRepo, userRepo, workerRepo, audit, qb };
  }

  it('lists roles filtered by tenantId', async () => {
    const { service, roleRepo } = buildService();
    await service.listRoles(DIGITARO_TENANT_ID);
    expect(roleRepo.find).toHaveBeenCalledWith({
      where: { tenantId: DIGITARO_TENANT_ID },
      order: { name: 'ASC' },
    });
  });

  it('creates assignment with tenant + audit', async () => {
    const { service, assignmentRepo, audit } = buildService({
      assignmentRepo: {
        findOne: jest.fn().mockResolvedValue({
          id: 'asg-1',
          tenantId: DIGITARO_TENANT_ID,
          userId: 'user-1',
          roleId: 'role-1',
          scopeType: ScopeType.ALL,
          scopeId: null,
          scopeCountryCode: null,
          effectiveFrom: null,
          effectiveTo: null,
          role: { code: 'people_ops', name: 'People Ops' },
          user: { email: 'a@digitaro.co', firstName: 'Ada', lastName: 'Lovelace' },
        }),
        create: jest.fn((x) => x),
        save: jest.fn(async (x) => ({ id: 'asg-1', ...x })),
        createQueryBuilder: jest.fn(),
      },
    });

    const row = await service.createAssignment(
      {
        userId: 'user-1',
        roleId: 'role-1',
        scopeType: ScopeType.ALL,
      },
      'actor-1',
      DIGITARO_TENANT_ID,
    );

    expect(assignmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: DIGITARO_TENANT_ID,
        userId: 'user-1',
        roleId: 'role-1',
        scopeType: ScopeType.ALL,
        assignedBy: 'actor-1',
      }),
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user_role_assignment.create',
        entityType: 'user_role_assignment',
        tenantId: DIGITARO_TENANT_ID,
      }),
    );
    expect(row.id).toBe('asg-1');
  });

  it('rejects getAssignment for wrong tenant', async () => {
    const { service } = buildService({
      assignmentRepo: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
      },
    });

    await expect(service.getAssignment('asg-1', OTHER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists assignments scoped by tenant where clause', async () => {
    const { service, qb } = buildService();
    await service.listAssignments(DIGITARO_TENANT_ID, {});
    expect(qb.where).toHaveBeenCalledWith('assignment.tenantId = :tenantId', {
      tenantId: DIGITARO_TENANT_ID,
    });
  });
});
