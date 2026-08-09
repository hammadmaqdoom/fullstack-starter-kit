'use client';

import type { WeekStripDay } from '@/libs/datetime/week-strip-days';
import { Link } from '@/libs/I18nNavigation';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { CalendarDayDetailTrigger } from './CalendarDayDetailPopover';
import { CALENDAR_STATUS_CLASS } from './calendar-status-styles';

export type WeekAttendanceStripProps = {
  days: WeekStripDay[];
  timezone: string;
  today: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

function weekdayShort(date: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
      new Date(`${date}T12:00:00`),
    );
  } catch {
    return date.slice(5);
  }
}

function dayNumber(date: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(
      new Date(`${date}T12:00:00`),
    );
  } catch {
    return date.slice(8);
  }
}

export function WeekAttendanceStrip({
  days,
  timezone,
  today,
  loading = false,
  error = null,
  onRetry,
}: WeekAttendanceStripProps) {
  const t = useTranslations('EmployeeHome');
  const tCal = useTranslations('EmployeeCalendar');

  const detailLabels = {
    checkIn: tCal('detail_check_in'),
    checkOut: tCal('detail_check_out'),
    total: (duration: string) => tCal('detail_total', { duration }),
    inProgress: tCal('detail_in_progress'),
    noPunches: tCal('detail_no_punches'),
    punchLine: (label: string, time: string) =>
      tCal('detail_punch_line', { label, time }),
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{t('week_title')}</h2>
        <Link
          href="/employee/calendar"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {t('week_view_calendar')}
        </Link>
      </div>

      {loading && (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          aria-busy="true"
          aria-label={t('week_loading')}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} width="3.25rem" height="4.5rem" className="shrink-0 rounded-lg" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error || t('week_error')}
          </div>
          {onRetry && (
            <Button type="button" severity="secondary" size="small" onClick={onRetry} className="gap-2">
              <RefreshCw className="size-3.5" aria-hidden />
              {t('retry')}
            </Button>
          )}
        </div>
      )}

      {!loading && !error && days.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-sm text-gray-500">
          {t('week_empty')}
        </div>
      )}

      {!loading && !error && days.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label={t('week_title')}>
          {days.map((day) => {
            const statusLabel = tCal(`status_${day.status}`);
            const isToday = day.date === today;
            return (
              <li key={day.date} className="shrink-0 list-none">
                <CalendarDayDetailTrigger
                  className={`flex min-w-[3.25rem] cursor-pointer flex-col items-center rounded-lg px-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${CALENDAR_STATUS_CLASS[day.status]} ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                  detail={{
                    date: day.date,
                    today,
                    timezone,
                    status: day.status,
                    statusLabel,
                    holidayName: day.holidayName,
                    leaveTypeName: day.leaveTypeName,
                    punches: day.punches,
                    workedMinutes: day.workedMinutes,
                    labels: detailLabels,
                  }}
                >
                  <span className="text-[10px] font-semibold tracking-wide uppercase opacity-80">
                    {weekdayShort(day.date)}
                  </span>
                  <span className="mt-0.5 text-sm font-semibold tabular-nums">
                    {dayNumber(day.date)}
                  </span>
                </CalendarDayDetailTrigger>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
