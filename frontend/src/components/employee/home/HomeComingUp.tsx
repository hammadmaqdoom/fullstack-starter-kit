'use client';

import type { HomeUpcomingItem } from '@/libs/employee/home-today.util';
import { ApiRequestError } from '@/libs/api/client';
import { getMyCalendar } from '@/libs/api/calendars';
import { upcomingFromCalendar } from '@/libs/employee/home-today.util';
import { Link } from '@/libs/I18nNavigation';
import { AlertCircle, CalendarDays, Palmtree } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useState } from 'react';

function addDaysIso(fromIso: string, days: number): string {
  const d = new Date(`${fromIso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayIso(timeZone?: string | null): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function HomeComingUp() {
  const t = useTranslations('EmployeeHome');
  const [items, setItems] = useState<HomeUpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = todayIso();
      const to = addDaysIso(from, 6);
      const { data } = await getMyCalendar({ from, to });
      setItems(upcomingFromCalendar(data, from, to));
    } catch (err) {
      setItems([]);
      setError(err instanceof ApiRequestError ? err.message : t('coming_up_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      aria-labelledby="coming-up-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="coming-up-heading" className="text-sm font-semibold text-gray-900">
          {t('coming_up_section')}
        </h2>
        <Link
          href="/employee/calendar"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          {t('coming_up_view_calendar')}
        </Link>
      </div>

      {loading && (
        <div className="mt-4 space-y-2" aria-busy="true">
          <Skeleton height="2.5rem" />
          <Skeleton height="2.5rem" />
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 text-center">
          <p className="flex items-center justify-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
          <Button type="button" className="mt-3" onClick={() => void load()}>
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="mt-3 text-sm text-gray-500">{t('coming_up_empty')}</p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const Icon = item.kind === 'holiday' ? Palmtree : CalendarDays;
            return (
              <li key={item.key} className="flex items-start gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.dateLabel}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
