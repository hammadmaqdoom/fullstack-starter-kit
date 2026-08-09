'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import type { LeaveType } from '@/libs/api/leave';
import { listLeaveTypes } from '@/libs/api/leave';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';

export default function PeopleOpsLeaveAdminPage() {
  const t = useTranslations('LeaveAdmin');
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    try {
      const { data, meta } = await listLeaveTypes();
      if (meta.unavailable) {
        setTypes([]);
        setUnavailable(true);
        return;
      }
      setTypes(data ?? []);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <OfflineBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button
          type="button"
          severity="secondary"
          outlined
          className="gap-2 self-start"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className="size-4" aria-hidden />
          {t('refresh')}
        </Button>
      </div>

      <Message severity="info" text={t('stub_notice')} className="w-full" />

      {loading && (
        <div className="space-y-3">
          <Skeleton height="2.5rem" />
          <Skeleton height="10rem" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <Button type="button" className="mt-4 gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && !error && unavailable && (
        <EmptyState
          icon={CalendarDays}
          title={t('unavailable_title')}
          description={t('unavailable_description')}
        />
      )}

      {!loading && !error && !unavailable && types.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title={t('empty_title')}
          description={t('empty_description')}
        />
      )}

      {!loading && !error && !unavailable && types.length > 0 && (
        <DataTable
          value={types}
          size="small"
          stripedRows
          className="text-sm"
          emptyMessage={t('empty_title')}
        >
          <Column field="name" header={t('col_name')} />
          <Column field="code" header={t('col_code')} style={{ width: '8rem' }} />
          <Column
            field="unit"
            header={t('col_unit')}
            style={{ width: '7rem' }}
            body={(row: LeaveType) => (
              <Tag
                value={row.unit === 'hours' ? t('unit_hours') : t('unit_days')}
                severity="secondary"
              />
            )}
          />
        </DataTable>
      )}
    </div>
  );
}
