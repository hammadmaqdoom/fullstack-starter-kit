'use client';

import type { LegalEntity } from '@/libs/api/documents';
import type {
  ContractorPaymentBatch,
  ContractorPaymentBatchDetail,
  ContractorPaymentBatchStatus,
  ContractorPaymentLine,
} from '@/libs/api/payroll';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Plus,
  Receipt,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { listLegalEntities } from '@/libs/api/documents';
import {
  approveContractorPaymentBatch,
  createContractorPaymentBatch,
  exportContractorPaymentBatch,
  getContractorPaymentBatch,
  listContractorPaymentBatches,
  markContractorPaymentLinePaid,
} from '@/libs/api/payroll';

const STATUS_SEVERITY: Record<ContractorPaymentBatchStatus, 'secondary' | 'info' | 'warning' | 'success'> = {
  draft: 'secondary',
  review: 'info',
  approved: 'warning',
  exported: 'success',
  locked: 'success',
};

function toIsoDate(date: Date | null): string {
  if (!date) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

export default function FinanceContractorPaymentsPage() {
  const t = useTranslations('FinanceContractorPayments');
  const toast = useRef<Toast>(null);

  const [batches, setBatches] = useState<ContractorPaymentBatch[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ContractorPaymentBatchStatus | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [legalEntityId, setLegalEntityId] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);
  const [currencyCode, setCurrencyCode] = useState('');

  const [selectedBatch, setSelectedBatch] = useState<ContractorPaymentBatchDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<'approve' | 'export' | null>(null);

  const [payTarget, setPayTarget] = useState<ContractorPaymentLine | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentValueDate, setPaymentValueDate] = useState<Date | null>(null);
  const [swiftUetr, setSwiftUetr] = useState('');
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const legalEntityOptions = useMemo(
    () => legalEntities.map(entity => ({
      label: entity.tradingName?.trim() || entity.registeredName,
      value: entity.id,
    })),
    [legalEntities],
  );

  const legalEntityLabel = useCallback((id: string) => {
    const entity = legalEntities.find(e => e.id === id);
    return entity ? (entity.tradingName?.trim() || entity.registeredName) : id.slice(0, 8);
  }, [legalEntities]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listContractorPaymentBatches({ status: filterStatus ?? undefined });
      setBatches(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, t]);

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

  const openCreateDialog = () => {
    setCreateError(null);
    setLegalEntityId(null);
    setPeriodStart(null);
    setPeriodEnd(null);
    setCurrencyCode('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    setCreateError(null);
    if (!legalEntityId) {
      setCreateError(t('error_legal_entity_required'));
      return;
    }
    if (!periodStart || !periodEnd) {
      setCreateError(t('error_period_required'));
      return;
    }
    if (currencyCode.trim().length !== 3) {
      setCreateError(t('error_currency_invalid'));
      return;
    }

    setIsCreating(true);
    try {
      const created = await createContractorPaymentBatch({
        legalEntityId,
        periodStart: toIsoDate(periodStart),
        periodEnd: toIsoDate(periodEnd),
        currencyCode: currencyCode.trim().toUpperCase(),
      });
      setCreateOpen(false);
      await load();
      toast.current?.show({ severity: 'success', summary: t('create_success'), life: 3000 });
      setSelectedBatch(created.data);
    } catch (err) {
      setCreateError(err instanceof ApiRequestError ? err.message : t('error_create'));
    } finally {
      setIsCreating(false);
    }
  };

  const openDetail = async (batchId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedBatch(null);
    try {
      const { data } = await getContractorPaymentBatch(batchId);
      setSelectedBatch(data);
    } catch (err) {
      setDetailError(err instanceof ApiRequestError ? err.message : t('error_load_detail'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedBatch) {
      return;
    }
    setActioning('approve');
    setDetailError(null);
    try {
      await approveContractorPaymentBatch(selectedBatch.id);
      await openDetail(selectedBatch.id);
      await load();
      toast.current?.show({ severity: 'success', summary: t('approve_success'), life: 3000 });
    } catch (err) {
      setDetailError(err instanceof ApiRequestError ? err.message : t('error_approve'));
    } finally {
      setActioning(null);
    }
  };

  const handleExport = async () => {
    if (!selectedBatch) {
      return;
    }
    setActioning('export');
    setDetailError(null);
    try {
      const { data } = await exportContractorPaymentBatch(selectedBatch.id);
      if (typeof window !== 'undefined') {
        window.open(data.blobUrl, '_blank', 'noopener,noreferrer');
      }
      await openDetail(selectedBatch.id);
      await load();
      toast.current?.show({ severity: 'success', summary: t('export_success'), life: 3000 });
    } catch (err) {
      setDetailError(err instanceof ApiRequestError ? err.message : t('error_export'));
    } finally {
      setActioning(null);
    }
  };

  const openPayDialog = (line: ContractorPaymentLine) => {
    setPayTarget(line);
    setPaymentReference('');
    setPaymentValueDate(null);
    setSwiftUetr('');
    setPayError(null);
  };

  const handleMarkPaid = async () => {
    if (!payTarget) {
      return;
    }
    if (!paymentReference.trim()) {
      setPayError(t('error_payment_reference_required'));
      return;
    }
    setIsMarkingPaid(true);
    setPayError(null);
    try {
      await markContractorPaymentLinePaid(payTarget.id, {
        paymentReference: paymentReference.trim(),
        paymentValueDate: toIsoDate(paymentValueDate) || undefined,
        swiftUetr: swiftUetr.trim() || undefined,
      });
      setPayTarget(null);
      if (selectedBatch) {
        await openDetail(selectedBatch.id);
      }
      toast.current?.show({ severity: 'success', summary: t('mark_paid_success'), life: 3000 });
    } catch (err) {
      setPayError(err instanceof ApiRequestError ? err.message : t('error_mark_paid'));
    } finally {
      setIsMarkingPaid(false);
    }
  };

  if (isLoading && batches.length === 0 && !error) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <OfflineBanner />
        <PageSkeleton variant="table" rows={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <OfflineBanner />
      <Toast ref={toast} position="top-center" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2 self-start">
          <Button
            type="button"
            severity="secondary"
            outlined
            className="gap-2"
            onClick={() => void load()}
            disabled={isLoading}
          >
            <RefreshCw className="size-4" aria-hidden />
            {t('refresh')}
          </Button>
          <Button type="button" className="gap-2" onClick={openCreateDialog}>
            <Plus className="size-4" aria-hidden />
            {t('create_batch')}
          </Button>
        </div>
      </div>

      <div className="max-w-xs rounded-xl border border-gray-200 bg-white p-4">
        <label htmlFor="filter-status" className="mb-1 block text-xs font-medium text-gray-600">
          {t('filter_status')}
        </label>
        <Dropdown
          inputId="filter-status"
          value={filterStatus}
          options={(['draft', 'review', 'approved', 'exported', 'locked'] as ContractorPaymentBatchStatus[]).map(value => ({
            label: t(`status_${value}`),
            value,
          }))}
          onChange={e => setFilterStatus(e.value)}
          showClear
          placeholder={t('filter_all')}
          className="w-full"
        />
      </div>

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

      {!error && !isLoading && batches.length === 0 && (
        <EmptyState
          icon={Wallet}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('create_batch')}
          onAction={openCreateDialog}
        />
      )}

      {!error && batches.length > 0 && (
        <DataTable
          value={batches}
          dataKey="id"
          className="text-sm"
          stripedRows
          loading={isLoading}
          onRowClick={e => void openDetail((e.data as ContractorPaymentBatch).id)}
          rowClassName={() => 'cursor-pointer'}
        >
          <Column
            header={t('col_period')}
            body={(row: ContractorPaymentBatch) => `${row.periodStart} – ${row.periodEnd}`}
          />
          <Column
            header={t('col_legal_entity')}
            body={(row: ContractorPaymentBatch) => legalEntityLabel(row.legalEntityId)}
          />
          <Column
            header={t('col_total')}
            body={(row: ContractorPaymentBatch) => `${row.totalAmount} ${row.currencyCode}`}
          />
          <Column
            header={t('col_status')}
            body={(row: ContractorPaymentBatch) => (
              <Tag value={t(`status_${row.status}`)} severity={STATUS_SEVERITY[row.status]} />
            )}
            style={{ width: '9rem' }}
          />
        </DataTable>
      )}

      <Dialog
        header={t('create_dialog_title')}
        visible={createOpen}
        onHide={() => setCreateOpen(false)}
        className="w-full max-w-md"
        modal
        dismissableMask
      >
        <div className="space-y-4 pt-1">
          {createError && <Message severity="error" text={createError} className="w-full" />}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="batch-legal-entity" className="text-sm font-medium text-gray-700">
              {t('field_legal_entity')}
            </label>
            <Dropdown
              inputId="batch-legal-entity"
              value={legalEntityId}
              options={legalEntityOptions}
              onChange={e => setLegalEntityId(e.value)}
              placeholder={t('field_legal_entity_placeholder')}
              className="w-full"
              disabled={legalEntities.length === 0}
            />
            <p className="text-xs text-gray-500">{t('create_dialog_hint')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="batch-period-start" className="text-sm font-medium text-gray-700">
                {t('field_period_start')}
              </label>
              <Calendar
                inputId="batch-period-start"
                value={periodStart}
                onChange={e => setPeriodStart(e.value as Date | null)}
                dateFormat="yy-mm-dd"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="batch-period-end" className="text-sm font-medium text-gray-700">
                {t('field_period_end')}
              </label>
              <Calendar
                inputId="batch-period-end"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.value as Date | null)}
                dateFormat="yy-mm-dd"
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="batch-currency" className="text-sm font-medium text-gray-700">
              {t('field_currency')}
            </label>
            <InputText
              id="batch-currency"
              value={currencyCode}
              onChange={e => setCurrencyCode(e.target.value.toUpperCase())}
              maxLength={3}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              severity="secondary"
              label={t('cancel')}
              onClick={() => setCreateOpen(false)}
              disabled={isCreating}
            />
            <Button
              type="button"
              label={isCreating ? t('creating') : t('create')}
              onClick={() => void handleCreate()}
              loading={isCreating}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header={selectedBatch ? t('detail_dialog_title', { period: `${selectedBatch.periodStart} – ${selectedBatch.periodEnd}` }) : t('detail_dialog_title_loading')}
        visible={detailLoading || selectedBatch !== null}
        onHide={() => setSelectedBatch(null)}
        className="w-full max-w-3xl"
        modal
        dismissableMask
      >
        {detailLoading && <PageSkeleton variant="detail" rows={3} showHeader={false} />}

        {!detailLoading && detailError && (
          <Message severity="error" text={detailError} className="w-full" />
        )}

        {!detailLoading && selectedBatch && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Tag value={t(`status_${selectedBatch.status}`)} severity={STATUS_SEVERITY[selectedBatch.status]} />
                <span className="text-sm text-gray-600">
                  {legalEntityLabel(selectedBatch.legalEntityId)} · {selectedBatch.totalAmount} {selectedBatch.currencyCode}
                </span>
              </div>
              <div className="flex gap-2">
                {selectedBatch.status === 'review' && (
                  <Button
                    type="button"
                    className="gap-2"
                    onClick={() => void handleApprove()}
                    loading={actioning === 'approve'}
                  >
                    <CheckCircle2 className="size-4" aria-hidden />
                    {t('approve_batch')}
                  </Button>
                )}
                {(selectedBatch.status === 'approved' || selectedBatch.status === 'exported') && (
                  <Button
                    type="button"
                    severity="secondary"
                    outlined
                    className="gap-2"
                    onClick={() => void handleExport()}
                    loading={actioning === 'export'}
                  >
                    <Download className="size-4" aria-hidden />
                    {t('export_batch')}
                  </Button>
                )}
              </div>
            </div>

            {selectedBatch.lines.length === 0 && (
              <EmptyState icon={Receipt} title={t('no_lines_title')} />
            )}

            {selectedBatch.lines.length > 0 && (
              <DataTable value={selectedBatch.lines} dataKey="id" className="text-sm" stripedRows>
                <Column
                  header={t('col_worker')}
                  body={(row: ContractorPaymentLine) => (row.worker ? `${row.worker.firstName} ${row.worker.lastName}` : row.workerId.slice(0, 8))}
                />
                <Column field="amount" header={t('col_amount')} />
                <Column
                  header={t('col_payment_status')}
                  body={(row: ContractorPaymentLine) => (
                    row.paidAt
                      ? <Tag value={t('paid_on', { date: row.paymentValueDate ?? row.paidAt.slice(0, 10) })} severity="success" />
                      : <Tag value={t('unpaid')} severity="secondary" />
                  )}
                />
                <Column
                  header=""
                  body={(row: ContractorPaymentLine) => (
                    !row.paidAt && (
                      <Button
                        type="button"
                        size="small"
                        severity="secondary"
                        outlined
                        onClick={() => openPayDialog(row)}
                      >
                        {t('mark_paid')}
                      </Button>
                    )
                  )}
                  style={{ width: '8rem' }}
                />
              </DataTable>
            )}
          </div>
        )}
      </Dialog>

      <Dialog
        header={t('mark_paid_dialog_title')}
        visible={payTarget !== null}
        onHide={() => setPayTarget(null)}
        className="w-full max-w-sm"
        modal
        dismissableMask
      >
        <div className="space-y-4 pt-1">
          {payError && <Message severity="error" text={payError} className="w-full" />}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pay-reference" className="text-sm font-medium text-gray-700">
              {t('field_payment_reference')}
            </label>
            <InputText
              id="pay-reference"
              value={paymentReference}
              onChange={e => setPaymentReference(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pay-value-date" className="text-sm font-medium text-gray-700">
              {t('field_payment_value_date')}
            </label>
            <Calendar
              inputId="pay-value-date"
              value={paymentValueDate}
              onChange={e => setPaymentValueDate(e.value as Date | null)}
              dateFormat="yy-mm-dd"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pay-swift" className="text-sm font-medium text-gray-700">
              {t('field_swift_uetr')}
            </label>
            <InputText
              id="pay-swift"
              value={swiftUetr}
              onChange={e => setSwiftUetr(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" severity="secondary" label={t('cancel')} onClick={() => setPayTarget(null)} disabled={isMarkingPaid} />
            <Button
              type="button"
              label={isMarkingPaid ? t('saving') : t('mark_paid')}
              onClick={() => void handleMarkPaid()}
              loading={isMarkingPaid}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
