'use client';

import type { StaffCalendarResponse } from '@/libs/api/calendars';
import { useTranslations } from 'next-intl';
import { CalendarDayDetailTrigger } from './CalendarDayDetailPopover';
import { CALENDAR_STATUS_CLASS } from './calendar-status-styles';

type StaffMonthHeatmapProps = {
  days: StaffCalendarResponse['days'];
  year: number;
  monthIndex: number;
  timezone: string;
  today?: string;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function todayInTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function StaffMonthHeatmap({
  days,
  year,
  monthIndex,
  timezone,
  today: todayProp,
}: StaffMonthHeatmapProps) {
  const t = useTranslations('EmployeeCalendar');
  const today = todayProp ?? todayInTimezone(timezone);
  const byDate = new Map(days.map(d => [d.date, d]));
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const firstDow = new Date(year, monthIndex, 1).getDay();
  const mondayOffset = (firstDow + 6) % 7;

  const detailLabels = {
    checkIn: t('detail_check_in'),
    checkOut: t('detail_check_out'),
    total: (duration: string) => t('detail_total', { duration }),
    inProgress: t('detail_in_progress'),
    noPunches: t('detail_no_punches'),
    punchLine: (label: string, time: string) =>
      t('detail_punch_line', { label, time }),
  };

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < mondayOffset; i++) {
    cells.push(
      <div
        key={`pad-${i}`}
        className="min-h-16 border-r border-b border-gray-50 bg-gray-50/40"
      />,
    );
  }

  for (let day = 1; day <= totalDays; day++) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = byDate.get(iso);
    const status = cell?.status ?? 'planned';
    const statusLabel = t(`status_${status}`);

    cells.push(
      <CalendarDayDetailTrigger
        key={iso}
        className={`min-h-16 cursor-pointer border-r border-b border-gray-100 p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${CALENDAR_STATUS_CLASS[status]}`}
        detail={{
          date: iso,
          today,
          timezone,
          status,
          statusLabel,
          holidayName: cell?.holidayName,
          leaveTypeName: cell?.leaveTypeName,
          punches: cell?.punches ?? [],
          workedMinutes: cell?.workedMinutes ?? 0,
          labels: detailLabels,
        }}
      >
        <p className="text-xs font-semibold">{day}</p>
        {cell?.holidayName && (
          <p className="mt-0.5 truncate text-[10px]">{cell.holidayName}</p>
        )}
        {cell?.leaveTypeName && (
          <p className="mt-0.5 truncate text-[10px]">{cell.leaveTypeName}</p>
        )}
      </CalendarDayDetailTrigger>,
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border border-gray-200 bg-white"
      aria-label={t('heatmap_label')}
    >
      <div className="grid min-w-[640px] grid-cols-7 border-b border-gray-100 text-center text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
        {WEEKDAYS.map(d => (
          <div key={d} className="px-1 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid min-w-[640px] grid-cols-7">{cells}</div>
    </div>
  );
}
