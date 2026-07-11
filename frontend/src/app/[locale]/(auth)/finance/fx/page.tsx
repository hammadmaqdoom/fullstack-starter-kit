'use client';

import type {
  CurrencyCode,
  ExchangeRate,
  FxFetchBatch,
  FxVarianceAlertConfig,
} from '@/libs/api/fx';
import {
  AlertCircle,
  Check,
  Coins,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  approveExchangeRate,
  getFxFetchStatus,
  listCurrencies,
  listExchangeRates,
  listFxVarianceAlertConfigs,
  overrideExchangeRate,
  upsertFxVarianceAlertConfig,
} from '@/libs/api/fx';

const STATUS_SEVERITY: Record<string, 'secondary' | 'success' | 'warning'> = {
  pending: 'warning',
  active: 'success',
  superseded: 'secondary',
};

const FETCH_STATUS_SEVERITY: Record<string, 'success' | 'warning' | 'danger'> = {
  success: 'success',
  partial: 'warning',
  failed: 'danger',
};

function toIsoDate(date: Date | null): string {
  if (!date) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

export default function FinanceFxPage() {
  const t = useTranslations('FinanceFx');
  const toast = useRef<Toast>(null);

  const [currencies, setCurrencies] = useState<CurrencyCode[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [fetchBatch, setFetchBatch] = useState<FxFetchBatch | null>(null);
  const [varianceConfigs, setVarianceConfigs] = useState<FxVarianceAlertConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideFrom, setOverrideFrom] = useState<string | null>(null);
  const [overrideTo, setOverrideTo] = useState<string | null>(null);
  const [overrideRate, setOverrideRateValue] = useState<number | null>(null);
  const [overrideEffectiveFrom, setOverrideEffectiveFrom] = useState<Date | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertFrom, setAlertFrom] = useState<string | null>(null);
  const [alertTo, setAlertTo] = useState<string | null>(null);
  const [alertThreshold, setAlertThreshold] = useState<number | null>(null);
  const [alertActive, setAlertActive] = useState(true);

  const currencyOptions = useMemo(
    () => currencies.map(c => ({ label: `${c.code} — ${c.name}`, value: c.code })),
    [currencies],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [currenciesRes, ratesRes, varianceRes] = await Promise.all([
        listCurrencies(),
        listExchangeRates(),
        listFxVarianceAlertConfigs(),
      ]);
      setCurrencies(currenciesRes.data);
      setRates(ratesRes.data);
      setVarianceConfigs(varianceRes.data);
      try {
        const statusRes = await getFxFetchStatus();
        setFetchBatch(statusRes.data);
      } catch {
        setFetchBatch(null);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setRates([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openOverrideDialog = () => {
    setOverrideError(null);
    setOverrideFrom(null);
    setOverrideTo(null);
    setOverrideRateValue(null);
    setOverrideEffectiveFrom(null);
    setOverrideReason('');
    setOverrideDialogOpen(true);
  };

  const handleOverrideSubmit = async () => {
    setOverrideError(null);
    if (!overrideFrom || !overrideTo) {
      setOverrideError(t('error_currencies_required'));
      return;
    }
    if (!overrideRate || overrideRate <= 0) {
      setOverrideError(t('error_rate_required'));
      return;
    }
    if (!overrideEffectiveFrom) {
      setOverrideError(t('error_effective_from_required'));
      return;
    }

    setOverrideSubmitting(true);
    try {
      await overrideExchangeRate({
        fromCurrency: overrideFrom,
        toCurrency: overrideTo,
        rate: overrideRate,
        effectiveFrom: toIsoDate(overrideEffectiveFrom),
        reason: overrideReason.trim() || undefined,
      });
      setOverrideDialogOpen(false);
      toast.current?.show({ severity: 'success', summary: t('override_success'), life: 3000 });
      await load();
    } catch (err) {
      setOverrideError(err instanceof ApiRequestError ? err.message : t('error_override'));
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const handleApprove = async (rate: ExchangeRate) => {
    setApprovingId(rate.id);
    setActionError(null);
    try {
      await approveExchangeRate(rate.id);
      await load();
      toast.current?.show({ severity: 'success', summary: t('approve_success'), life: 3000 });
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_approve'));
    } finally {
      setApprovingId(null);
    }
  };

  const openAlertDialog = () => {
    setAlertError(null);
    setAlertFrom(null);
    setAlertTo(null);
    setAlertThreshold(null);
    setAlertActive(true);
    setAlertDialogOpen(true);
  };

  const handleAlertSubmit = async () => {
    setAlertError(null);
    if (!alertFrom || !alertTo) {
      setAlertError(t('error_currencies_required'));
      return;
    }
    if (!alertThreshold || alertThreshold <= 0) {
      setAlertError(t('error_threshold_required'));
      return;
    }

    setAlertSubmitting(true);
    try {
      await upsertFxVarianceAlertConfig({
        fromCurrency: alertFrom,
        toCurrency: alertTo,
        thresholdPercent: alertThreshold,
        isActive: alertActive,
      });
      setAlertDialogOpen(false);
      toast.current?.show({ severity: 'success', summary: t('alert_config_success'), life: 3000 });
      await load();
    } catch (err) {
      setAlertError(err instanceof ApiRequestError ? err.message : t('error_alert_config'));
    } finally {
      setAlertSubmitting(false);
    }
  };

  if (isLoading && rates.length === 0 && !error) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <OfflineBanner />
        <PageSkeleton variant="table" rows={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
          <Button type="button" className="gap-2" onClick={openOverrideDialog}>
            <Plus className="size-4" aria-hidden />
            {t('override_rate')}
          </Button>
        </div>
      </div>

      {fetchBatch && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <Coins className="size-5 shrink-0 text-gray-400" aria-hidden />
          <div className="flex-1 text-sm text-gray-700">
            {t('fetch_status_label')}
            {' '}
            <Tag
              value={t(`fetch_status_${fetchBatch.status}`)}
              severity={FETCH_STATUS_SEVERITY[fetchBatch.status]}
              className="mx-1"
            />
            {t('fetch_status_at', { date: new Date(fetchBatch.fetchedAt).toLocaleString() })}
          </div>
        </div>
      )}

      {actionError && <Message severity="error" text={actionError} className="w-full" />}

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

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">{t('section_catalog')}</h2>
        {!error && rates.length === 0 && (
          <EmptyState
            icon={Coins}
            title={t('empty_title')}
            description={t('empty_description')}
            actionLabel={t('override_rate')}
            onAction={openOverrideDialog}
          />
        )}

        {!error && rates.length > 0 && (
          <DataTable value={rates} dataKey="id" className="text-sm" stripedRows loading={isLoading}>
            <Column field="fromCurrency" header={t('col_from')} style={{ width: '6rem' }} />
            <Column field="toCurrency" header={t('col_to')} style={{ width: '6rem' }} />
            <Column field="rate" header={t('col_rate')} />
            <Column field="effectiveFrom" header={t('col_effective_from')} style={{ width: '9rem' }} />
            <Column
              header={t('col_source')}
              body={(row: ExchangeRate) => t(`source_${row.source}`)}
              style={{ width: '9rem' }}
            />
            <Column
              header={t('col_status')}
              body={(row: ExchangeRate) => (
                <Tag value={t(`status_${row.status}`)} severity={STATUS_SEVERITY[row.status]} />
              )}
              style={{ width: '8rem' }}
            />
            <Column
              header=""
              body={(row: ExchangeRate) => (
                row.status === 'pending'
                  ? (
                      <Button
                        type="button"
                        size="small"
                        severity="success"
                        outlined
                        className="gap-1"
                        disabled={approvingId === row.id}
                        onClick={() => void handleApprove(row)}
                      >
                        <Check className="size-3.5" aria-hidden />
                        {t('approve')}
                      </Button>
                    )
                  : null
              )}
              style={{ width: '8rem' }}
            />
          </DataTable>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">{t('section_variance_alerts')}</h2>
          <Button type="button" size="small" severity="secondary" outlined className="gap-1" onClick={openAlertDialog}>
            <Plus className="size-3.5" aria-hidden />
            {t('add_alert_config')}
          </Button>
        </div>

        {varianceConfigs.length === 0
          ? (
              <p className="text-sm text-gray-500">{t('no_alert_configs')}</p>
            )
          : (
              <DataTable value={varianceConfigs} dataKey="id" className="text-sm" stripedRows>
                <Column field="fromCurrency" header={t('col_from')} style={{ width: '6rem' }} />
                <Column field="toCurrency" header={t('col_to')} style={{ width: '6rem' }} />
                <Column
                  header={t('col_threshold')}
                  body={(row: FxVarianceAlertConfig) => `${row.thresholdPercent}%`}
                />
                <Column
                  header={t('col_active')}
                  body={(row: FxVarianceAlertConfig) => (
                    <Tag value={row.isActive ? t('active') : t('inactive')} severity={row.isActive ? 'success' : 'secondary'} />
                  )}
                  style={{ width: '8rem' }}
                />
              </DataTable>
            )}
      </div>

      <Dialog
        header={t('override_dialog_title')}
        visible={overrideDialogOpen}
        onHide={() => setOverrideDialogOpen(false)}
        className="w-full max-w-md"
        modal
        dismissableMask
      >
        <div className="space-y-4 pt-1">
          {overrideError && <Message severity="error" text={overrideError} className="w-full" />}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="override-from" className="text-sm font-medium text-gray-700">{t('field_from')}</label>
              <Dropdown
                inputId="override-from"
                value={overrideFrom}
                options={currencyOptions}
                onChange={e => setOverrideFrom(e.value)}
                placeholder={t('field_currency_placeholder')}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="override-to" className="text-sm font-medium text-gray-700">{t('field_to')}</label>
              <Dropdown
                inputId="override-to"
                value={overrideTo}
                options={currencyOptions}
                onChange={e => setOverrideTo(e.value)}
                placeholder={t('field_currency_placeholder')}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="override-rate" className="text-sm font-medium text-gray-700">{t('field_rate')}</label>
            <InputNumber
              inputId="override-rate"
              value={overrideRate}
              onValueChange={e => setOverrideRateValue(e.value ?? null)}
              minFractionDigits={2}
              maxFractionDigits={8}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="override-effective-from" className="text-sm font-medium text-gray-700">{t('field_effective_from')}</label>
            <Calendar
              inputId="override-effective-from"
              value={overrideEffectiveFrom}
              onChange={e => setOverrideEffectiveFrom(e.value as Date | null)}
              dateFormat="yy-mm-dd"
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="override-reason" className="text-sm font-medium text-gray-700">{t('field_reason')}</label>
            <textarea
              id="override-reason"
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" severity="secondary" label={t('cancel')} onClick={() => setOverrideDialogOpen(false)} disabled={overrideSubmitting} />
            <Button type="button" label={overrideSubmitting ? t('submitting') : t('submit')} onClick={() => void handleOverrideSubmit()} loading={overrideSubmitting} />
          </div>
        </div>
      </Dialog>

      <Dialog
        header={t('alert_dialog_title')}
        visible={alertDialogOpen}
        onHide={() => setAlertDialogOpen(false)}
        className="w-full max-w-md"
        modal
        dismissableMask
      >
        <div className="space-y-4 pt-1">
          {alertError && <Message severity="error" text={alertError} className="w-full" />}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="alert-from" className="text-sm font-medium text-gray-700">{t('field_from')}</label>
              <Dropdown
                inputId="alert-from"
                value={alertFrom}
                options={currencyOptions}
                onChange={e => setAlertFrom(e.value)}
                placeholder={t('field_currency_placeholder')}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="alert-to" className="text-sm font-medium text-gray-700">{t('field_to')}</label>
              <Dropdown
                inputId="alert-to"
                value={alertTo}
                options={currencyOptions}
                onChange={e => setAlertTo(e.value)}
                placeholder={t('field_currency_placeholder')}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="alert-threshold" className="text-sm font-medium text-gray-700">{t('field_threshold')}</label>
            <InputNumber
              inputId="alert-threshold"
              value={alertThreshold}
              onValueChange={e => setAlertThreshold(e.value ?? null)}
              suffix="%"
              minFractionDigits={0}
              maxFractionDigits={2}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <InputSwitch checked={alertActive} onChange={e => setAlertActive(e.value)} />
            <label className="text-sm text-gray-700">{t('field_active')}</label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" severity="secondary" label={t('cancel')} onClick={() => setAlertDialogOpen(false)} disabled={alertSubmitting} />
            <Button type="button" label={alertSubmitting ? t('submitting') : t('submit')} onClick={() => void handleAlertSubmit()} loading={alertSubmitting} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
