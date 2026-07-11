'use client';

import type { TravelRequest, TravelRequestStatus, TravelType } from '@/libs/api/travel';
import { AlertCircle, Plane, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  createTravelRequest,
  listTravelRequests,
  submitTravelRequest,
} from '@/libs/api/travel';
import { useRouter } from '@/libs/I18nNavigation';

const STATUS_SEVERITY: Record<TravelRequestStatus, 'secondary' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'secondary',
  submitted: 'info',
  approved: 'warning',
  in_progress: 'warning',
  completed: 'success',
  reconciled: 'success',
  rejected: 'danger',
};

function toIsoDate(date: Date | null | undefined): string {
  if (!date) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

export default function EmployeeTravelPage() {
  const t = useTranslations('EmployeeTravel');
  const router = useRouter();

  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<'draft' | 'submit' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [dateRange, setDateRange] = useState<Date[] | null>(null);
  const [purpose, setPurpose] = useState('');
  const [travelType, setTravelType] = useState<TravelType>('domestic');
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [currencyCode, setCurrencyCode] = useState('');

  const travelTypeOptions = useMemo(
    () => ([
      { label: t('travel_type_domestic'), value: 'domestic' as TravelType },
      { label: t('travel_type_international'), value: 'international' as TravelType },
    ]),
    [t],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listTravelRequests({ limit: 50 });
      setRequests(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = () => {
    setFormError(null);
    setDestinations(['']);
    setDateRange(null);
    setPurpose('');
    setTravelType('domestic');
    setEstimatedCost(null);
    setCurrencyCode('');
    setDialogOpen(true);
  };

  const updateDestination = (index: number, value: string) => {
    setDestinations(items => items.map((item, i) => (i === index ? value : item)));
  };
  const addDestination = () => setDestinations(items => [...items, '']);
  const removeDestination = (index: number) => setDestinations(items => items.filter((_, i) => i !== index));

  const validate = (): string | null => {
    const cleanDestinations = destinations.map(d => d.trim()).filter(Boolean);
    if (cleanDestinations.length === 0) {
      return t('error_destination_required');
    }
    if (!dateRange?.[0] || !dateRange?.[1]) {
      return t('error_dates_required');
    }
    if (!purpose.trim()) {
      return t('error_purpose_required');
    }
    if (!estimatedCost || estimatedCost <= 0) {
      return t('error_cost_required');
    }
    if (currencyCode.trim().length !== 3) {
      return t('error_currency_invalid');
    }
    return null;
  };

  const handleSave = async (mode: 'draft' | 'submit') => {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setIsSubmitting(mode);
    try {
      const created = await createTravelRequest({
        destinations: destinations.map(d => d.trim()).filter(Boolean),
        startDate: toIsoDate(dateRange![0]),
        endDate: toIsoDate(dateRange![1]),
        purpose: purpose.trim(),
        travelType,
        estimatedCost: estimatedCost ?? 0,
        currencyCode: currencyCode.trim().toUpperCase(),
      });

      if (mode === 'submit') {
        await submitTravelRequest(created.data.id);
      }

      setDialogOpen(false);
      await load();
      router.push(`/employee/travel/${created.data.id}`);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t('error_create'));
    } finally {
      setIsSubmitting(null);
    }
  };

  if (isLoading && requests.length === 0 && !error) {
    return (
      <>
        <OfflineBanner />
        <PageSkeleton variant="table" rows={4} />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-16 lg:pb-0">
      <OfflineBanner />

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
            {t('new_request')}
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

      {!error && !isLoading && requests.length === 0 && (
        <EmptyState
          icon={Plane}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('new_request')}
          onAction={openDialog}
        />
      )}

      {!error && requests.length > 0 && (
        <DataTable
          value={requests}
          dataKey="id"
          className="text-sm"
          stripedRows
          loading={isLoading}
          onRowClick={e => router.push(`/employee/travel/${(e.data as TravelRequest).id}`)}
          rowClassName={() => 'cursor-pointer'}
        >
          <Column
            header={t('col_destinations')}
            body={(row: TravelRequest) => row.destinations.join(', ')}
          />
          <Column field="startDate" header={t('col_start_date')} />
          <Column field="endDate" header={t('col_end_date')} />
          <Column
            header={t('col_cost')}
            body={(row: TravelRequest) => `${row.estimatedCost} ${row.currencyCode}`}
          />
          <Column
            header={t('col_status')}
            body={(row: TravelRequest) => (
              <Tag value={t(`status_${row.status}`)} severity={STATUS_SEVERITY[row.status]} />
            )}
            style={{ width: '10rem' }}
          />
        </DataTable>
      )}

      <Dialog
        header={t('dialog_title')}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-lg"
        modal
        dismissableMask
      >
        <div className="space-y-4 pt-1">
          {formError && <Message severity="error" text={formError} className="w-full" />}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{t('field_destinations')}</span>
              <Button
                type="button"
                size="small"
                severity="secondary"
                outlined
                className="gap-1.5"
                onClick={addDestination}
              >
                <Plus className="size-3.5" aria-hidden />
                {t('add_destination')}
              </Button>
            </div>
            {destinations.map((destination, index) => (
              <div key={index} className="flex items-center gap-2">
                <InputText
                  value={destination}
                  onChange={e => updateDestination(index, e.target.value)}
                  className="w-full"
                  placeholder={t('field_destinations_placeholder')}
                />
                <Button
                  type="button"
                  severity="danger"
                  text
                  disabled={destinations.length === 1}
                  onClick={() => removeDestination(index)}
                  aria-label={t('remove_destination')}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="travel-dates" className="text-sm font-medium text-gray-700">
              {t('field_dates')}
            </label>
            <Calendar
              inputId="travel-dates"
              value={dateRange}
              onChange={e => setDateRange(e.value as Date[] | null)}
              selectionMode="range"
              readOnlyInput
              hideOnRangeSelection
              className="w-full"
              dateFormat="yy-mm-dd"
              placeholder={t('field_dates_placeholder')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="travel-purpose" className="text-sm font-medium text-gray-700">
              {t('field_purpose')}
            </label>
            <InputTextarea
              id="travel-purpose"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              rows={2}
              className="w-full"
              placeholder={t('field_purpose_placeholder')}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="travel-type" className="text-sm font-medium text-gray-700">
                {t('field_travel_type')}
              </label>
              <Dropdown
                inputId="travel-type"
                value={travelType}
                options={travelTypeOptions}
                onChange={e => setTravelType(e.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="travel-cost" className="text-sm font-medium text-gray-700">
                {t('field_estimated_cost')}
              </label>
              <InputNumber
                inputId="travel-cost"
                value={estimatedCost}
                onValueChange={e => setEstimatedCost(e.value ?? null)}
                minFractionDigits={2}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="travel-currency" className="text-sm font-medium text-gray-700">
                {t('field_currency')}
              </label>
              <InputText
                id="travel-currency"
                value={currencyCode}
                onChange={e => setCurrencyCode(e.target.value.toUpperCase())}
                maxLength={3}
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
              disabled={isSubmitting !== null}
            />
            <Button
              type="button"
              severity="secondary"
              outlined
              label={isSubmitting === 'draft' ? t('saving') : t('save_draft')}
              onClick={() => void handleSave('draft')}
              loading={isSubmitting === 'draft'}
              disabled={isSubmitting !== null}
            />
            <Button
              type="button"
              label={isSubmitting === 'submit' ? t('submitting') : t('save_and_submit')}
              onClick={() => void handleSave('submit')}
              loading={isSubmitting === 'submit'}
              disabled={isSubmitting !== null}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
