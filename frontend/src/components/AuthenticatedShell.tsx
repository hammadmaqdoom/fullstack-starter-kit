'use client';

import { LogIn, Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { CommandPalette } from '@/components/nav/CommandPalette';
import { PolicyAckGate } from '@/components/policies/PolicyAckGate';
import { MobileTabBar } from '@/components/nav/MobileTabBar';
import { ServiceWorkerRegistration } from '@/components/providers/ServiceWorkerRegistration';
import { usePolarisShell } from '@/libs/hooks/usePolarisShell';
import { Link } from '@/libs/I18nNavigation';

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('AppSidebar');
  const tShell = useTranslations('AuthenticatedShell');
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
          <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-gray-200 bg-white px-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden"
              aria-label={t('open_menu')}
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <span className="text-sm font-semibold text-gray-900 lg:hidden">
              {t('workspace_name')}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {showCheckIn && (
                <Link
                  href="/employee/home"
                  className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                >
                  <LogIn className="size-3.5" aria-hidden />
                  {tShell('check_in')}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="hidden items-center gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50 lg:inline-flex"
                aria-label={t('quick_actions')}
              >
                <span>{tShell('search')}</span>
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1 text-[10px]">
                  ⌘K
                </kbd>
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto px-4 py-6 pb-20 lg:px-8 lg:py-8 lg:pb-8">
            {children}
          </main>
          <MobileTabBar />
        </div>
      </div>
    </PolicyAckGate>
  );
}
