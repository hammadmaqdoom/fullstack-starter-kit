'use client';

import type { HubItem } from '@/libs/api/hub';
import { StatusChip } from '@/components/shared/StatusChip';
import { ApiRequestError } from '@/libs/api/client';
import { getHubInbox } from '@/libs/api/hub';
import { Link } from '@/libs/I18nNavigation';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useState } from 'react';

export function HomeNeedsYou() {
  const t = useTranslations('EmployeeHome');
  const [items, setItems] = useState<HubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getHubInbox();
      setItems((data.forMe ?? []).slice(0, 3));
    } catch (err) {
      setItems([]);
      setError(err instanceof ApiRequestError ? err.message : t('needs_you_error'));
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
      aria-labelledby="needs-you-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="needs-you-heading" className="text-sm font-semibold text-gray-900">
          {t('needs_you_section')}
        </h2>
        <Link href="/hub" className="text-sm font-medium text-blue-700 hover:underline">
          {t('needs_you_view_hub')}
        </Link>
      </div>

      {loading && (
        <div className="mt-4 space-y-2" aria-busy="true">
          <Skeleton height="3rem" />
          <Skeleton height="3rem" />
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
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-900">{t('needs_you_empty_title')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('needs_you_empty_description')}</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-100">
          {items.map(item => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                {item.subtitle && (
                  <p className="mt-0.5 truncate text-xs text-gray-500">{item.subtitle}</p>
                )}
              </div>
              <StatusChip status={String(item.status)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
