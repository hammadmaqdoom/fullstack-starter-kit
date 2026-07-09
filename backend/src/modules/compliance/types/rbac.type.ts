import { ScopeType } from '../enums/scope-type.enum';

export interface RoleAssignmentContext {
  roleId: string;
  roleCode: string;
  scopeType: ScopeType;
  scopeId: string | null;
}

export interface PolarisAuthContext {
  tenantId: string;
  userId: string;
  roleCodes: string[];
  assignments: RoleAssignmentContext[];
  broadestScope: ScopeType;
}

export interface ScopedResourceTarget {
  workerId: string;
  divisionId?: string | null;
  managerWorkerId?: string | null;
  teamWorkerIds?: string[];
}
