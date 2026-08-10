'use client';

import type { TrackerStep } from '@/components/shared/StatusTracker';
import type { LegalEntity } from '@/libs/api/documents';
import type {
  ExportFileFormat,
  PayRunDetail,
  PayRunLineItem,
  PayRunStatus,
} from '@/libs/api/payroll';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Download,
  RefreshCw,
  Send,
  Wallet,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { listLegalEntities } from '@/libs/api/documents';
import {
  approvePayRun,
  calculatePayRun,
  exportPayRun,
  getPayRun,
  releasePayslips,
} from '@/libs/api/payroll';
import { Link } from '@/libs/I18nNavigation';

const EXPORT_FORMATS: ExportFileFormat[] = ['xlsx', 'csv', 'pdf'];

const STATUS_SEVERITY: Record<PayRunStatus, 'secondary' | 'info' | 'warning' | 'success'> = {
  draft: 'secondary',
  review: 'info',
  approved: 'warning',
  exported: 'success',
  locked: 'success',
};

function payRunTrackerSteps(
  status: PayRunStatus,
  labels: Record<PayRunStatus, string>,
): TrackerStep[] {
  const order: PayRunStatus[] = ['draft', 'review', 'approved', 'exported', 'locked'];
  const currentIdx = order.indexOf(status);

  return order.map((step, idx) => ({
    label: labels[step],
    state: idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : 'todo',
  }));
}

export default function FinancePayRunDetailPage() {
  const t = useTranslations('FinancePayRuns');
  const params = useParams<{ id: string }>();
  const payRunId = params.id;
  const toast = useRef<Toast>(null);

  const [payRun, setPayRun] = useState<PayRunDetail | null>(null);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<
    'calculate' | 'approve' | 'release' | 'export' | null
  >(null);
  const [exportFormat, setExportFormat] = useState<ExportFileFormat>('xlsx');
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  const statusLabels = useMemo(
    () => ({
      draft: t('status_draft'),
      review: t('status_review'),
      approved: t('status_approved'),
      exported: t('status_exported'),
      locked: t('status_locked'),
    }),
    [t],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await getPayRun(payRunId);
      setPayRun(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setPayRun(null);
    } finally {
      setIsLoading(false);
    }
  }, [payRunId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    async function loadLegalEntities() {
      try {
        const { data } = await listLegalEntities();
        setLegalEntities(data);
      } catch {
        setLegalEntities([]);
      }
    }
    void loadLegalEntities();
  }, []);

  const legalEntityLabel = useCallback((id: string) => {
    const entity = legalEntities.find(e => e.id === id);
    return entity ? (entity.tradingName?.trim() || entity.registeredName) : id.slice(0, 8);
  }, [legalEntities]);

  const handleCalculate = async () => {
    setActioning('calculate');
    setActionError(null);
    try {
      const { data } = await calculatePayRun(payRunId);
      setPayRun(data);
      toast.current?.show({
        severity: 'success',
        summary: t('calculate_success'),
        life: 3000,
      });
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_calculate'));
    } finally {
      setActioning(null);
    }
  };

  const handleApprove = async () => {
    setApproveConfirmOpen(false);
    setActioning('approve');
    setActionError(null);
    try {
      await approvePayRun(payRunId);
      await load();
      toast.current?.show({
        severity: 'success',
        summary: t('approve_success'),
        life: 3000,
      });
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_approve'));
    } finally {
      setActioning(null);
    }
  };

  const handleRelease = async () => {
    setActioning('release');
    setActionError(null);
    try {
      const { data } = await releasePayslips(payRunId);
      toast.current?.show({
        severity: 'success',
        summary: t('release_success'),
        detail: t('release_success_detail', { count: data.length }),
        life: 4000,
      });
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_release'));
    } finally {
      setActioning(null);
    }
  };

  const handleExport = async () => {
    setActioning('export');
    setActionError(null);
    try {
      const { data } = await exportPayRun(payRunId, { fileFormat: exportFormat });
      await load();
      if (typeof window !== 'undefined' && data.blobUrl) {
        window.open(data.blobUrl, '_blank', 'noopener,noreferrer');
      }
      toast.current?.show({
        severity: 'success',
        summary: t('export_success'),
        life: 3000,
      });
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_export'));
    } finally {
      setActioning(null);
    }
  };

  if (isLoading && !payRun && !error) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <OfflineBanner />
        <PageSkeleton variant="detail" rows={4} />
      </div>
    );
  }

  if (!isLoading && error) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <OfflineBanner />
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
      </div>
    );
  }

  if (!payRun) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <EmptyState title={t('not_found_title')} description={t('not_found_description')} />
      </div>
    );
  }

  const canCalculate = payRun.status === 'draft' || payRun.status === 'review';
  const canApprove = payRun.status === 'review';
  const canRelease = payRun.status === 'approved' || payRun.status === 'exported' || payRun.status === 'locked';
  const canExport = payRun.status === 'approved' || payRun.status === 'exported';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <OfflineBanner />
      <Toast ref={toast} position="top-center" />

      <Link
        href="/finance/pay-runs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('back_to_list')}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">
              {payRun.periodStart}
              {' – '}
              {payRun.periodEnd}
            </h1>
            <Tag value={statusLabels[payRun.status]} severity={STATUS_SEVERITY[payRun.status]} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {legalEntityLabel(payRun.legalEntityId)}
            {' · '}
            {payRun.countryCode}
            {' · '}
            {payRun.functionalCurrency}
          </p>
        </div>
        <Button
          type="button"
          severity="secondary"
          outlined
          className="gap-2 self-start"
          onClick={() => void load()}
          disabled={isLoading}
        >
          <RefreshCw className="size-4" aria-hidden />
          {t('refresh')}
        </Button>
      </div>

      <StatusTracker steps={payRunTrackerSteps(payRun.status, statusLabels)} />

      {actionError && (
        <Message severity="error" text={actionError} className="w-full" />
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-4">
        <Button
          type="button"
          className="gap-2"
          disabled={!canCalculate || actioning !== null}
          loading={actioning === 'calculate'}
          onClick={() => void handleCalculate()}
        >
          <Calculator className="size-4" aria-hidden />
          {t('action_calculate')}
        </Button>
        <Button
          type="button"
          severity="success"
          className="gap-2"
          disabled={!canApprove || actioning !== null}
          loading={actioning === 'approve'}
          onClick={() => setApproveConfirmOpen(true)}
        >
          <CheckCircle2 className="size-4" aria-hidden />
          {t('action_approve')}
        </Button>
        <Button
          type="button"
          severity="secondary"
          className="gap-2"
          disabled={!canRelease || actioning !== null}
          loading={actioning === 'release'}
          onClick={() => void handleRelease()}
        >
          <Send className="size-4" aria-hidden />
          {t('action_release')}
        </Button>
        <div className="flex items-end gap-2">
          <Dropdown
            value={exportFormat}
            options={EXPORT_FORMATS.map(value => ({ label: value.toUpperCase(), value }))}
            onChange={e => setExportFormat(e.value)}
            disabled={!canExport || actioning !== null}
            className="w-28"
          />
          <Button
            type="button"
            severity="secondary"
            outlined
            className="gap-2"
            disabled={!canExport || actioning !== null}
            loading={actioning === 'export'}
            onClick={() => void handleExport()}
          >
            <Download className="size-4" aria-hidden />
            {t('action_export')}
          </Button>
        </div>
        {canExport && (
          <Link
            href={`/finance/payouts/generate?batchType=payroll&legalEntityId=${payRun.legalEntityId}&sourceId=${payRun.id}`}
          >
            <Button type="button" outlined className="gap-2">
              <Wallet className="size-4" aria-hidden />
              {t('action_generate_payout')}
            </Button>
          </Link>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">{t('line_items_title')}</h2>
        {payRun.lineItems.length === 0
          ? (
              <EmptyState
                title={t('line_items_empty_title')}
                description={t('line_items_empty_description')}
              />
            )
          : (
              <DataTable value={payRun.lineItems} dataKey="id" className="text-sm" stripedRows>
                <Column
                  header={t('col_worker')}
                  body={(row: PayRunLineItem) => row.workerId.slice(0, 8)}
                />
                <Column field="grossPay" header={t('col_gross_pay')} />
                <Column field="totalDeductions" header={t('col_deductions')} />
                <Column field="netPay" header={t('col_net_pay')} />
                <Column field="currencyCode" header={t('col_currency')} style={{ width: '6rem' }} />
                <Column
                  header={t('col_anomalies')}
                  body={(row: PayRunLineItem) => (
                    row.anomalyFlags.length > 0
                      ? (
                          <div className="flex flex-wrap gap-1">
                            {row.anomalyFlags.map(flag => (
                              <Tag
                                key={flag}
                                severity="warning"
                                className="gap-1"
                                value={(
                                  <span className="inline-flex items-center gap-1">
                                    <AlertTriangle className="size-3" aria-hidden />
                                    {flag}
                                  </span>
                                )}
                              />
                            ))}
                          </div>
                        )
                      : (
                          <span className="text-gray-400">—</span>
                        )
                  )}
                />
              </DataTable>
            )}
      </div>

      <Dialog
        header={t('approve_confirm_title')}
        visible={approveConfirmOpen}
        onHide={() => setApproveConfirmOpen(false)}
        className="w-full max-w-md"
        modal
        dismissableMask
        footer={(
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              severity="secondary"
              outlined
              label={t('cancel')}
              onClick={() => setApproveConfirmOpen(false)}
            />
            <Button
              type="button"
              severity="success"
              label={t('approve_confirm_action')}
              onClick={() => void handleApprove()}
            />
          </div>
        )}
      >
        <p className="text-sm text-gray-600">{t('approve_confirm_body')}</p>
      </Dialog>
    </div>
  );
}
