'use client';

import type { TeamPunchToday, TodayAttendance } from '@/libs/api/attendance';
import type { WeekStripDay } from '@/libs/datetime/week-strip-days';
import { WeekAttendanceStrip } from '@/components/calendar/WeekAttendanceStrip';
import { TeamAttendanceStrip } from '@/components/manager/TeamAttendanceStrip';
import { OfflineBanner, useOnlineStatus } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { checkIn, checkOut, getTodayAttendance, getTodayPunches } from '@/libs/api/attendance';
import { getMyCalendar } from '@/libs/api/calendars';
import { weekRange } from '@/libs/datetime/calendar-range';
import { buildWeekStripDays } from '@/libs/datetime/week-strip-days';
import { shouldShowTeamAttendanceOnHome } from '@/libs/home/home-role';
import { usePolarisShell } from '@/libs/hooks/usePolarisShell';
import { notifyAttendanceUpdated } from '@/libs/shell/attendance-events';
import { AlertCircle, LogIn, LogOut, RefreshCw } from 'lucide-react';
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

export default function EmployeeHomePage() {
  const t = useTranslations('EmployeeHome');
  const isOnline = useOnlineStatus();
  const { shell } = usePolarisShell();
  const showTeam = shouldShowTeamAttendanceOnHome(shell?.primaryLayout);

  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPunching, setIsPunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [punchError, setPunchError] = useState<string | null>(null);

  const [weekDays, setWeekDays] = useState<WeekStripDay[]>([]);
  const [weekTimezone, setWeekTimezone] = useState('UTC');
  const [weekToday, setWeekToday] = useState(() => new Date().toISOString().slice(0, 10));
  const [weekLoading, setWeekLoading] = useState(true);
  const [weekError, setWeekError] = useState<string | null>(null);

  const [teamPunches, setTeamPunches] = useState<TeamPunchToday[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

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

  const loadWeek = useCallback(async () => {
    setWeekLoading(true);
    setWeekError(null);
    try {
      const range = weekRange(new Date());
      const { data } = await getMyCalendar(range);
      setWeekDays(buildWeekStripDays(data.from, data.to, data.days));
      setWeekTimezone(data.timezone);
      try {
        setWeekToday(
          new Intl.DateTimeFormat('en-CA', {
            timeZone: data.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date()),
        );
      } catch {
        setWeekToday(new Date().toISOString().slice(0, 10));
      }
    } catch (err) {
      setWeekDays([]);
      setWeekError(err instanceof ApiRequestError ? err.message : t('week_error'));
    } finally {
      setWeekLoading(false);
    }
  }, [t]);

  const loadTeam = useCallback(async () => {
    if (!shouldShowTeamAttendanceOnHome(shell?.primaryLayout)) {
      setTeamPunches([]);
      setTeamError(null);
      setTeamLoading(false);
      return;
    }
    setTeamLoading(true);
    setTeamError(null);
    try {
      const { data } = await getTodayPunches({ scope: 'team' });
      setTeamPunches(data);
    } catch (err) {
      setTeamPunches([]);
      setTeamError(err instanceof ApiRequestError ? err.message : t('team_today_error'));
    } finally {
      setTeamLoading(false);
    }
  }, [shell?.primaryLayout, t]);

  const refreshAll = useCallback(async () => {
    const jobs: Array<Promise<void>> = [load(), loadWeek()];
    if (shouldShowTeamAttendanceOnHome(shell?.primaryLayout)) {
      jobs.push(loadTeam());
    }
    await Promise.all(jobs);
  }, [load, loadTeam, loadWeek, shell?.primaryLayout]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadWeek();
  }, [loadWeek]);

  useEffect(() => {
    if (showTeam) {
      void loadTeam();
    }
  }, [showTeam, loadTeam]);

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
      void loadWeek();
    } catch (err) {
      const alreadyIn
        = err instanceof ApiRequestError
          && (err.errors.some(e => e.code === 'ALREADY_CHECKED_IN')
            || /already exists for today/i.test(err.message));
      if (alreadyIn) {
        await load();
        notifyAttendanceUpdated();
        void loadWeek();
        setPunchError(null);
      } else {
        setPunchError(err instanceof ApiRequestError ? err.message : t('error_punch'));
      }
    } finally {
      setIsPunching(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <OfflineBanner />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('check_in_section')}</p>
        </div>
        <Button
          type="button"
          severity="secondary"
          outlined
          className="gap-2"
          onClick={() => void refreshAll()}
          disabled={isLoading || weekLoading || !isOnline}
        >
          <RefreshCw className="size-4" aria-hidden />
          {t('retry')}
        </Button>
      </div>

      {!isOnline && (
        <Message severity="warn" className="w-full justify-start" text={t('offline_banner')} />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="flex items-center justify-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
          <Button type="button" className="mt-3" onClick={() => void load()}>
            {t('retry')}
          </Button>
        </div>
      )}

      {isLoading && !today && !error && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton height="8rem" />
          <Skeleton height="4rem" />
        </div>
      )}

      {!error && (today || !isLoading) && (
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
      )}

      <section
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        aria-label={t('week_title')}
      >
        <WeekAttendanceStrip
          days={weekDays}
          timezone={weekTimezone}
          today={weekToday}
          loading={weekLoading}
          error={weekError}
          onRetry={() => void loadWeek()}
        />
      </section>

      {showTeam && (
        <section
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          aria-labelledby="team-today-heading"
        >
          <h2 id="team-today-heading" className="text-sm font-semibold text-gray-900">
            {t('team_today_title')}
          </h2>
          <div className="mt-3">
            <TeamAttendanceStrip
              punches={teamPunches}
              loading={teamLoading}
              error={teamError}
              onRetry={() => void loadTeam()}
            />
          </div>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <h2 className="text-sm font-semibold text-gray-900">{t('leave_balances_section')}</h2>
        <p className="mt-2 text-sm text-gray-500">{t('no_balances')}</p>
      </section>
    </div>
  );
}
