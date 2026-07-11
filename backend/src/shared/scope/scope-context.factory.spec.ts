import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScopeContextFactory } from './scope-context.factory';

describe('ScopeContextFactory', () => {
  let factory: ScopeContextFactory;
  let repository: jest.Mocked<
    Pick<Repository<WorkerEntity>, 'findOne' | 'find'>
  >;

  const baseContext = (
    assignments: PolarisAuthContext['assignments'],
    broadestScope: ScopeType,
  ): PolarisAuthContext => ({
    tenantId: 'tenant-1',
    userId: 'user-1',
    roleCodes: assignments.map((assignment) => assignment.roleCode),
    assignments,
    broadestScope,
  });

  beforeEach(async () => {
    repository = { findOne: jest.fn(), find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopeContextFactory,
        { provide: getRepositoryToken(WorkerEntity), useValue: repository },
      ],
    }).compile();

    factory = module.get(ScopeContextFactory);
  });

  it('returns a tenant-only context for ALL scope without querying workers', async () => {
    const auth = baseContext(
      [
        {
          roleId: 'role-1',
          roleCode: PolarisRoleCode.PEOPLE_OPS,
          scopeType: ScopeType.ALL,
          scopeId: null,
        },
      ],
      ScopeType.ALL,
    );

    const context = await factory.build(auth, 'worker-1');

    expect(context).toEqual({ tenantId: 'tenant-1' });
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('resolves division, department, legal entity and country from the acting worker', async () => {
    const auth = baseContext(
      [
        {
          roleId: 'role-1',
          roleCode: PolarisRoleCode.DIVISION_HEAD,
          scopeType: ScopeType.DIVISION,
          scopeId: 'division-labs',
        },
      ],
      ScopeType.DIVISION,
    );
    repository.findOne.mockResolvedValue({
      id: 'worker-1',
      legalEntityId: 'entity-pk',
      departmentId: 'dept-eng',
      countryCode: 'PK',
      divisionId: 'division-labs',
    } as WorkerEntity);

    const context = await factory.build(auth, 'worker-1');

    expect(context).toEqual({
      tenantId: 'tenant-1',
      divisionId: 'division-labs',
      legalEntityId: 'entity-pk',
      departmentId: 'dept-eng',
      countryCode: 'PK',
    });
  });

  it('resolves teamWorkerIds (including self) for team scope', async () => {
    const auth = baseContext(
      [
        {
          roleId: 'role-1',
          roleCode: PolarisRoleCode.MANAGER,
          scopeType: ScopeType.TEAM,
          scopeId: null,
        },
      ],
      ScopeType.TEAM,
    );
    repository.findOne.mockResolvedValue({
      id: 'manager-1',
      legalEntityId: null,
      departmentId: null,
      countryCode: null,
      divisionId: null,
    } as unknown as WorkerEntity);
    repository.find.mockResolvedValue([
      { id: 'report-1' },
      { id: 'report-2' },
    ] as WorkerEntity[]);

    const context = await factory.build(auth, 'manager-1');

    expect(context.teamWorkerIds).toEqual([
      'manager-1',
      'report-1',
      'report-2',
    ]);
  });
});
