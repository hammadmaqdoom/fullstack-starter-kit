'use client';

import { CalendarHeatmapLegend } from '@/components/calendar/CalendarHeatmapLegend';
import { StaffMonthHeatmap } from '@/components/calendar/StaffMonthHeatmap';
import { StatusChip } from '@/components/shared/StatusChip';
import { ApiRequestError } from '@/libs/api/client';
import { getMyCalendar, type StaffCalendarResponse } from '@/libs/api/calendars';
import { monthRange, weekRange } from '@/libs/datetime/calendar-range';
import { useRouter } from '@/libs/I18nNavigation';
import { AlertCircle, CalendarDays, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ViewMode = 'list' | 'month';

export default function EmployeeCalendarPage() {
  const t = useTranslations('EmployeeCalendar');
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('list');
  const [cursor, setCursor] = useState(() => new Date());
  const [data, setData] = useState<StaffCalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const viewOptions = [
    { label: t('view_list'), value: 'list' as const },
    { label: t('view_month'), value: 'month' as const },
  ];

  const rangeLabel = useMemo(() => {
    if (view === 'month') {
      return new Intl.DateTimeFormat(undefined, {
        month: 'long',
        year: 'numeric',
      }).format(cursor);
    }
    const { from, to } = weekRange(cursor);
    return `${from} – ${to}`;
  }, [cursor, view]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const range = view === 'month' ? monthRange(cursor) : weekRange(cursor);
      const { data: payload } = await getMyCalendar(range);
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setLoading(false);
    }
  }, [cursor, t, view]);

  useEffect(() => {
    void load();
  }, [load]);

  const shift = (delta: number) => {
    setCursor(prev => {
      if (view === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      }
      const next = new Date(prev);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
  };

  const agendaItems = useMemo(() => {
    if (!data) {
      return [];
    }
    const leaveItems = data.leave.map(l => ({
      key: l.leaveRequestId,
      title: l.leaveTypeName ?? t('status_on_leave'),
      detail: `${l.startDate} – ${l.endDate}`,
      status: l.status === 'submitted' ? 'pending' : 'on_leave',
    }));
    const holidayItems = data.holidays.map(h => ({
      key: h.id,
      title: h.name,
      detail: h.holidayDate,
      status: 'holiday' as const,
    }));
    return [...holidayItems, ...leaveItems];
  }, [data, t]);

  const isEmpty =
    !loading &&
    !error &&
    data !== null &&
    data.leave.length === 0 &&
    data.holidays.length === 0 &&
    view === 'list';

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16 lg:pb-0">
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
          <Button
            type="button"
            size="small"
            onClick={() => router.push('/employee/leave')}
          >
            {t('request_leave')}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <Button type="button" text size="small" onClick={() => shift(-1)} aria-label={t('prev')}>
          {t('prev')}
        </Button>
        <p className="text-sm font-semibold text-gray-900">{rangeLabel}</p>
        <Button type="button" text size="small" onClick={() => shift(1)} aria-label={t('next')}>
          {t('next')}
        </Button>
      </div>

      <CalendarHeatmapLegend namespace="EmployeeCalendar" />

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
          <Button type="button" severity="secondary" size="small" onClick={() => void load()} className="gap-2">
            <RefreshCw className="size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {isEmpty && (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-10 text-center">
          <CalendarDays className="mx-auto size-8 text-gray-400" aria-hidden />
          <p className="mt-2 text-sm font-medium text-gray-900">{t('empty_title')}</p>
          <p className="mt-1 text-xs text-gray-500">{t('empty_body')}</p>
        </div>
      )}

      {!loading && !error && view === 'list' && agendaItems.length > 0 && (
        <ul
          className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white"
          aria-label={t('list_label')}
        >
          {agendaItems.map(item => (
            <li
              key={item.key}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">{item.detail}</p>
              </div>
              <StatusChip
                status={item.status === 'pending' ? 'pending' : 'on_leave'}
                label={item.status === 'holiday' ? t('status_holiday') : undefined}
              />
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && view === 'month' && data && (
        <StaffMonthHeatmap
          days={data.days}
          year={cursor.getFullYear()}
          monthIndex={cursor.getMonth()}
          timezone={data.timezone}
        />
      )}
    </div>
  );
}
