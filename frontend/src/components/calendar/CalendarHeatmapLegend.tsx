'use client';

import type { CalendarCellStatus } from '@/libs/api/calendars';
import { useTranslations } from 'next-intl';
import {
  CALENDAR_STATUS_CLASS,
  CALENDAR_STATUS_KEYS,
} from './calendar-status-styles';

type CalendarHeatmapLegendProps = {
  namespace?: string;
};

export function CalendarHeatmapLegend({
  namespace = 'EmployeeCalendar',
}: CalendarHeatmapLegendProps) {
  const t = useTranslations(namespace);

  return (
    <div className="flex flex-wrap gap-2" aria-label={t('legend_title')}>
      {CALENDAR_STATUS_KEYS.map(status => (
        <span
          key={status}
          className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium ${CALENDAR_STATUS_CLASS[status as CalendarCellStatus]}`}
        >
          {t(`status_${status}` as 'status_in')}
        </span>
      ))}
    </div>
  );
}
