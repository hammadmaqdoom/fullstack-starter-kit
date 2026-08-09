'use client';

import type { PolicyListItem } from '@/libs/api/policies';
import { EmptyState } from '@/components/shared/EmptyState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { listPolicies } from '@/libs/api/policies';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';

function complianceLabel(policy: PolicyListItem): string {
  if (
    typeof policy.acknowledgedCount === 'number'
    && typeof policy.totalAssigned === 'number'
    && policy.totalAssigned > 0
  ) {
    return `${policy.acknowledgedCount}/${policy.totalAssigned}`;
  }
  if (typeof policy.compliancePercent === 'number') {
    return `${Math.round(policy.compliancePercent)}%`;
  }
  if (typeof policy.pendingCount === 'number') {
    return String(policy.pendingCount);
  }
  return '—';
}

export default function PeopleOpsPoliciesPage() {
  const t = useTranslations('Policies');
  const [policies, setPolicies] = useState<PolicyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listPolicies();
      setPolicies(data ?? []);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <OfflineBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('ops_title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('ops_subtitle')}</p>
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

      {loading && (
        <div className="space-y-3">
          <Skeleton height="2.5rem" />
          <Skeleton height="12rem" />
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

      {!loading && !error && policies.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={t('empty_ops_title')}
          description={t('empty_ops_description')}
        />
      )}

      {!loading && !error && policies.length > 0 && (
        <DataTable
          value={policies}
          dataKey="id"
          className="text-sm"
          stripedRows
          emptyMessage={t('empty_ops_title')}
        >
          <Column field="title" header={t('col_title')} />
          <Column field="code" header={t('col_code')} style={{ width: '8rem' }} />
          <Column
            field="category"
            header={t('col_category')}
            body={(row: PolicyListItem) => (
              <Tag value={t(`category_${row.category}`)} severity="info" />
            )}
            style={{ width: '8rem' }}
          />
          <Column
            field="currentVersion"
            header={t('col_version')}
            body={(row: PolicyListItem) => row.currentVersion ?? '—'}
            style={{ width: '6rem' }}
          />
          <Column
            header={t('col_status')}
            body={(row: PolicyListItem) => (
              <Tag
                value={row.isActive ? t('status_active') : t('status_inactive')}
                severity={row.isActive ? 'success' : 'secondary'}
              />
            )}
            style={{ width: '7rem' }}
          />
          <Column
            header={t('col_compliance')}
            body={(row: PolicyListItem) => (
              <span className="tabular-nums text-gray-700">{complianceLabel(row)}</span>
            )}
            style={{ width: '8rem' }}
          />
          <Column
            header={t('col_pending')}
            body={(row: PolicyListItem) =>
              typeof row.pendingCount === 'number' ? row.pendingCount : '—'}
            style={{ width: '6rem' }}
          />
        </DataTable>
      )}
    </div>
  );
}
