'use client';

import { useState } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { CommandPalette } from '@/components/nav/CommandPalette';
import { PolicyAckGate } from '@/components/policies/PolicyAckGate';
import { MobileTabBar } from '@/components/nav/MobileTabBar';
import { ServiceWorkerRegistration } from '@/components/providers/ServiceWorkerRegistration';
import { ShellTopBar } from '@/components/shell/ShellTopBar';
import { usePolarisShell } from '@/libs/hooks/usePolarisShell';

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { shell } = usePolarisShell();

  const showCheckIn
    = shell?.primaryLayout === 'employee' || shell?.primaryLayout === 'manager';

  return (
    <PolicyAckGate>
      <ServiceWorkerRegistration />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <div className="flex min-h-screen bg-white text-gray-900 antialiased">
        <AppSidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onOpenCommandPalette={() => setCommandOpen(true)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <ShellTopBar
            showCheckIn={showCheckIn}
            onOpenCommandPalette={() => setCommandOpen(true)}
            onOpenMobileMenu={() => setMobileOpen(true)}
          />
          <main className="flex-1 overflow-auto px-4 py-6 pb-20 lg:px-8 lg:py-8 lg:pb-8">
            {children}
          </main>
          <MobileTabBar />
        </div>
      </div>
    </PolicyAckGate>
  );
}
