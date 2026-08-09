'use client';

import type { DataTableStateEvent } from 'primereact/datatable';
import type { Worker, WorkerStatus } from '@/libs/api/workers';
import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiRequestError } from '@/libs/api/client';
import { listWorkers } from '@/libs/api/workers';
import { listDivisions, type Division } from '@/libs/api/org-admin';
import { Link } from '@/libs/I18nNavigation';

const COUNTRY_OPTIONS = [
  { label: 'Pakistan', value: 'PK' },
  { label: 'UAE', value: 'AE' },
  { label: 'Singapore', value: 'SG' },
];

const STATUS_OPTIONS: { label: string; value: WorkerStatus }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'On leave', value: 'on_leave' },
  { label: 'Separated', value: 'separated' },
  { label: 'Archived', value: 'archived' },
];

function statusSeverity(
  status: WorkerStatus,
): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
  switch (status) {
    case 'active':
      return 'success';
    case 'on_leave':
      return 'warning';
    case 'separated':
    case 'archived':
      return 'danger';
    case 'draft':
      return 'info';
    default:
      return 'secondary';
  }
}

export function WorkerList() {
  const t = useTranslations('Workers');

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [status, setStatus] = useState<WorkerStatus | null>(null);
  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listDivisions()
      .then((res) => setDivisions(res.data))
      .catch(() => setDivisions([]));
  }, []);

  const divisionName = useCallback(
    (id: string | null) => {
      if (!id) return '—';
      return divisions.find((d) => d.id === id)?.name ?? '—';
    },
    [divisions],
  );

  const divisionOptions = useMemo(
    () => divisions.map((d) => ({ label: d.name, value: d.id })),
    [divisions],
  );

  const loadWorkers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, meta } = await listWorkers({
        page,
        limit,
        q: searchQuery || undefined,
        countryCode: countryCode ?? undefined,
        status: status ?? undefined,
        divisionId: divisionId ?? undefined,
      });

      setWorkers(data);
      setTotalRecords(Number(meta.total ?? data.length));
    } catch (err) {
      const message
        = err instanceof ApiRequestError ? err.message : t('error_load');
      setError(message);
      setWorkers([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchQuery, countryCode, status, divisionId, t]);

  useEffect(() => {
    void loadWorkers();
  }, [loadWorkers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const onPage = (event: DataTableStateEvent) => {
    setPage((event.page ?? 0) + 1);
  };

  const nameBody = (row: Worker) => (
    <Link
      href={`/people-ops/workers/${row.id}`}
      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
    >
      {row.firstName}
      {' '}
      {row.lastName}
    </Link>
  );

  const typeBody = (row: Worker) =>
    row.employmentType?.displayName ?? row.employmentTypeId.slice(0, 8);

  const statusBody = (row: Worker) => (
    <Tag
      value={t(`status_${row.status}`)}
      severity={statusSeverity(row.status)}
      className="text-xs"
    />
  );

  if (error && !isLoading && workers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 px-6 py-12 text-center">
        <AlertCircle className="size-8 text-red-500" aria-hidden />
        <p className="text-sm text-red-700">{error}</p>
        <Button
          type="button"
          severity="danger"
          outlined
          onClick={() => void loadWorkers()}
          className="gap-2"
        >
          <RefreshCw className="size-4" aria-hidden />
          {t('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <InputText
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full pl-9"
            aria-label={t('search_placeholder')}
          />
        </div>
        <Dropdown
          value={countryCode}
          options={COUNTRY_OPTIONS}
          onChange={(e) => {
            setCountryCode(e.value as string | null);
            setPage(1);
          }}
          placeholder={t('filter_country')}
          showClear
          className="w-full sm:w-40"
        />
        <Dropdown
          value={divisionId}
          options={divisionOptions}
          onChange={(e) => {
            setDivisionId(e.value as string | null);
            setPage(1);
          }}
          placeholder={t('filter_division')}
          showClear
          className="w-full sm:w-40"
        />
        <Dropdown
          value={status}
          options={STATUS_OPTIONS.map(o => ({
            label: t(`status_${o.value}`),
            value: o.value,
          }))}
          onChange={(e) => {
            setStatus(e.value as WorkerStatus | null);
            setPage(1);
          }}
          placeholder={t('filter_status')}
          showClear
          className="w-full sm:w-40"
        />
      </div>

      {isLoading
        ? (
            <div className="space-y-2" aria-busy="true" aria-label={t('loading')}>
              {['a', 'b', 'c', 'd', 'e', 'f'].map(id => (
                <Skeleton key={id} height="2.5rem" className="w-full" />
              ))}
            </div>
          )
        : workers.length === 0
          ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-12 text-center">
                <p className="text-sm text-gray-600">{t('empty')}</p>
              </div>
            )
          : (
              <DataTable
                value={workers}
                lazy
                paginator
                rows={limit}
                totalRecords={totalRecords}
                first={(page - 1) * limit}
                onPage={onPage}
                rowsPerPageOptions={[25]}
                stripedRows
                size="small"
                className="text-sm"
                emptyMessage={t('empty')}
              >
                <Column header={t('col_name')} body={nameBody} sortable />
                <Column header={t('col_type')} body={typeBody} />
                <Column
                  header={t('col_division')}
                  body={(row: Worker) => divisionName(row.divisionId)}
                />
                <Column header={t('col_country')} field="countryCode" />
                <Column header={t('col_status')} body={statusBody} />
              </DataTable>
            )}
    </div>
  );
}
