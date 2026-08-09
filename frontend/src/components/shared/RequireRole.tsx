'use client';

import type { RequiredPolarisRole } from '@/libs/hooks/useRequireRole';
import { Skeleton } from 'primereact/skeleton';
import { useRequireRole } from '@/libs/hooks/useRequireRole';

type RequireRoleProps = {
  role: RequiredPolarisRole;
  redirectTo?: string;
  children: React.ReactNode;
};

/** Client-side layout gate; API still enforces authorization. */
export function RequireRole({ role, redirectTo = '/hub', children }: RequireRoleProps) {
  const { isChecking, isAllowed } = useRequireRole(role, redirectTo);

  if (isChecking) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4" aria-busy="true">
        <Skeleton height="2rem" width="40%" />
        <Skeleton height="12rem" className="w-full" />
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
