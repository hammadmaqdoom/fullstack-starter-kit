import { Injectable } from '@nestjs/common';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import {
  PolarisAuthContext,
  ScopedResourceTarget,
} from '@/modules/compliance/types/rbac.type';

@Injectable()
export class RowScopeService {
  canAccess(
    context: PolarisAuthContext,
    target: ScopedResourceTarget,
    actingWorkerId?: string | null,
  ): boolean {
    for (const assignment of context.assignments) {
      if (this.assignmentCanAccess(assignment.scopeType, assignment.scopeId, {
        target,
        actingWorkerId,
      })) {
        return true;
      }
    }

    return false;
  }

  meetsMinimumScope(
    context: PolarisAuthContext,
    requiredScope: ScopeType,
  ): boolean {
    const breadth = {
      [ScopeType.OWN]: 1,
      [ScopeType.TEAM]: 2,
      [ScopeType.DIVISION]: 3,
      [ScopeType.ALL]: 4,
    };

    return breadth[context.broadestScope] >= breadth[requiredScope];
  }

  private assignmentCanAccess(
    scopeType: ScopeType,
    scopeId: string | null,
    params: {
      target: ScopedResourceTarget;
      actingWorkerId?: string | null;
    },
  ): boolean {
    const { target, actingWorkerId } = params;

    switch (scopeType) {
      case ScopeType.ALL:
        return true;
      case ScopeType.DIVISION:
        return Boolean(
          scopeId && target.divisionId && scopeId === target.divisionId,
        );
      case ScopeType.TEAM:
        if (target.teamWorkerIds?.includes(target.workerId)) {
          return true;
        }
        return Boolean(
          actingWorkerId &&
            target.managerWorkerId &&
            actingWorkerId === target.managerWorkerId,
        );
      case ScopeType.OWN:
        return Boolean(
          actingWorkerId && actingWorkerId === target.workerId,
        );
      default:
        return false;
    }
  }
}
