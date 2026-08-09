'use client';

import type { HubItem, HubTab } from '@/libs/api/hub';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { SelectButton } from 'primereact/selectbutton';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusChip } from '@/components/shared/StatusChip';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { ApiRequestError } from '@/libs/api/client';
import { formatDateTimeInTimezone } from '@/libs/datetime/format-in-timezone';
import { getHubInbox } from '@/libs/api/hub';
import { useWorkerTimezone } from '@/libs/hooks/useWorkerTimezone';

function HubItemCard({ item, timezone }: { item: HubItem; timezone: string }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
            {item.type}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-gray-900">
            {item.title}
          </h3>
          {item.createdAt && (
            <p className="mt-0.5 text-xs text-gray-400">
              {formatDateTimeInTimezone(item.createdAt, timezone)}
            </p>
          )}
        </div>
        <StatusChip status={item.status} />
      </div>
      {item.steps && item.steps.length > 0 && (
        <div className="mt-3">
          <StatusTracker steps={item.steps} nextStepText={item.nextStepText ?? undefined} />
        </div>
      )}
      {!item.steps?.length && item.nextStepText && (
        <p className="mt-2 text-xs text-gray-500">{item.nextStepText}</p>
      )}
    </article>
  );
}

export default function HubPage() {
  const t = useTranslations('Hub');
  const { timezone } = useWorkerTimezone();
  const [tab, setTab] = useState<HubTab>('for_me');
  const [mine, setMine] = useState<HubItem[]>([]);
  const [forMe, setForMe] = useState<HubItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const tabOptions = useMemo(
    () => [
      { label: t('tab_for_me'), value: 'for_me' as const },
      { label: t('tab_mine'), value: 'mine' as const },
    ],
    [t],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setOffline(typeof navigator !== 'undefined' && !navigator.onLine);

    try {
      const { data } = await getHubInbox();
      setMine(data.mine ?? []);
      setForMe(data.forMe ?? []);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : t('error_load');
      setError(message);
      setMine([]);
      setForMe([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onOnline() {
      setOffline(false);
      void load();
    }
    function onOffline() {
      setOffline(true);
    }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [load]);

  const items = tab === 'mine' ? mine : forMe;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16 lg:pb-0">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {offline && (
        <Message severity="warn" text={t('offline_banner')} className="w-full" />
      )}

      <SelectButton
        value={tab}
        onChange={e => setTab(e.value as HubTab)}
        options={tabOptions}
        optionLabel="label"
        optionValue="value"
        className="w-full [&_.p-button]:flex-1"
        allowEmpty={false}
      />

      {isLoading && (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-gray-200 p-4">
              <Skeleton width="30%" height="0.75rem" className="mb-2" />
              <Skeleton width="70%" height="1rem" className="mb-3" />
              <Skeleton height="0.5rem" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          title={tab === 'for_me' ? t('empty_for_me_title') : t('empty_mine_title')}
          description={
            tab === 'for_me' ? t('empty_for_me_description') : t('empty_mine_description')
          }
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <ul className="space-y-3">
          {items.map(item => (
            <li key={item.id}>
              <HubItemCard item={item} timezone={timezone} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
