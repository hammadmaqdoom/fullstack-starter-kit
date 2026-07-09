import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { RowScopeService } from './row-scope.service';

describe('RowScopeService', () => {
  const service = new RowScopeService();

  const baseContext = (
    assignments: PolarisAuthContext['assignments'],
  ): PolarisAuthContext => ({
    tenantId: 'tenant-1',
    userId: 'user-1',
    roleCodes: assignments.map((assignment) => assignment.roleCode),
    assignments,
    broadestScope: ScopeType.OWN,
  });

  it('allows own scope for the acting worker only', () => {
    const allowed = service.canAccess(
      baseContext([
        {
          roleId: 'role-1',
          roleCode: PolarisRoleCode.EMPLOYEE,
          scopeType: ScopeType.OWN,
          scopeId: null,
        },
      ]),
      { workerId: 'worker-1' },
      'worker-1',
    );

    const denied = service.canAccess(
      baseContext([
        {
          roleId: 'role-1',
          roleCode: PolarisRoleCode.EMPLOYEE,
          scopeType: ScopeType.OWN,
          scopeId: null,
        },
      ]),
      { workerId: 'worker-2' },
      'worker-1',
    );

    expect(allowed).toBe(true);
    expect(denied).toBe(false);
  });

  it('allows team scope for direct reports and configured team members', () => {
    const context = baseContext([
      {
        roleId: 'role-1',
        roleCode: PolarisRoleCode.MANAGER,
        scopeType: ScopeType.TEAM,
        scopeId: null,
      },
    ]);

    expect(
      service.canAccess(
        context,
        { workerId: 'report-1', managerWorkerId: 'manager-1' },
        'manager-1',
      ),
    ).toBe(true);

    expect(
      service.canAccess(
        context,
        {
          workerId: 'report-2',
          teamWorkerIds: ['report-2', 'report-3'],
        },
        'manager-1',
      ),
    ).toBe(true);

    expect(
      service.canAccess(
        context,
        { workerId: 'other-worker' },
        'manager-1',
      ),
    ).toBe(false);
  });

  it('allows division scope only within the assigned division', () => {
    const context = baseContext([
      {
        roleId: 'role-1',
        roleCode: PolarisRoleCode.DIVISION_HEAD,
        scopeType: ScopeType.DIVISION,
        scopeId: 'division-labs',
      },
    ]);

    expect(
      service.canAccess(context, {
        workerId: 'worker-1',
        divisionId: 'division-labs',
      }),
    ).toBe(true);

    expect(
      service.canAccess(context, {
        workerId: 'worker-2',
        divisionId: 'division-studio',
      }),
    ).toBe(false);
  });

  it('allows all scope for any target worker', () => {
    const context = baseContext([
      {
        roleId: 'role-1',
        roleCode: PolarisRoleCode.PEOPLE_OPS,
        scopeType: ScopeType.ALL,
        scopeId: null,
      },
    ]);

    expect(
      service.canAccess(context, { workerId: 'any-worker-id' }),
    ).toBe(true);
  });

  it('evaluates minimum scope breadth', () => {
    const teamContext: PolarisAuthContext = {
      ...baseContext([
        {
          roleId: 'role-1',
          roleCode: PolarisRoleCode.MANAGER,
          scopeType: ScopeType.TEAM,
          scopeId: null,
        },
      ]),
      broadestScope: ScopeType.TEAM,
    };

    expect(service.meetsMinimumScope(teamContext, ScopeType.OWN)).toBe(true);
    expect(service.meetsMinimumScope(teamContext, ScopeType.TEAM)).toBe(true);
    expect(service.meetsMinimumScope(teamContext, ScopeType.ALL)).toBe(false);
  });
});
