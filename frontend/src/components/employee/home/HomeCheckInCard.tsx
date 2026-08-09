'use client';

import type { TodayAttendance } from '@/libs/api/attendance';
import { useOnlineStatus } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { checkIn, checkOut, getTodayAttendance } from '@/libs/api/attendance';
import { notifyAttendanceUpdated } from '@/libs/shell/attendance-events';
import { AlertCircle, LogIn, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useState } from 'react';

function formatPunchTime(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type Props = {
  onPunched?: () => void;
};

export function HomeCheckInCard({ onPunched }: Props) {
  const t = useTranslations('EmployeeHome');
  const isOnline = useOnlineStatus();

  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPunching, setIsPunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [punchError, setPunchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await getTodayAttendance();
      setToday(data);
    } catch (err) {
      setToday(null);
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const status = today?.daySummary?.status ?? null;
  const isCheckedIn = status === 'in';
  const isCheckedOut = status === 'out';
  const isDayOff = status === 'on_leave';

  const handlePunch = async (action: 'in' | 'out') => {
    setIsPunching(true);
    setPunchError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data }
        = action === 'in'
          ? await checkIn({ timezone, source: 'web' })
          : await checkOut({ timezone, source: 'web' });
      setToday(prev =>
        prev
          ? {
              ...prev,
              daySummary: data.daySummary,
              punches: [...prev.punches, data.punch],
            }
          : {
              workerId: data.daySummary.workerId,
              workDate: data.daySummary.workDate,
              daySummary: data.daySummary,
              punches: [data.punch],
            },
      );
      notifyAttendanceUpdated();
      onPunched?.();
    } catch (err) {
      const alreadyIn
        = err instanceof ApiRequestError
          && (err.errors.some(e => e.code === 'ALREADY_CHECKED_IN')
            || /already exists for today/i.test(err.message));
      if (alreadyIn) {
        await load();
        notifyAttendanceUpdated();
        onPunched?.();
        setPunchError(null);
      } else {
        setPunchError(err instanceof ApiRequestError ? err.message : t('error_punch'));
      }
    } finally {
      setIsPunching(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="flex items-center justify-center gap-2 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
        <Button type="button" className="mt-3" onClick={() => void load()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (isLoading && !today) {
    return (
      <div aria-busy="true">
        <Skeleton height="8rem" />
      </div>
    );
  }

  return (
    <section
      id="check-in"
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      aria-labelledby="check-in-heading"
    >
      <h2 id="check-in-heading" className="text-sm font-semibold text-gray-900">
        {t('check_in_section')}
      </h2>

      {isDayOff
        ? (
            <div className="mt-4">
              <p className="text-base font-medium text-gray-900">{t('day_off_title')}</p>
              <p className="mt-1 text-sm text-gray-500">{t('day_off_description')}</p>
            </div>
          )
        : (
            <div className="mt-4 space-y-4">
              {isCheckedIn && (
                <Message
                  severity="success"
                  className="w-full justify-start"
                  content={(
                    <span className="text-sm">
                      <span className="font-medium">{t('checked_in_title')}</span>
                      {' — '}
                      {t('checked_in_detail', {
                        time: formatPunchTime(today?.daySummary?.firstIn),
                      })}
                    </span>
                  )}
                />
              )}

              {isCheckedOut && (
                <Message
                  severity="info"
                  className="w-full justify-start"
                  content={(
                    <span className="text-sm">
                      <span className="font-medium">{t('checked_out_title')}</span>
                      {' — '}
                      {t('checked_out_detail')}
                    </span>
                  )}
                />
              )}

              {!isCheckedIn && !isCheckedOut && (
                <p className="text-sm text-gray-600">{t('not_checked_in')}</p>
              )}

              {punchError && (
                <Message severity="error" className="w-full justify-start" text={punchError} />
              )}

              <div className="flex flex-wrap gap-2">
                {!isCheckedIn && (
                  <Button
                    type="button"
                    className="gap-2"
                    loading={isPunching}
                    disabled={!isOnline || isPunching}
                    onClick={() => void handlePunch('in')}
                  >
                    <LogIn className="size-4" aria-hidden />
                    {isCheckedOut ? t('check_in_again') : t('check_in')}
                  </Button>
                )}
                {isCheckedIn && (
                  <Button
                    type="button"
                    className="gap-2"
                    loading={isPunching}
                    disabled={!isOnline || isPunching}
                    onClick={() => void handlePunch('out')}
                  >
                    <LogOut className="size-4" aria-hidden />
                    {t('check_out')}
                  </Button>
                )}
              </div>
            </div>
          )}
    </section>
  );
}
