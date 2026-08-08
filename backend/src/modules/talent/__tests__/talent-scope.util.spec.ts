import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import {
  assertWorkerPerformanceAccess,
  canAccessWorkerPerformance,
} from '../talent-scope.util';

describe('talent-scope.util', () => {
  const ownAuth: PolarisAuthContext = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    roleCodes: ['employee'],
    assignments: [
      {
        roleId: 'r1',
        roleCode: 'employee',
        scopeType: ScopeType.OWN,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.OWN,
  };

  const managerAuth: PolarisAuthContext = {
    tenantId: 'tenant-1',
    userId: 'user-2',
    roleCodes: ['manager'],
    assignments: [
      {
        roleId: 'r2',
        roleCode: 'manager',
        scopeType: ScopeType.TEAM,
        scopeId: null,
      },
    ],
    broadestScope: ScopeType.TEAM,
  };

  it('allows own worker access', () => {
    expect(
      canAccessWorkerPerformance(ownAuth, 'worker-a', {
        id: 'worker-a',
        managerId: null,
        divisionId: null,
      }),
    ).toBe(true);
  });

  it('denies access to another worker for own scope', () => {
    expect(
      canAccessWorkerPerformance(ownAuth, 'worker-a', {
        id: 'worker-b',
        managerId: null,
        divisionId: null,
      }),
    ).toBe(false);
  });

  it('allows manager access to direct report', () => {
    expect(
      canAccessWorkerPerformance(managerAuth, 'manager-a', {
        id: 'report-1',
        managerId: 'manager-a',
        divisionId: null,
      }),
    ).toBe(true);
  });

  it('throws when access denied', () => {
    expect(() =>
      assertWorkerPerformanceAccess(ownAuth, 'worker-a', {
        id: 'worker-b',
        managerId: null,
        divisionId: null,
      }),
    ).toThrow();
  });
});
