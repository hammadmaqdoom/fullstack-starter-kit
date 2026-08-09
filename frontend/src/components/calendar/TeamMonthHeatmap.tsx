'use client';

import type { TeamCalendarResponse } from '@/libs/api/calendars';
import { useTranslations } from 'next-intl';
import { CalendarDayDetailTrigger } from './CalendarDayDetailPopover';
import { CALENDAR_STATUS_CLASS } from './calendar-status-styles';

type TeamMonthHeatmapProps = {
  data: TeamCalendarResponse;
};

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

export function TeamMonthHeatmap({ data }: TeamMonthHeatmapProps) {
  const t = useTranslations('ManagerCalendar');
  const dates = data.days.map(d => d.date);

  const detailLabels = {
    checkIn: t('detail_check_in'),
    checkOut: t('detail_check_out'),
    total: (duration: string) => t('detail_total', { duration }),
    inProgress: t('detail_in_progress'),
    noPunches: t('detail_no_punches'),
    punchLine: (label: string, time: string) =>
      t('detail_punch_line', { label, time }),
  };

  return (
    <div
      className="overflow-x-auto rounded-lg border border-gray-200 bg-white"
      aria-label={t('heatmap_label')}
    >
      <table className="min-w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 font-semibold text-gray-600">
              {t('col_worker')}
            </th>
            {dates.map(date => (
              <th
                key={date}
                className="px-1 py-2 text-center font-semibold text-gray-500"
              >
                {date.slice(8)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.workers.map(worker => {
            const byDate = new Map(worker.cells.map(c => [c.date, c]));
            const today = todayInTimezone(worker.timezone);
            return (
              <tr key={worker.workerId} className="border-b border-gray-50">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-medium text-gray-900">
                  {worker.workerName}
                </td>
                {dates.map(date => {
                  const cell = byDate.get(date);
                  const status = cell?.status ?? 'planned';
                  const statusLabel = t(`status_${status}`);
                  return (
                    <td key={date} className="p-0">
                      <CalendarDayDetailTrigger
                        className="flex h-8 w-full cursor-pointer items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        detail={{
                          date,
                          today,
                          timezone: worker.timezone,
                          status,
                          statusLabel,
                          workerName: worker.workerName,
                          holidayName: cell?.holidayName,
                          leaveTypeName: cell?.leaveTypeName,
                          punches: cell?.punches ?? [],
                          workedMinutes: cell?.workedMinutes ?? 0,
                          labels: detailLabels,
                        }}
                      >
                        <div
                          className={`size-6 rounded ${CALENDAR_STATUS_CLASS[status]}`}
                          aria-hidden
                        />
                      </CalendarDayDetailTrigger>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
