'use client';

import type { TeamPunchToday } from '@/libs/api/attendance';
import { StatusChip } from '@/components/shared/StatusChip';
import { AlertCircle, RefreshCw, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';

type TeamAttendanceStripProps = {
  punches: TeamPunchToday[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

function formatCheckIn(iso?: string | null) {
  if (!iso) {
    return null;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function TeamAttendanceStrip({
  punches,
  loading = false,
  error = null,
  onRetry,
}: TeamAttendanceStripProps) {
  const t = useTranslations('ManagerCockpit');

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1" aria-busy="true" aria-label={t('attendance_loading')}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="9rem" height="4.25rem" className="shrink-0 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
        <div className="flex items-center gap-2 text-sm text-red-800">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </div>
        {onRetry && (
          <Button type="button" severity="secondary" size="small" onClick={onRetry} className="gap-2">
            <RefreshCw className="size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        )}
      </div>
    );
  }

  if (punches.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-sm text-gray-500">
        <Users className="size-4 shrink-0" aria-hidden />
        {t('attendance_empty')}
      </div>
    );
  }

  return (
    <ul
      className="flex gap-2 overflow-x-auto pb-1"
      aria-label={t('attendance_title')}
    >
      {punches.map((person) => {
        const checkIn = formatCheckIn(person.checkInAt);
        return (
          <li
            key={person.workerId}
            className="min-w-[9.5rem] shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm"
          >
            <p className="truncate text-sm font-semibold text-gray-900">{person.workerName}</p>
            <div className="mt-1.5">
              <StatusChip
                status={person.status}
                label={
                  person.status === 'on_leave' && person.leaveTypeName
                    ? person.leaveTypeName
                    : undefined
                }
              />
            </div>
            {checkIn && (
              <p className="mt-1.5 text-[11px] tabular-nums text-gray-500">
                {t('checked_in_at', { time: checkIn })}
              </p>
            )}
            {person.localTimeZone && (
              <p className="mt-0.5 truncate text-[10px] text-gray-400">{person.localTimeZone}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
