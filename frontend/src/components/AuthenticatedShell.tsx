'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AppSidebar } from '@/components/AppSidebar';

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('AppSidebar');
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-white text-gray-900 antialiased">
      <AppSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
            aria-label={t('open_menu')}
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <span className="ml-3 text-sm font-semibold text-gray-900">{t('workspace_name')}</span>
        </header>
        <main className="flex-1 overflow-auto px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
