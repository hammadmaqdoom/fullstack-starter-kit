'use client';

import { usePolarisShell } from '@/libs/hooks/usePolarisShell';
import { useRouter } from '@/libs/I18nNavigation';
import { useEffect } from 'react';

export type RequiredPolarisRole =
  | 'peopleOps'
  | 'manager'
  | 'finance'
  | 'employee'
  | 'contractor';

export type UseRequireRoleResult = {
  /** True while the shell capabilities request is in flight. */
  isChecking: boolean;
  /** True once shell resolved and the session holds the required role. */
  isAllowed: boolean;
};

function roleAllowed(
  roles: string[],
  primaryLayout: string,
  required: RequiredPolarisRole,
): boolean {
  const normalized = new Set(roles.map((r) => r.toLowerCase()));

  switch (required) {
    case 'peopleOps':
      return (
        normalized.has('people_ops')
        || normalized.has('hrbp')
        || normalized.has('super_admin')
        || primaryLayout === 'people_ops'
        || primaryLayout === 'admin'
      );
    case 'manager':
      return (
        normalized.has('manager')
        || normalized.has('division_head')
        || primaryLayout === 'manager'
        || primaryLayout === 'people_ops'
        || primaryLayout === 'admin'
      );
    case 'finance':
      return (
        normalized.has('finance')
        || normalized.has('super_admin')
        || primaryLayout === 'finance'
        || primaryLayout === 'admin'
      );
    case 'contractor':
      return normalized.has('contractor') || primaryLayout === 'contractor';
    case 'employee':
      return (
        normalized.has('employee')
        || primaryLayout === 'employee'
        || primaryLayout === 'manager'
        || primaryLayout === 'people_ops'
        || primaryLayout === 'admin'
        || primaryLayout === 'finance'
      );
    default:
      return false;
  }
}

/**
 * Client-side route guard for role-scoped sections.
 * Uses `/api/v1/me/shell` (server remains the source of truth on API calls).
 */
export function useRequireRole(
  role: RequiredPolarisRole,
  redirectTo: string = '/hub',
): UseRequireRoleResult {
  const { shell, isLoading } = usePolarisShell();
  const router = useRouter();
  const isAllowed = shell
    ? roleAllowed(shell.roles, shell.primaryLayout, role)
    : false;

  useEffect(() => {
    if (!isLoading && !isAllowed) {
      router.replace(redirectTo);
    }
  }, [isLoading, isAllowed, redirectTo, router]);

  return { isChecking: isLoading, isAllowed };
}
