'use client';

import type { StaffCalendarResponse } from '@/libs/api/calendars';
import { useTranslations } from 'next-intl';
import { CALENDAR_STATUS_CLASS } from './calendar-status-styles';

type StaffMonthHeatmapProps = {
  days: StaffCalendarResponse['days'];
  year: number;
  monthIndex: number;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function StaffMonthHeatmap({
  days,
  year,
  monthIndex,
}: StaffMonthHeatmapProps) {
  const t = useTranslations('EmployeeCalendar');
  const byDate = new Map(days.map(d => [d.date, d]));
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const firstDow = new Date(year, monthIndex, 1).getDay();
  const mondayOffset = (firstDow + 6) % 7;

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
    const title = [
      cell?.holidayName,
      cell?.leaveTypeName,
      cell?.status,
    ]
      .filter(Boolean)
      .join(' · ');

    cells.push(
      <div
        key={iso}
        className={`min-h-16 border-r border-b border-gray-100 p-1.5 ${CALENDAR_STATUS_CLASS[status]}`}
        title={title || undefined}
      >
        <p className="text-xs font-semibold">{day}</p>
        {cell?.holidayName && (
          <p className="mt-0.5 truncate text-[10px]">{cell.holidayName}</p>
        )}
        {cell?.leaveTypeName && (
          <p className="mt-0.5 truncate text-[10px]">{cell.leaveTypeName}</p>
        )}
      </div>,
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
