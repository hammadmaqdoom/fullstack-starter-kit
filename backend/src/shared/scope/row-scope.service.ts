import { SCOPE_BREADTH, ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import {
  PolarisAuthContext,
  ScopedResourceTarget,
} from '@/modules/compliance/types/rbac.type';
import { Injectable } from '@nestjs/common';
import { ScopeContext } from './scope-context.type';

@Injectable()
export class RowScopeService {
  /**
   * ScopeContext-aware access check (enterprise-readiness.md §3.1). Additive
   * alternative to `canAccess()` for callers that already resolved a
   * `ScopeContext` (e.g. via `ScopeContextFactory`) — `all` scope (empty
   * context) always passes; otherwise every populated context field must
   * match the target, and team scope requires the target worker id to be in
   * `teamWorkerIds`.
   */
  isWithinScopeContext(
    context: ScopeContext,
    target: {
      workerId?: string;
      divisionId?: string | null;
      legalEntityId?: string | null;
      departmentId?: string | null;
      countryCode?: string | null;
    },
  ): boolean {
    const isUnscoped =
      !context.divisionId &&
      !context.legalEntityId &&
      !context.departmentId &&
      !context.countryCode &&
      !context.teamWorkerIds;
    if (isUnscoped) {
      return true;
    }

    if (
      context.divisionId &&
      target.divisionId &&
      context.divisionId !== target.divisionId
    ) {
      return false;
    }
    if (
      context.legalEntityId &&
      target.legalEntityId &&
      context.legalEntityId !== target.legalEntityId
    ) {
      return false;
    }
    if (
      context.departmentId &&
      target.departmentId &&
      context.departmentId !== target.departmentId
    ) {
      return false;
    }
    if (
      context.countryCode &&
      target.countryCode &&
      context.countryCode !== target.countryCode
    ) {
      return false;
    }
    if (
      context.teamWorkerIds &&
      target.workerId &&
      !context.teamWorkerIds.includes(target.workerId)
    ) {
      return false;
    }

    return true;
  }

  canAccess(
    context: PolarisAuthContext,
    target: ScopedResourceTarget,
    actingWorkerId?: string | null,
  ): boolean {
    for (const assignment of context.assignments) {
      if (
        this.assignmentCanAccess(
          assignment.scopeType,
          assignment.scopeId,
          {
            target,
            actingWorkerId,
          },
          assignment.scopeCountryCode,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  meetsMinimumScope(
    context: PolarisAuthContext,
    requiredScope: ScopeType,
  ): boolean {
    return (
      SCOPE_BREADTH[context.broadestScope] >= SCOPE_BREADTH[requiredScope]
    );
  }

  private assignmentCanAccess(
    scopeType: ScopeType,
    scopeId: string | null,
    params: {
      target: ScopedResourceTarget;
      actingWorkerId?: string | null;
    },
    scopeCountryCode?: string | null,
  ): boolean {
    const { target, actingWorkerId } = params;

    switch (scopeType) {
      case ScopeType.ALL:
        return true;
      case ScopeType.COUNTRY:
        return Boolean(
          scopeCountryCode &&
            target.countryCode &&
            scopeCountryCode === target.countryCode,
        );
      case ScopeType.LEGAL_ENTITY:
        return Boolean(
          scopeId && target.legalEntityId && scopeId === target.legalEntityId,
        );
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
        return Boolean(actingWorkerId && actingWorkerId === target.workerId);
      default:
        return false;
    }
  }
}
