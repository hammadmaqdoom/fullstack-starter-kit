'use client';

import type { TeamCalendarResponse } from '@/libs/api/calendars';
import { useTranslations } from 'next-intl';
import { CALENDAR_STATUS_CLASS } from './calendar-status-styles';

type TeamMonthHeatmapProps = {
  data: TeamCalendarResponse;
};

export function TeamMonthHeatmap({ data }: TeamMonthHeatmapProps) {
  const t = useTranslations('ManagerCalendar');
  const dates = data.days.map(d => d.date);

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
            return (
              <tr key={worker.workerId} className="border-b border-gray-50">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-medium text-gray-900">
                  {worker.workerName}
                </td>
                {dates.map(date => {
                  const cell = byDate.get(date);
                  const status = cell?.status ?? 'planned';
                  const title = [
                    worker.workerName,
                    cell?.leaveTypeName,
                    cell?.holidayName,
                    status,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <td key={date} className="p-0.5">
                      <div
                        className={`mx-auto size-6 rounded ${CALENDAR_STATUS_CLASS[status]}`}
                        title={title}
                        aria-label={title}
                      />
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
