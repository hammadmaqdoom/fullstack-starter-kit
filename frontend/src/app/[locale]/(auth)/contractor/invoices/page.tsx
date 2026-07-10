'use client';

import type {
  ContractorInvoice,
  ContractorInvoiceStatus,
  CreateContractorInvoiceLineItemInput,
} from '@/libs/api/contractor-invoices';
import { AlertCircle, Plus, Receipt, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  createContractorInvoice,
  listContractorInvoices,
  submitContractorInvoice,
} from '@/libs/api/contractor-invoices';
import { useRouter } from '@/libs/I18nNavigation';
import { getMyWorker } from '@/libs/api/workers';

const STATUS_SEVERITY: Record<ContractorInvoiceStatus, 'secondary' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'secondary',
  submitted: 'info',
  manager_approved: 'info',
  finance_approved: 'warning',
  queued: 'warning',
  paid: 'success',
  rejected: 'danger',
};

type LineItemDraft = {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
};

function emptyLineItem(): LineItemDraft {
  return { description: '', quantity: 1, unitPrice: 0 };
}

function lineItemAmount(line: LineItemDraft): number {
  return (line.quantity ?? 0) * (line.unitPrice ?? 0);
}

function toIsoDate(date: Date | null): string {
  if (!date) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

export default function ContractorInvoicesPage() {
  const t = useTranslations('ContractorPortal');
  const router = useRouter();

  const [invoices, setInvoices] = useState<ContractorInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [legalEntityId, setLegalEntityId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<'draft' | 'submit' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [currencyCode, setCurrencyCode] = useState('');
  const [taxAmount, setTaxAmount] = useState<number | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState('');
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([emptyLineItem()]);

  const grossAmount = useMemo(
    () => lineItems.reduce((sum, line) => sum + lineItemAmount(line), 0),
    [lineItems],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listContractorInvoices({ limit: 50 });
      setInvoices(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    async function loadWorkerDefaults() {
      try {
        const { data } = await getMyWorker();
        setLegalEntityId(data.legalEntityId);
        if (data.contractorProfile?.paymentCurrency) {
          setCurrencyCode(data.contractorProfile.paymentCurrency);
        }
      } catch {
        setLegalEntityId(null);
      }
    }
    void loadWorkerDefaults();
  }, []);

  const openDialog = () => {
    setFormError(null);
    setInvoiceNumber('');
    setInvoiceDate(new Date());
    setDueDate(null);
    setTaxAmount(null);
    setPdfBlobUrl('');
    setLineItems([emptyLineItem()]);
    setDialogOpen(true);
  };

  const updateLineItem = (index: number, patch: Partial<LineItemDraft>) => {
    setLineItems(items => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addLineItem = () => setLineItems(items => [...items, emptyLineItem()]);
  const removeLineItem = (index: number) => setLineItems(items => items.filter((_, i) => i !== index));

  const validate = (requirePdf: boolean): string | null => {
    if (!legalEntityId) {
      return t('error_no_legal_entity');
    }
    if (!invoiceNumber.trim()) {
      return t('error_invoice_number_required');
    }
    if (!invoiceDate || !dueDate) {
      return t('error_dates_required');
    }
    if (currencyCode.trim().length !== 3) {
      return t('error_currency_invalid');
    }
    if (lineItems.length === 0 || lineItems.some(line => !line.description.trim() || !line.quantity || line.unitPrice === null)) {
      return t('error_line_items_invalid');
    }
    if (requirePdf && !pdfBlobUrl.trim()) {
      return t('error_pdf_required');
    }
    return null;
  };

  const handleSave = async (mode: 'draft' | 'submit') => {
    const validationError = validate(mode === 'submit');
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setIsSubmitting(mode);
    try {
      const resolvedLineItems: CreateContractorInvoiceLineItemInput[] = lineItems.map(line => ({
        description: line.description.trim(),
        quantity: line.quantity ?? 0,
        unitPrice: line.unitPrice ?? 0,
        amount: lineItemAmount(line),
      }));

      const created = await createContractorInvoice({
        legalEntityId: legalEntityId!,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: toIsoDate(invoiceDate),
        dueDate: toIsoDate(dueDate),
        currencyCode: currencyCode.trim().toUpperCase(),
        taxAmount: taxAmount ?? undefined,
        pdfBlobUrl: pdfBlobUrl.trim() || undefined,
        lineItems: resolvedLineItems,
      });

      if (mode === 'submit') {
        await submitContractorInvoice(created.data.id);
      }

      setDialogOpen(false);
      await load();
      router.push(`/contractor/invoices/${created.data.id}`);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t('error_create'));
    } finally {
      setIsSubmitting(null);
    }
  };

  if (isLoading && invoices.length === 0 && !error) {
    return (
      <>
        <OfflineBanner />
        <PageSkeleton variant="table" rows={4} />
      </>
    );
  }

  return (
    <>
      <OfflineBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('invoices_title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('invoices_subtitle')}</p>
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
            {t('submit_invoice')}
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

      {!error && !isLoading && invoices.length === 0 && (
        <EmptyState
          icon={Receipt}
          title={t('invoices_empty_title')}
          description={t('invoices_empty_description')}
          actionLabel={t('submit_invoice')}
          onAction={openDialog}
        />
      )}

      {!error && invoices.length > 0 && (
        <DataTable
          value={invoices}
          dataKey="id"
          className="text-sm"
          stripedRows
          loading={isLoading}
          onRowClick={e => router.push(`/contractor/invoices/${(e.data as ContractorInvoice).id}`)}
          rowClassName={() => 'cursor-pointer'}
        >
          <Column field="invoiceNumber" header={t('col_invoice_number')} />
          <Column field="invoiceDate" header={t('col_invoice_date')} />
          <Column
            header={t('col_amount')}
            body={(row: ContractorInvoice) => `${row.grossAmount} ${row.currencyCode}`}
          />
          <Column
            header={t('col_status')}
            body={(row: ContractorInvoice) => (
              <Tag value={t(`status_${row.status}`)} severity={STATUS_SEVERITY[row.status]} />
            )}
            style={{ width: '10rem' }}
          />
        </DataTable>
      )}

      <Dialog
        header={t('create_dialog_title')}
        visible={dialogOpen}
        onHide={() => setDialogOpen(false)}
        className="w-full max-w-2xl"
        modal
        dismissableMask
      >
        <div className="space-y-4 pt-1">
          {formError && <Message severity="error" text={formError} className="w-full" />}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-number" className="text-sm font-medium text-gray-700">
                {t('field_invoice_number')}
              </label>
              <InputText
                id="invoice-number"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full"
                placeholder={t('field_invoice_number_placeholder')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-currency" className="text-sm font-medium text-gray-700">
                {t('field_currency')}
              </label>
              <InputText
                id="invoice-currency"
                value={currencyCode}
                onChange={e => setCurrencyCode(e.target.value.toUpperCase())}
                maxLength={3}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-date" className="text-sm font-medium text-gray-700">
                {t('field_invoice_date')}
              </label>
              <Calendar
                inputId="invoice-date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.value as Date | null)}
                dateFormat="yy-mm-dd"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-due-date" className="text-sm font-medium text-gray-700">
                {t('field_due_date')}
              </label>
              <Calendar
                inputId="invoice-due-date"
                value={dueDate}
                onChange={e => setDueDate(e.value as Date | null)}
                dateFormat="yy-mm-dd"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-tax" className="text-sm font-medium text-gray-700">
                {t('field_tax_amount')}
              </label>
              <InputNumber
                inputId="invoice-tax"
                value={taxAmount}
                onValueChange={e => setTaxAmount(e.value ?? null)}
                minFractionDigits={2}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-pdf" className="text-sm font-medium text-gray-700">
                {t('field_pdf_url')}
              </label>
              <InputText
                id="invoice-pdf"
                value={pdfBlobUrl}
                onChange={e => setPdfBlobUrl(e.target.value)}
                className="w-full"
                placeholder={t('field_pdf_url_placeholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{t('field_line_items')}</span>
              <Button
                type="button"
                size="small"
                severity="secondary"
                outlined
                className="gap-1.5"
                onClick={addLineItem}
              >
                <Plus className="size-3.5" aria-hidden />
                {t('add_line_item')}
              </Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((line, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 p-3">
                  <div className="min-w-40 flex-1">
                    <label htmlFor={`line-desc-${index}`} className="mb-1 block text-xs text-gray-500">
                      {t('field_line_description')}
                    </label>
                    <InputText
                      id={`line-desc-${index}`}
                      value={line.description}
                      onChange={e => updateLineItem(index, { description: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div className="w-20">
                    <label htmlFor={`line-qty-${index}`} className="mb-1 block text-xs text-gray-500">
                      {t('field_line_quantity')}
                    </label>
                    <InputNumber
                      inputId={`line-qty-${index}`}
                      value={line.quantity}
                      onValueChange={e => updateLineItem(index, { quantity: e.value ?? null })}
                      className="w-full"
                    />
                  </div>
                  <div className="w-28">
                    <label htmlFor={`line-price-${index}`} className="mb-1 block text-xs text-gray-500">
                      {t('field_line_unit_price')}
                    </label>
                    <InputNumber
                      inputId={`line-price-${index}`}
                      value={line.unitPrice}
                      onValueChange={e => updateLineItem(index, { unitPrice: e.value ?? null })}
                      minFractionDigits={2}
                      className="w-full"
                    />
                  </div>
                  <div className="w-24 text-right text-sm tabular-nums text-gray-600">
                    {lineItemAmount(line).toFixed(2)}
                  </div>
                  <Button
                    type="button"
                    severity="danger"
                    text
                    disabled={lineItems.length === 1}
                    onClick={() => removeLineItem(index)}
                    aria-label={t('remove_line_item')}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-right text-sm font-semibold text-gray-900">
              {t('gross_total', { amount: grossAmount.toFixed(2), currency: currencyCode || '—' })}
            </p>
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
    </>
  );
}
