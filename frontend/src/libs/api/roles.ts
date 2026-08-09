import { apiRequest } from '@/libs/api/client';

export type PolarisRole = {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
};

export type UserRoleAssignment = {
  id: string;
  userId: string;
  roleId: string;
  scopeType: string;
  scopeId?: string | null;
  scopeCountryCode?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  assignedBy?: string | null;
  createdAt?: string;
  userEmail?: string | null;
  userName?: string | null;
  roleCode?: string | null;
  roleName?: string | null;
};

export type AssignableUser = {
  userId: string;
  email: string;
  name: string;
  workerId: string | null;
};

export type CreateUserRoleInput = {
  userId: string;
  roleId: string;
  scopeType?: string;
  scopeId?: string | null;
  scopeCountryCode?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

const ROLES_BASE = '/api/v1/roles';
const USER_ROLES_BASE = '/api/v1/user-roles';

export async function listRoles() {
  return apiRequest<PolarisRole[]>(ROLES_BASE);
}

export async function listUserRoles(params?: {
  userId?: string;
  roleId?: string;
  activeOnly?: boolean;
}) {
  return apiRequest<UserRoleAssignment[]>(USER_ROLES_BASE, {
    params: {
      userId: params?.userId,
      roleId: params?.roleId,
      activeOnly:
        params?.activeOnly === undefined
          ? undefined
          : params.activeOnly
            ? 'true'
            : 'false',
    },
  });
}

export async function listAssignableUsers() {
  return apiRequest<AssignableUser[]>(`${USER_ROLES_BASE}/assignable-users`);
}

export async function createUserRole(input: CreateUserRoleInput) {
  return apiRequest<UserRoleAssignment>(USER_ROLES_BASE, {
    method: 'POST',
    body: input,
  });
}

export async function revokeUserRole(id: string) {
  return apiRequest<UserRoleAssignment>(`${USER_ROLES_BASE}/${id}`, {
    method: 'DELETE',
  });
}
