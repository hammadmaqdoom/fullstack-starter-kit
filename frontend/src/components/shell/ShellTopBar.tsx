'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ShellCheckInCta } from '@/components/shell/ShellCheckInCta';
import { ShellContextStrip } from '@/components/shell/ShellContextStrip';
import { useGeolocationLabel } from '@/libs/hooks/useGeolocationLabel';
import { useTodayAttendance } from '@/libs/hooks/useTodayAttendance';
import { formatHeaderDate, resolveCheckInCta } from '@/libs/shell/shell-topbar.util';

type Props = {
  showCheckIn: boolean;
  onOpenMobileMenu: () => void;
};

export function ShellTopBar({ showCheckIn, onOpenMobileMenu }: Props) {
  const t = useTranslations('AppSidebar');
  const { today } = useTodayAttendance();
  const geo = useGeolocationLabel();
  const ctaModel = showCheckIn ? resolveCheckInCta(today) : { kind: 'hidden' as const };
  const dateLabel = formatHeaderDate(new Date());

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-gray-200 bg-white px-4">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 lg:hidden"
        aria-label={t('open_menu')}
      >
        <Menu className="size-5" aria-hidden />
      </button>
      <span className="text-sm font-semibold text-gray-900 lg:hidden">
        {t('workspace_name')}
      </span>

      <ShellContextStrip
        dateLabel={dateLabel}
        locationLabel={geo.label}
        locationStatus={geo.status}
        onRetryLocation={geo.retry}
      />

      {showCheckIn && (
        <div className="ml-auto shrink-0">
          <ShellCheckInCta model={ctaModel} />
        </div>
      )}
    </header>
  );
}
