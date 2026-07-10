'use client';

import type {
  BenefitDeliveryMode,
  BenefitType,
} from '@/libs/api/payroll';
import {
  AlertCircle,
  Gift,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { createBenefitType, listBenefitTypes } from '@/libs/api/payroll';

const DELIVERY_MODES: BenefitDeliveryMode[] = ['cash', 'non_cash', 'insurance'];

const STATUS_SEVERITY: Record<string, 'secondary' | 'success' | 'warning'> = {
  draft: 'secondary',
  active: 'success',
  archived: 'warning',
};

export default function FinanceBenefitsPage() {
  const t = useTranslations('FinanceBenefits');
  const toast = useRef<Toast>(null);

  const [benefitTypes, setBenefitTypes] = useState<BenefitType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<BenefitDeliveryMode>('non_cash');
  const [affectsPayroll, setAffectsPayroll] = useState(false);
  const [employeeVisible, setEmployeeVisible] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listBenefitTypes();
      setBenefitTypes(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setBenefitTypes([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = () => {
    setFormError(null);
    setCode('');
    setName('');
    setCategory('');
    setCountryCode('');
    setDeliveryMode('non_cash');
    setAffectsPayroll(false);
    setEmployeeVisible(true);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!code.trim() || !name.trim() || !category.trim()) {
      setFormError(t('error_required_fields'));
      return;
    }

    setIsSubmitting(true);
    try {
      await createBenefitType({
        code: code.trim(),
        name: name.trim(),
        category: category.trim(),
        countryCode: countryCode.trim() ? countryCode.trim().toUpperCase() : undefined,
        deliveryMode,
        affectsPayroll,
        employeeVisible,
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

  if (isLoading && benefitTypes.length === 0 && !error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <OfflineBanner />
        <PageSkeleton variant="table" rows={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
            {t('create_benefit_type')}
          </Button>
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

      {!error && !isLoading && benefitTypes.length === 0 && (
        <EmptyState
          icon={Gift}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('create_benefit_type')}
          onAction={openDialog}
        />
      )}

      {!error && benefitTypes.length > 0 && (
        <DataTable value={benefitTypes} dataKey="id" className="text-sm" stripedRows loading={isLoading}>
          <Column field="code" header={t('col_code')} style={{ width: '8rem' }} />
          <Column field="name" header={t('col_name')} />
          <Column field="category" header={t('col_category')} />
          <Column
            header={t('col_country')}
            body={(row: BenefitType) => row.countryCode ?? t('col_country_all')}
            style={{ width: '7rem' }}
          />
          <Column
            header={t('col_delivery_mode')}
            body={(row: BenefitType) => t(`delivery_mode_${row.deliveryMode}`)}
          />
          <Column
            header={t('col_status')}
            body={(row: BenefitType) => (
              <Tag value={t(`status_${row.status}`)} severity={STATUS_SEVERITY[row.status] ?? 'secondary'} />
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
            <label htmlFor="benefit-code" className="text-sm font-medium text-gray-700">{t('field_code')}</label>
            <InputText id="benefit-code" value={code} onChange={e => setCode(e.target.value)} className="w-full" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="benefit-name" className="text-sm font-medium text-gray-700">{t('field_name')}</label>
            <InputText id="benefit-name" value={name} onChange={e => setName(e.target.value)} className="w-full" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="benefit-category" className="text-sm font-medium text-gray-700">{t('field_category')}</label>
            <InputText id="benefit-category" value={category} onChange={e => setCategory(e.target.value)} className="w-full" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="benefit-country" className="text-sm font-medium text-gray-700">{t('field_country')}</label>
            <InputText
              id="benefit-country"
              value={countryCode}
              onChange={e => setCountryCode(e.target.value.toUpperCase())}
              maxLength={2}
              placeholder={t('field_country_placeholder')}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="benefit-delivery-mode" className="text-sm font-medium text-gray-700">{t('field_delivery_mode')}</label>
            <Dropdown
              inputId="benefit-delivery-mode"
              value={deliveryMode}
              options={DELIVERY_MODES.map(value => ({ label: t(`delivery_mode_${value}`), value }))}
              onChange={e => setDeliveryMode(e.value)}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              inputId="benefit-affects-payroll"
              checked={affectsPayroll}
              onChange={e => setAffectsPayroll(Boolean(e.checked))}
            />
            <label htmlFor="benefit-affects-payroll" className="text-sm text-gray-700">
              {t('field_affects_payroll')}
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              inputId="benefit-employee-visible"
              checked={employeeVisible}
              onChange={e => setEmployeeVisible(Boolean(e.checked))}
            />
            <label htmlFor="benefit-employee-visible" className="text-sm text-gray-700">
              {t('field_employee_visible')}
            </label>
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
