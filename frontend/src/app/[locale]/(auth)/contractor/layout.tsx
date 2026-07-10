'use client';

import { ContractorTabs } from '@/components/contractor/ContractorTabs';
import { RequireRole } from '@/components/shared/RequireRole';

export default function ContractorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="contractor" redirectTo="/hub">
      <div className="mx-auto max-w-3xl space-y-4 pb-16 lg:pb-0">
        <ContractorTabs />
        {children}
      </div>
    </RequireRole>
  );
}
