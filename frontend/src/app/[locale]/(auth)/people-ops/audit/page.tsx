'use client';

import type { AuditLogEntry } from '@/libs/api/audit-log';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { downloadAuditLogCsv, listAuditLog } from '@/libs/api/audit-log';
import { Download, RefreshCw, ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Paginator } from 'primereact/paginator';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useState } from 'react';

function changesSummary(
  changes?: Record<string, { old: unknown; new: unknown }>,
): string {
  if (!changes) {
    return '—';
  }
  const keys = Object.keys(changes);
  return keys.length ? keys.join(', ') : '—';
}

export default function PeopleOpsAuditLogPage() {
  const t = useTranslations('AuditLog');
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta } = await listAuditLog({
        page,
        limit,
        q: q.trim() || undefined,
        entityType: entityType.trim() || undefined,
      });
      setRows(data ?? []);
      setTotal(Number(meta.total ?? data?.length ?? 0));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [t, page, limit, q, entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      await downloadAuditLogCsv({
        q: q.trim() || undefined,
        entityType: entityType.trim() || undefined,
      });
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : t('error_export'),
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <OfflineBanner />

      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={(
          <div className="flex gap-2">
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
            <Button
              type="button"
              className="gap-2"
              onClick={() => void handleExport()}
              loading={exporting}
            >
              <Download className="size-4" aria-hidden />
              {t('export_csv')}
            </Button>
          </div>
        )}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <InputText
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder={t('filter_q')}
          className="w-full sm:max-w-xs"
        />
        <InputText
          value={entityType}
          onChange={(e) => {
            setPage(1);
            setEntityType(e.target.value);
          }}
          placeholder={t('filter_entity')}
          className="w-full sm:max-w-xs"
        />
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
          icon={ScrollText}
          title={t('empty_title')}
          description={t('empty_description')}
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <DataTable value={rows} dataKey="id" className="text-sm" stripedRows>
            <Column
              field="createdAt"
              header={t('col_when')}
              body={(row: AuditLogEntry) =>
                row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
              style={{ width: '11rem' }}
            />
            <Column field="action" header={t('col_action')} style={{ width: '10rem' }} />
            <Column field="entityType" header={t('col_entity')} style={{ width: '8rem' }} />
            <Column
              field="entityId"
              header={t('col_entity_id')}
              body={(row: AuditLogEntry) => (
                <span className="font-mono text-xs text-gray-600">
                  {row.entityId.slice(0, 8)}…
                </span>
              )}
              style={{ width: '7rem' }}
            />
            <Column
              field="actorId"
              header={t('col_actor')}
              body={(row: AuditLogEntry) => (
                <span className="font-mono text-xs text-gray-600">
                  {row.actorId.slice(0, 8)}…
                </span>
              )}
              style={{ width: '7rem' }}
            />
            <Column
              header={t('col_changes')}
              body={(row: AuditLogEntry) => changesSummary(row.changes)}
            />
          </DataTable>
          <Paginator
            first={(page - 1) * limit}
            rows={limit}
            totalRecords={total}
            onPageChange={(e) => setPage(Math.floor(e.first / e.rows) + 1)}
          />
        </>
      )}
    </div>
  );
}
