'use client';

import { CalendarHeatmapLegend } from '@/components/calendar/CalendarHeatmapLegend';
import { TeamMonthHeatmap } from '@/components/calendar/TeamMonthHeatmap';
import { StatusChip } from '@/components/shared/StatusChip';
import { ApiRequestError } from '@/libs/api/client';
import {
  getTeamCalendar,
  type TeamCalendarResponse,
} from '@/libs/api/calendars';
import { monthRange } from '@/libs/datetime/calendar-range';
import { AlertCircle, CalendarDays, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ViewMode = 'list' | 'month';

function formatRange(start: string, end: string) {
  try {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const s = new Intl.DateTimeFormat(undefined, opts).format(new Date(start));
    const e = new Intl.DateTimeFormat(undefined, opts).format(new Date(end));
    return s === e ? s : `${s} – ${e}`;
  } catch {
    return `${start} – ${end}`;
  }
}

type LeaveListRow = {
  key: string;
  workerName: string;
  leaveTypeName?: string | null;
  startDate: string;
  endDate: string;
  status: string;
};

function leaveRowsFromTeam(data: TeamCalendarResponse): LeaveListRow[] {
  const rows: LeaveListRow[] = [];
  for (const worker of data.workers) {
    let runStart: string | null = null;
    let runEnd: string | null = null;
    let leaveType: string | null | undefined = null;

    const flush = () => {
      if (runStart && runEnd) {
        rows.push({
          key: `${worker.workerId}-${runStart}-${runEnd}`,
          workerName: worker.workerName,
          leaveTypeName: leaveType,
          startDate: runStart,
          endDate: runEnd,
          status: 'on_leave',
        });
      }
      runStart = null;
      runEnd = null;
      leaveType = null;
    };

    for (const cell of worker.cells) {
      if (cell.status === 'on_leave') {
        if (!runStart) {
          runStart = cell.date;
          leaveType = cell.leaveTypeName;
        }
        runEnd = cell.date;
      } else {
        flush();
      }
    }
    flush();
  }
  return rows;
}

export default function ManagerCalendarPage() {
  const t = useTranslations('ManagerCalendar');
  const [view, setView] = useState<ViewMode>('list');
  const [cursor, setCursor] = useState(() => new Date());
  const [data, setData] = useState<TeamCalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const viewOptions = [
    { label: t('view_list'), value: 'list' as const },
    { label: t('view_month'), value: 'month' as const },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = monthRange(cursor);
      const { data: payload } = await getTeamCalendar({ from, to });
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setLoading(false);
    }
  }, [cursor, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
        cursor,
      ),
    [cursor],
  );

  const leaveRows = useMemo(
    () => (data ? leaveRowsFromTeam(data) : []),
    [data],
  );

  const shiftMonth = (delta: number) => {
    setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-gray-700" aria-hidden />
            <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectButton
            value={view}
            onChange={e => setView(e.value as ViewMode)}
            options={viewOptions}
            optionLabel="label"
            optionValue="value"
            allowEmpty={false}
            aria-label={t('view_toggle')}
          />
          <Button
            type="button"
            severity="secondary"
            outlined
            size="small"
            onClick={() => void load()}
            className="gap-2"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            {t('refresh')}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <Button
          type="button"
          text
          size="small"
          onClick={() => shiftMonth(-1)}
          aria-label={t('prev_month')}
        >
          {t('prev_month')}
        </Button>
        <p className="text-sm font-semibold text-gray-900">{monthLabel}</p>
        <Button
          type="button"
          text
          size="small"
          onClick={() => shiftMonth(1)}
          aria-label={t('next_month')}
        >
          {t('next_month')}
        </Button>
      </div>

      <CalendarHeatmapLegend namespace="ManagerCalendar" />

      {loading && (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="3rem" className="rounded-lg" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </div>
          <Button
            type="button"
            severity="secondary"
            size="small"
            onClick={() => void load()}
            className="gap-2"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && !error && data && data.workers.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-10 text-center">
          <CalendarDays className="mx-auto size-8 text-gray-400" aria-hidden />
          <p className="mt-2 text-sm font-medium text-gray-900">{t('empty_title')}</p>
          <p className="mt-1 text-xs text-gray-500">{t('empty_body')}</p>
        </div>
      )}

      {!loading && !error && leaveRows.length > 0 && view === 'list' && (
        <ul
          className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white"
          aria-label={t('list_label')}
        >
          {leaveRows.map(entry => (
            <li
              key={entry.key}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {entry.workerName}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatRange(entry.startDate, entry.endDate)}
                  {entry.leaveTypeName ? ` · ${entry.leaveTypeName}` : ''}
                </p>
              </div>
              <StatusChip status="on_leave" />
            </li>
          ))}
        </ul>
      )}

      {!loading &&
        !error &&
        view === 'list' &&
        data &&
        data.workers.length > 0 &&
        leaveRows.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-10 text-center">
            <p className="text-sm font-medium text-gray-900">{t('empty_title')}</p>
            <p className="mt-1 text-xs text-gray-500">{t('empty_body')}</p>
          </div>
        )}

      {!loading && !error && view === 'month' && data && data.workers.length > 0 && (
        <TeamMonthHeatmap data={data} />
      )}
    </div>
  );
}
