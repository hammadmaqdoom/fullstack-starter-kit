'use client';

import { useEffect } from 'react';
import { usePolarisNavAccess } from '@/libs/hooks/usePolarisNavAccess';
import { useRouter } from '@/libs/I18nNavigation';

export type RequiredPolarisRole = 'peopleOps' | 'manager' | 'finance' | 'employee' | 'contractor';

export type UseRequireRoleResult = {
  /** True while the role probe is in flight — render a skeleton, never gate on false positives. */
  isChecking: boolean;
  /** True once the probe resolved and the current session holds the required role. */
  isAllowed: boolean;
};

/**
 * Client-side route guard for role-scoped sections (people-ops/*, manager/*, finance/*).
 * Probes API access via `usePolarisNavAccess` (server remains the source of truth —
 * RBAC + row scope are enforced in the repository layer); this only prevents
 * unauthorized users from seeing a role-specific shell before their request 403s.
 * Redirects to `redirectTo` (default `/hub`) once the probe resolves without access.
 */
export function useRequireRole(
  role: RequiredPolarisRole,
  redirectTo: string = '/hub',
): UseRequireRoleResult {
  const access = usePolarisNavAccess();
  const router = useRouter();
  const isAllowed = access[role];

  useEffect(() => {
    if (!access.isLoading && !isAllowed) {
      router.replace(redirectTo);
    }
  }, [access.isLoading, isAllowed, redirectTo, router]);

  return { isChecking: access.isLoading, isAllowed };
}
