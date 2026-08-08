import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { ForbiddenException } from '@nestjs/common';

export type WorkerScopeTarget = {
  id: string;
  managerId: string | null;
  divisionId: string | null;
};

export function canAccessWorkerPerformance(
  auth: PolarisAuthContext,
  actingWorkerId: string | null,
  target: WorkerScopeTarget,
): boolean {
  if (auth.broadestScope === ScopeType.ALL) {
    return true;
  }

  for (const assignment of auth.assignments) {
    switch (assignment.scopeType) {
      case ScopeType.ALL:
        return true;
      case ScopeType.DIVISION:
        if (assignment.scopeId && target.divisionId === assignment.scopeId) {
          return true;
        }
        break;
      case ScopeType.TEAM:
        if (actingWorkerId && target.managerId === actingWorkerId) {
          return true;
        }
        break;
      case ScopeType.OWN:
        if (actingWorkerId && target.id === actingWorkerId) {
          return true;
        }
        break;
      default:
        break;
    }
  }

  return false;
}

export function assertWorkerPerformanceAccess(
  auth: PolarisAuthContext,
  actingWorkerId: string | null,
  target: WorkerScopeTarget,
): void {
  if (!canAccessWorkerPerformance(auth, actingWorkerId, target)) {
    throw new ForbiddenException({
      code: 'PERFORMANCE_ACCESS_DENIED',
      message: 'You do not have access to this performance record',
    });
  }
}

export function isPeopleOpsOrAdmin(auth: PolarisAuthContext): boolean {
  return auth.roleCodes.some((code) =>
    ['people_ops', 'super_admin', 'division_head'].includes(code),
  );
}
