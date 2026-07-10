'use client';

import type { LegalEntity } from '@/libs/api/documents';
import type {
  StatutoryRateSchedule,
  StatutoryRateUnit,
  StatutoryScheduleStatus,
} from '@/libs/api/payroll';
import {
  AlertCircle,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
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
  activateStatutoryRateSchedule,
  createStatutoryRateSchedule,
  listStatutoryRateSchedules,
} from '@/libs/api/payroll';

const RATE_UNITS: StatutoryRateUnit[] = ['percentage', 'fixed_amount'];

const STATUS_SEVERITY: Record<StatutoryScheduleStatus, 'secondary' | 'success' | 'warning'> = {
  draft: 'secondary',
  active: 'success',
  superseded: 'warning',
};

function toIsoDate(date: Date | null): string {
  if (!date) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

export default function FinanceStatutoryRatesPage() {
  const t = useTranslations('FinanceStatutory');
  const toast = useRef<Toast>(null);

  const [schedules, setSchedules] = useState<StatutoryRateSchedule[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [legalEntityId, setLegalEntityId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState('');
  const [name, setName] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState<Date | null>(null);
  const [rateKey, setRateKey] = useState('');
  const [rateValue, setRateValue] = useState<number | null>(null);
  const [rateUnit, setRateUnit] = useState<StatutoryRateUnit>('percentage');

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
      const { data } = await listStatutoryRateSchedules();
      setSchedules(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
    setName('');
    setEffectiveFrom(null);
    setRateKey('');
    setRateValue(null);
    setRateUnit('percentage');
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
    if (!name.trim()) {
      setFormError(t('error_name_required'));
      return;
    }
    if (!effectiveFrom) {
      setFormError(t('error_effective_from_required'));
      return;
    }

    setIsSubmitting(true);
    try {
      await createStatutoryRateSchedule({
        legalEntityId,
        countryCode: countryCode.trim().toUpperCase(),
        name: name.trim(),
        effectiveFrom: toIsoDate(effectiveFrom),
        entries: rateKey.trim() && rateValue !== null
          ? [{ rateKey: rateKey.trim(), rateValue, rateUnit }]
          : undefined,
      });
      setDialogOpen(false);
      toast.current?.show({
        severity: 'success',
        summary: t('create_success'),
        life: 3000,
      });
      await load();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t('error_create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (schedule: StatutoryRateSchedule) => {
    setActivatingId(schedule.id);
    setActionError(null);
    try {
      await activateStatutoryRateSchedule(schedule.id);
      await load();
      toast.current?.show({
        severity: 'success',
        summary: t('activate_success'),
        life: 3000,
      });
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_activate'));
    } finally {
      setActivatingId(null);
    }
  };

  if (isLoading && schedules.length === 0 && !error) {
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
          <Button type="button" className="gap-2" onClick={openDialog}>
            <Plus className="size-4" aria-hidden />
            {t('create_schedule')}
          </Button>
        </div>
      </div>

      {actionError && (
        <Message severity="error" text={actionError} className="w-full" />
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

      {!error && !isLoading && schedules.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('create_schedule')}
          onAction={openDialog}
        />
      )}

      {!error && schedules.length > 0 && (
        <DataTable value={schedules} dataKey="id" className="text-sm" stripedRows loading={isLoading}>
          <Column field="name" header={t('col_name')} />
          <Column
            header={t('col_legal_entity')}
            body={(row: StatutoryRateSchedule) => legalEntityLabel(row.legalEntityId)}
          />
          <Column field="countryCode" header={t('col_country')} style={{ width: '6rem' }} />
          <Column field="effectiveFrom" header={t('col_effective_from')} style={{ width: '9rem' }} />
          <Column
            header={t('col_status')}
            body={(row: StatutoryRateSchedule) => (
              <Tag value={t(`status_${row.status}`)} severity={STATUS_SEVERITY[row.status]} />
            )}
            style={{ width: '8rem' }}
          />
          <Column
            header=""
            body={(row: StatutoryRateSchedule) => (
              row.status === 'draft'
                ? (
                    <Button
                      type="button"
                      size="small"
                      severity="secondary"
                      outlined
                      className="gap-1"
                      disabled={activatingId === row.id}
                      onClick={() => void handleActivate(row)}
                    >
                      <Power className="size-3.5" aria-hidden />
                      {t('activate')}
                    </Button>
                  )
                : null
            )}
            style={{ width: '8rem' }}
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
            <label htmlFor="schedule-legal-entity" className="text-sm font-medium text-gray-700">
              {t('field_legal_entity')}
            </label>
            <Dropdown
              inputId="schedule-legal-entity"
              value={legalEntityId}
              options={legalEntityOptions}
              onChange={e => handleLegalEntityChange(e.value)}
              placeholder={t('field_legal_entity_placeholder')}
              className="w-full"
              disabled={legalEntities.length === 0}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="schedule-country" className="text-sm font-medium text-gray-700">
              {t('field_country_code')}
            </label>
            <InputText
              id="schedule-country"
              value={countryCode}
              onChange={e => setCountryCode(e.target.value.toUpperCase())}
              maxLength={2}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="schedule-name" className="text-sm font-medium text-gray-700">
              {t('field_name')}
            </label>
            <InputText id="schedule-name" value={name} onChange={e => setName(e.target.value)} className="w-full" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="schedule-effective-from" className="text-sm font-medium text-gray-700">
              {t('field_effective_from')}
            </label>
            <Calendar
              inputId="schedule-effective-from"
              value={effectiveFrom}
              onChange={e => setEffectiveFrom(e.value as Date | null)}
              dateFormat="yy-mm-dd"
              className="w-full"
            />
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-medium text-gray-600">{t('field_first_entry_optional')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="schedule-rate-key" className="text-sm font-medium text-gray-700">
                  {t('field_rate_key')}
                </label>
                <InputText
                  id="schedule-rate-key"
                  value={rateKey}
                  onChange={e => setRateKey(e.target.value)}
                  className="w-full"
                  placeholder={t('field_rate_key_placeholder')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="schedule-rate-unit" className="text-sm font-medium text-gray-700">
                  {t('field_rate_unit')}
                </label>
                <Dropdown
                  inputId="schedule-rate-unit"
                  value={rateUnit}
                  options={RATE_UNITS.map(value => ({ label: t(`rate_unit_${value}`), value }))}
                  onChange={e => setRateUnit(e.value)}
                  className="w-full"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <label htmlFor="schedule-rate-value" className="text-sm font-medium text-gray-700">
                {t('field_rate_value')}
              </label>
              <InputNumber
                inputId="schedule-rate-value"
                value={rateValue}
                onValueChange={e => setRateValue(e.value ?? null)}
                minFractionDigits={0}
                maxFractionDigits={6}
                className="w-full"
              />
            </div>
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
