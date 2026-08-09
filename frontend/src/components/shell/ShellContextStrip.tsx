'use client';

import type { GeolocationLabelStatus } from '@/libs/hooks/useGeolocationLabel';
import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = {
  dateLabel: string;
  locationLabel: string | null;
  locationStatus: GeolocationLabelStatus;
  onRetryLocation: () => void;
};

export function ShellContextStrip({
  dateLabel,
  locationLabel,
  locationStatus,
  onRetryLocation,
}: Props) {
  const t = useTranslations('AuthenticatedShell');

  const showUnavailable = locationStatus === 'unavailable';
  const showLocation = locationStatus === 'ready' && locationLabel;

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs text-gray-600">
      <span className="shrink-0 font-medium text-gray-900">{dateLabel}</span>
      <span className="text-gray-300" aria-hidden>
        ·
      </span>
      {showLocation
        ? (
            <span className="flex min-w-0 items-center gap-1 truncate">
              <MapPin className="size-3 shrink-0 text-gray-400" aria-hidden />
              <span className="truncate">{locationLabel}</span>
            </span>
          )
        : showUnavailable
          ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-gray-400">{t('location_unavailable')}</span>
                <button
                  type="button"
                  onClick={onRetryLocation}
                  className="shrink-0 text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
                >
                  {t('retry_location')}
                </button>
              </span>
            )
          : (
              <span className="truncate text-gray-300" aria-hidden>
                …
              </span>
            )}
    </div>
  );
}
