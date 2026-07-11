import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
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
      service.canAccess(context, { workerId: 'other-worker' }, 'manager-1'),
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

  it('allows HRBP country scope only within the assigned country', () => {
    const context = baseContext([
      {
        roleId: 'role-1',
        roleCode: PolarisRoleCode.HRBP,
        scopeType: ScopeType.COUNTRY,
        scopeId: null,
        scopeCountryCode: 'PK',
      },
    ]);

    expect(
      service.canAccess(context, {
        workerId: 'worker-1',
        countryCode: 'PK',
      }),
    ).toBe(true);

    expect(
      service.canAccess(context, {
        workerId: 'worker-2',
        countryCode: 'AE',
      }),
    ).toBe(false);
  });

  it('allows HRBP legal-entity scope only within the assigned legal entity', () => {
    const context = baseContext([
      {
        roleId: 'role-1',
        roleCode: PolarisRoleCode.HRBP,
        scopeType: ScopeType.LEGAL_ENTITY,
        scopeId: 'legal-entity-1',
      },
    ]);

    expect(
      service.canAccess(context, {
        workerId: 'worker-1',
        legalEntityId: 'legal-entity-1',
      }),
    ).toBe(true);

    expect(
      service.canAccess(context, {
        workerId: 'worker-2',
        legalEntityId: 'legal-entity-2',
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

    expect(service.canAccess(context, { workerId: 'any-worker-id' })).toBe(
      true,
    );
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

  describe('isWithinScopeContext', () => {
    it('allows any target when the context is unscoped (all)', () => {
      expect(
        service.isWithinScopeContext(
          { tenantId: 'tenant-1' },
          { workerId: 'worker-1', divisionId: 'division-studio' },
        ),
      ).toBe(true);
    });

    it('denies targets outside the scoped division', () => {
      const context = { tenantId: 'tenant-1', divisionId: 'division-labs' };

      expect(
        service.isWithinScopeContext(context, {
          divisionId: 'division-labs',
        }),
      ).toBe(true);
      expect(
        service.isWithinScopeContext(context, {
          divisionId: 'division-studio',
        }),
      ).toBe(false);
    });

    it('denies workers outside the resolved team', () => {
      const context = {
        tenantId: 'tenant-1',
        teamWorkerIds: ['manager-1', 'report-1'],
      };

      expect(
        service.isWithinScopeContext(context, { workerId: 'report-1' }),
      ).toBe(true);
      expect(
        service.isWithinScopeContext(context, { workerId: 'report-2' }),
      ).toBe(false);
    });
  });
});
