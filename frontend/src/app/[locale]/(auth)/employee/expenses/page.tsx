'use client';

import type { ExpenseCategory, ExpenseClaim, ExpenseClaimStatus } from '@/libs/api/expenses';
import { AlertCircle, Plus, Receipt, RefreshCw } from 'lucide-react';
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
  createExpenseClaim,
  listExpenseClaims,
  submitExpenseClaim,
} from '@/libs/api/expenses';
import { useRouter } from '@/libs/I18nNavigation';

const CATEGORIES: ExpenseCategory[] = [
  'travel',
  'food',
  'medical',
  'accommodation',
  'transport',
  'office_supplies',
  'client_entertainment',
  'other',
];

const STATUS_SEVERITY: Record<ExpenseClaimStatus, 'secondary' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'secondary',
  submitted: 'info',
  approved: 'warning',
  paid: 'success',
  rejected: 'danger',
};

function toIsoDate(date: Date | null): string {
  if (!date) {
    return '';
  }
  return date.toISOString().slice(0, 10);
}

export default function EmployeeExpensesPage() {
  const t = useTranslations('EmployeeExpenses');
  const router = useRouter();

  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<'draft' | 'submit' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>('travel');
  const [amount, setAmount] = useState<number | null>(null);
  const [currencyCode, setCurrencyCode] = useState('');
  const [expenseDate, setExpenseDate] = useState<Date | null>(new Date());
  const [description, setDescription] = useState('');
  const [receiptBlobUrl, setReceiptBlobUrl] = useState('');

  const categoryOptions = useMemo(
    () => CATEGORIES.map(value => ({ label: t(`category_${value}`), value })),
    [t],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listExpenseClaims({ limit: 50 });
      setClaims(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setClaims([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = () => {
    setFormError(null);
    setCategory('travel');
    setAmount(null);
    setCurrencyCode('');
    setExpenseDate(new Date());
    setDescription('');
    setReceiptBlobUrl('');
    setDialogOpen(true);
  };

  const validate = (): string | null => {
    if (!amount || amount <= 0) {
      return t('error_amount_required');
    }
    if (currencyCode.trim().length !== 3) {
      return t('error_currency_invalid');
    }
    if (!expenseDate) {
      return t('error_date_required');
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
      const created = await createExpenseClaim({
        category,
        amount: amount ?? undefined,
        currencyCode: currencyCode.trim().toUpperCase(),
        expenseDate: toIsoDate(expenseDate),
        description: description.trim() || undefined,
        receiptBlobUrl: receiptBlobUrl.trim() || undefined,
      });

      if (mode === 'submit') {
        await submitExpenseClaim(created.data.id);
      }

      setDialogOpen(false);
      await load();
      router.push(`/employee/expenses/${created.data.id}`);
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : t('error_create'));
    } finally {
      setIsSubmitting(null);
    }
  };

  if (isLoading && claims.length === 0 && !error) {
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
            {t('new_claim')}
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

      {!error && !isLoading && claims.length === 0 && (
        <EmptyState
          icon={Receipt}
          title={t('empty_title')}
          description={t('empty_description')}
          actionLabel={t('new_claim')}
          onAction={openDialog}
        />
      )}

      {!error && claims.length > 0 && (
        <DataTable
          value={claims}
          dataKey="id"
          className="text-sm"
          stripedRows
          loading={isLoading}
          onRowClick={e => router.push(`/employee/expenses/${(e.data as ExpenseClaim).id}`)}
          rowClassName={() => 'cursor-pointer'}
        >
          <Column header={t('col_category')} body={(row: ExpenseClaim) => t(`category_${row.category}`)} />
          <Column field="expenseDate" header={t('col_date')} />
          <Column
            header={t('col_amount')}
            body={(row: ExpenseClaim) => `${row.amount} ${row.currencyCode}`}
          />
          <Column
            header={t('col_status')}
            body={(row: ExpenseClaim) => (
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-category" className="text-sm font-medium text-gray-700">
              {t('field_category')}
            </label>
            <Dropdown
              inputId="expense-category"
              value={category}
              options={categoryOptions}
              onChange={e => setCategory(e.value)}
              className="w-full"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expense-amount" className="text-sm font-medium text-gray-700">
                {t('field_amount')}
              </label>
              <InputNumber
                inputId="expense-amount"
                value={amount}
                onValueChange={e => setAmount(e.value ?? null)}
                minFractionDigits={2}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expense-currency" className="text-sm font-medium text-gray-700">
                {t('field_currency')}
              </label>
              <InputText
                id="expense-currency"
                value={currencyCode}
                onChange={e => setCurrencyCode(e.target.value.toUpperCase())}
                maxLength={3}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expense-date" className="text-sm font-medium text-gray-700">
                {t('field_date')}
              </label>
              <Calendar
                inputId="expense-date"
                value={expenseDate}
                onChange={e => setExpenseDate(e.value as Date | null)}
                dateFormat="yy-mm-dd"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expense-receipt" className="text-sm font-medium text-gray-700">
                {t('field_receipt_url')}
              </label>
              <InputText
                id="expense-receipt"
                value={receiptBlobUrl}
                onChange={e => setReceiptBlobUrl(e.target.value)}
                className="w-full"
                placeholder={t('field_receipt_url_placeholder')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-description" className="text-sm font-medium text-gray-700">
              {t('field_description')}
            </label>
            <InputTextarea
              id="expense-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full"
              placeholder={t('field_description_placeholder')}
            />
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
