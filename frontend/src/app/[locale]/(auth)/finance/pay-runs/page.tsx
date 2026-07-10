'use client';

import type { LegalEntity } from '@/libs/api/documents';
import type { PayRun, PayRunStatus } from '@/libs/api/payroll';
import {
  AlertCircle,
  Plus,
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
import { createPayRun, listPayRuns } from '@/libs/api/payroll';
import { useRouter } from '@/libs/I18nNavigation';

const STATUSES: PayRunStatus[] = ['draft', 'review', 'approved', 'exported', 'locked'];

const STATUS_SEVERITY: Record<PayRunStatus, 'secondary' | 'info' | 'warning' | 'success'> = {
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

export default function FinancePayRunsPage() {
  const t = useTranslations('FinancePayRuns');
  const router = useRouter();
  const toast = useRef<Toast>(null);

  const [payRuns, setPayRuns] = useState<PayRun[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLegalEntityId, setFilterLegalEntityId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<PayRunStatus | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [legalEntityId, setLegalEntityId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState('');
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);
  const [functionalCurrency, setFunctionalCurrency] = useState('');

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
      const { data } = await listPayRuns({
        legalEntityId: filterLegalEntityId ?? undefined,
        status: filterStatus ?? undefined,
      });
      setPayRuns(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setPayRuns([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterLegalEntityId, filterStatus, t]);

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

  const openDialog = () => {
    setFormError(null);
    setLegalEntityId(null);
    setCountryCode('');
    setPeriodStart(null);
    setPeriodEnd(null);
    setFunctionalCurrency('');
    setDialogOpen(true);
  };

  const handleLegalEntityChange = (id: string) => {
    setLegalEntityId(id);
    const entity = legalEntities.find(e => e.id === id);
    if (entity) {
      setCountryCode(entity.countryCode);
    }
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!legalEntityId) {
      setFormError(t('error_legal_entity_required'));
      return;
    }
    if (countryCode.trim().length !== 2) {
      setFormError(t('error_country_code_invalid'));
      return;
    }
    if (!periodStart || !periodEnd) {
      setFormError(t('error_period_required'));
      return;
    }
    if (functionalCurrency.trim().length !== 3) {
      setFormError(t('error_currency_invalid'));
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createPayRun({
        legalEntityId,
        countryCode: countryCode.trim().toUpperCase(),
        periodStart: toIsoDate(periodStart),
        periodEnd: toIsoDate(periodEnd),
        functionalCurrency: functionalCurrency.trim().toUpperCase(),
      });
      setDialogOpen(false);
      toast.current?.show({
        severity: 'success',
        summary: t('create_success_title'),
        detail: t('create_success_detail'),
        life: 3000,
      });
      await load();
      router.push(`/finance/pay-runs/${created.data.id}`);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t('error_create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && payRuns.length === 0 && !error) {
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
          <Button type="button" className="gap-2" onClick={openDialog}>
            <Plus className="size-4" aria-hidden />
            {t('create_pay_run')}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="filter-legal-entity" className="mb-1 block text-xs font-medium text-gray-600">
            {t('filter_legal_entity')}
          </label>
          <Dropdown
            inputId="filter-legal-entity"
            value={filterLegalEntityId}
            options={legalEntityOptions}
            onChange={e => setFilterLegalEntityId(e.value)}
            showClear
            placeholder={t('filter_all')}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="filter-status" className="mb-1 block text-xs font-medium text-gray-600">
            {t('filter_status')}
          </label>
          <Dropdown
            inputId="filter-status"
            value={filterStatus}
            options={STATUSES.map(value => ({ label: t(`status_${value}`), value }))}
            onChange={e => setFilterStatus(e.value)}
            showClear
            placeholder={t('filter_all')}
            className="w-full"
          />
        </div>
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

      {!error && !isLoading && payRuns.length === 0 && (
        <EmptyState
          icon={Wallet}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('create_pay_run')}
          onAction={openDialog}
        />
      )}

      {!error && payRuns.length > 0 && (
        <DataTable
          value={payRuns}
          dataKey="id"
          className="text-sm"
          stripedRows
          loading={isLoading}
          onRowClick={e => router.push(`/finance/pay-runs/${(e.data as PayRun).id}`)}
          rowClassName={() => 'cursor-pointer'}
        >
          <Column
            header={t('col_period')}
            body={(row: PayRun) => `${row.periodStart} – ${row.periodEnd}`}
          />
          <Column
            header={t('col_legal_entity')}
            body={(row: PayRun) => legalEntityLabel(row.legalEntityId)}
          />
          <Column field="countryCode" header={t('col_country')} style={{ width: '6rem' }} />
          <Column field="functionalCurrency" header={t('col_currency')} style={{ width: '7rem' }} />
          <Column
            header={t('col_status')}
            body={(row: PayRun) => (
              <Tag value={t(`status_${row.status}`)} severity={STATUS_SEVERITY[row.status]} />
            )}
            style={{ width: '9rem' }}
          />
        </DataTable>
      )}

      <Dialog
        header={t('create_dialog_title')}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-md"
        modal
        dismissableMask
      >
        <div className="space-y-4 pt-1">
          {formError && (
            <Message severity="error" text={formError} className="w-full" />
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pay-run-legal-entity" className="text-sm font-medium text-gray-700">
              {t('field_legal_entity')}
            </label>
            <Dropdown
              inputId="pay-run-legal-entity"
              value={legalEntityId}
              options={legalEntityOptions}
              onChange={e => handleLegalEntityChange(e.value)}
              placeholder={t('field_legal_entity_placeholder')}
              className="w-full"
              disabled={legalEntities.length === 0}
            />
            {legalEntities.length === 0 && (
              <p className="text-xs text-gray-500">{t('no_legal_entities')}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pay-run-country" className="text-sm font-medium text-gray-700">
              {t('field_country_code')}
            </label>
            <InputText
              id="pay-run-country"
              value={countryCode}
              onChange={e => setCountryCode(e.target.value.toUpperCase())}
              maxLength={2}
              className="w-full"
              placeholder={t('field_country_code_placeholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pay-run-period-start" className="text-sm font-medium text-gray-700">
                {t('field_period_start')}
              </label>
              <Calendar
                inputId="pay-run-period-start"
                value={periodStart}
                onChange={e => setPeriodStart(e.value as Date | null)}
                dateFormat="yy-mm-dd"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pay-run-period-end" className="text-sm font-medium text-gray-700">
                {t('field_period_end')}
              </label>
              <Calendar
                inputId="pay-run-period-end"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.value as Date | null)}
                dateFormat="yy-mm-dd"
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pay-run-currency" className="text-sm font-medium text-gray-700">
              {t('field_currency')}
            </label>
            <InputText
              id="pay-run-currency"
              value={functionalCurrency}
              onChange={e => setFunctionalCurrency(e.target.value.toUpperCase())}
              maxLength={3}
              className="w-full"
              placeholder={t('field_currency_placeholder')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              severity="secondary"
              label={t('cancel')}
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            />
            <Button
              type="button"
              label={isSubmitting ? t('submitting') : t('submit')}
              onClick={() => void handleSubmit()}
              loading={isSubmitting}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
