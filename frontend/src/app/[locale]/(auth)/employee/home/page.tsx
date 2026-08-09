'use client';

import type { TeamPunchToday } from '@/libs/api/attendance';
import type { WeekStripDay } from '@/libs/datetime/week-strip-days';
import { WeekAttendanceStrip } from '@/components/calendar/WeekAttendanceStrip';
import { HomeCelebration } from '@/components/employee/home/HomeCelebration';
import { HomeCheckInCard } from '@/components/employee/home/HomeCheckInCard';
import { HomeComingUp } from '@/components/employee/home/HomeComingUp';
import { HomeGreeting } from '@/components/employee/home/HomeGreeting';
import { HomeLeaveBalances } from '@/components/employee/home/HomeLeaveBalances';
import { HomeNeedsYou } from '@/components/employee/home/HomeNeedsYou';
import { HomeShortcuts } from '@/components/employee/home/HomeShortcuts';
import { TeamAttendanceStrip } from '@/components/manager/TeamAttendanceStrip';
import { OfflineBanner, useOnlineStatus } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { getTodayPunches } from '@/libs/api/attendance';
import { getMyCalendar } from '@/libs/api/calendars';
import { weekRange } from '@/libs/datetime/calendar-range';
import { buildWeekStripDays } from '@/libs/datetime/week-strip-days';
import { shouldShowTeamAttendanceOnHome } from '@/libs/home/home-role';
import { usePolarisShell } from '@/libs/hooks/usePolarisShell';
import { useTranslations } from 'next-intl';
import { Message } from 'primereact/message';
import { useCallback, useEffect, useState } from 'react';

export default function EmployeeHomePage() {
  const t = useTranslations('EmployeeHome');
  const isOnline = useOnlineStatus();
  const { shell } = usePolarisShell();
  const showTeam = shouldShowTeamAttendanceOnHome(shell?.primaryLayout);

  const [weekDays, setWeekDays] = useState<WeekStripDay[]>([]);
  const [weekTimezone, setWeekTimezone] = useState('UTC');
  const [weekToday, setWeekToday] = useState(() => new Date().toISOString().slice(0, 10));
  const [weekLoading, setWeekLoading] = useState(true);
  const [weekError, setWeekError] = useState<string | null>(null);

  const [teamPunches, setTeamPunches] = useState<TeamPunchToday[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

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

  useEffect(() => {
    void loadWeek();
  }, [loadWeek]);

  useEffect(() => {
    if (showTeam) {
      void loadTeam();
    }
  }, [showTeam, loadTeam]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <OfflineBanner />
      <HomeGreeting />

      {!isOnline && (
        <Message severity="warn" className="w-full justify-start" text={t('offline_banner')} />
      )}

      <HomeCheckInCard onPunched={() => void loadWeek()} />

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

      <HomeLeaveBalances />
      <HomeNeedsYou />
      <HomeComingUp />
      <HomeCelebration />
      <HomeShortcuts />
    </div>
  );
}
