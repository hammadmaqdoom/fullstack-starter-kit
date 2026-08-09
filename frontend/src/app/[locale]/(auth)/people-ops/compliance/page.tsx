'use client';

import type { ComplianceControlListItem } from '@/libs/api/compliance-controls';
import { EmptyState } from '@/components/shared/EmptyState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { listComplianceControls } from '@/libs/api/compliance-controls';
import { Link } from '@/libs/I18nNavigation';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';

function resultSeverity(
  result: string | undefined,
): 'success' | 'danger' | 'warning' | 'info' | 'secondary' {
  switch (result) {
    case 'pass':
      return 'success';
    case 'fail':
      return 'danger';
    case 'error':
      return 'danger';
    case 'manual':
      return 'warning';
    case 'skipped':
      return 'secondary';
    default:
      return 'info';
  }
}

export default function PeopleOpsCompliancePage() {
  const t = useTranslations('PeopleOpsCompliance');
  const [rows, setRows] = useState<ComplianceControlListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listComplianceControls({ inScope: 'true' });
      setRows(data ?? []);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setRows([]);
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
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2 self-start">
          <Link
            href="/people-ops/compliance/programme"
            className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('programme_link')}
          </Link>
          <Button
            type="button"
            severity="secondary"
            outlined
            className="gap-2"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className="size-4" aria-hidden />
            {t('refresh')}
          </Button>
        </div>
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

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title={t('empty_title')}
          description={t('empty_description')}
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <DataTable value={rows} dataKey="id" className="text-sm">
          <Column
            field="code"
            header={t('col_code')}
            body={(row: ComplianceControlListItem) => (
              <Link
                href={`/people-ops/compliance/${row.code}`}
                className="font-medium text-gray-900 hover:underline"
              >
                {row.code}
              </Link>
            )}
          />
          <Column field="title" header={t('col_title')} />
          <Column field="domain" header={t('col_domain')} />
          <Column field="ownerRole" header={t('col_owner')} />
          <Column
            header={t('col_result')}
            body={(row: ComplianceControlListItem) => {
              const result = row.latestRun?.result ?? 'never_run';
              return (
                <Tag
                  value={result}
                  severity={resultSeverity(row.latestRun?.result)}
                />
              );
            }}
          />
          <Column
            header={t('col_last_run')}
            body={(row: ComplianceControlListItem) =>
              row.latestRun?.ranAt
                ? new Date(row.latestRun.ranAt).toLocaleString()
                : '—'
            }
          />
          <Column
            header={t('col_frameworks')}
            body={(row: ComplianceControlListItem) =>
              row.frameworks
                .slice(0, 3)
                .map((f) => `${f.framework}:${f.externalRef}`)
                .join(', ') || '—'
            }
          />
        </DataTable>
      )}
    </div>
  );
}
