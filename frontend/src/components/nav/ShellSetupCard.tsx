'use client';

import type { ShellSetup } from '@/libs/api/shell';
import { Link } from '@/libs/I18nNavigation';
import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ShellSetupCard({
  setup,
  onNavigate,
}: {
  setup: ShellSetup;
  onNavigate?: () => void;
}) {
  const t = useTranslations('AppSidebar');
  const pct =
    setup.totalSteps > 0
      ? Math.min(100, Math.round((setup.completedSteps / setup.totalSteps) * 100))
      : 0;

  return (
    <Link
      href={setup.href}
      onClick={onNavigate}
      className="mb-3 block rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="mb-2 flex items-start gap-2">
        <Settings className="mt-0.5 size-4 shrink-0 text-gray-500" aria-hidden />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-gray-900">{t('setup_title')}</p>
          <p className="mt-0.5 text-[11px] font-medium text-blue-600">
            {t('setup_progress', {
              completed: setup.completedSteps,
              total: setup.totalSteps,
            })}
          </p>
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}
