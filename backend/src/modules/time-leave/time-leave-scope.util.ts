import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { ForbiddenException } from '@nestjs/common';

export type WorkerScopeTarget = {
  id: string;
  managerId: string | null;
  divisionId: string | null;
};

export function canAccessWorkerRecord(
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

export function assertWorkerRecordAccess(
  auth: PolarisAuthContext,
  actingWorkerId: string | null,
  target: WorkerScopeTarget,
): void {
  if (!canAccessWorkerRecord(auth, actingWorkerId, target)) {
    throw new ForbiddenException({
      code: 'TIME_LEAVE_ACCESS_DENIED',
      message: 'You do not have access to this time/leave record',
    });
  }
}

export function isPeopleOpsOrAdmin(auth: PolarisAuthContext): boolean {
  return auth.roleCodes.some((code) =>
    ['people_ops', 'super_admin', 'division_head'].includes(code),
  );
}

export function workDateInTimezone(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function countInclusiveDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

export function decimalToNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number.parseFloat(value);
}

export function toDecimalString(value: number): string {
  return value.toFixed(2);
}
