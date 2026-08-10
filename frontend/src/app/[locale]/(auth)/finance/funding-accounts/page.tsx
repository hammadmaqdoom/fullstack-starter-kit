'use client';

import {
  createFundingAccount,
  listFundingAccounts,
  type FundingAccount,
  type FundingProvider,
} from '@/libs/api/payout-rails';
import { listLegalEntities, type LegalEntity } from '@/libs/api/org-admin';
import { ApiRequestError } from '@/libs/api/client';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Landmark, Plus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Toast } from 'primereact/toast';
import { useCallback, useEffect, useRef, useState } from 'react';

const PROVIDERS: { label: string; value: FundingProvider }[] = [
  { label: 'Aspire', value: 'aspire' },
  { label: 'Wise', value: 'wise' },
  { label: 'Manual bank', value: 'manual_bank' },
];

export default function FundingAccountsPage() {
  const t = useTranslations('FinanceFundingAccounts');
  const toast = useRef<Toast>(null);
  const [rows, setRows] = useState<FundingAccount[]>([]);
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [legalEntityId, setLegalEntityId] = useState<string | null>(null);
  const [provider, setProvider] = useState<FundingProvider>('aspire');
  const [currency, setCurrency] = useState('SGD');
  const [label, setLabel] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [externalAccountId, setExternalAccountId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [swiftBic, setSwiftBic] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [funding, legal] = await Promise.all([
        listFundingAccounts(),
        listLegalEntities(),
      ]);
      setRows(funding.data);
      setEntities(legal.data);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : t('error_load'),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!legalEntityId || !label.trim()) return;
    setSubmitting(true);
    try {
      await createFundingAccount({
        legalEntityId,
        provider,
        currency: currency.toUpperCase(),
        label: label.trim(),
        isDefault,
        externalAccountId:
          provider !== 'manual_bank' ? externalAccountId || undefined : undefined,
        bankDetails:
          provider === 'manual_bank'
            ? {
                bankName,
                accountNumber,
                iban,
                swiftBic,
              }
            : undefined,
      });
      toast.current?.show({
        severity: 'success',
        summary: t('create_success'),
      });
      setOpen(false);
      await load();
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary:
          err instanceof ApiRequestError ? err.message : t('error_create'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Toast ref={toast} />
      <OfflineBanner />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            outlined
            icon={<RefreshCw className="size-4" />}
            label={t('refresh')}
            onClick={() => void load()}
          />
          <Button
            type="button"
            icon={<Plus className="size-4" />}
            label={t('add')}
            onClick={() => setOpen(true)}
          />
        </div>
      </div>

      {error ? (
        <Message severity="error" text={error} className="w-full" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title={t('empty_title')}
          description={t('empty_description')}
        />
      ) : (
        <DataTable value={rows} size="small" stripedRows>
          <Column field="label" header={t('col_label')} />
          <Column field="provider" header={t('col_provider')} />
          <Column field="currency" header={t('col_currency')} />
          <Column
            field="isDefault"
            header={t('col_default')}
            body={(r: FundingAccount) => (r.isDefault ? t('yes') : t('no'))}
          />
          <Column
            field="externalAccountId"
            header={t('col_external')}
            body={(r: FundingAccount) => r.externalAccountId ?? '—'}
          />
        </DataTable>
      )}

      <Dialog
        header={t('dialog_title')}
        visible={open}
        onHide={() => setOpen(false)}
        className="w-full max-w-lg"
      >
        <div className="flex flex-col gap-3">
          <Dropdown
            value={legalEntityId}
            options={entities.map((e) => ({
              label: e.registeredName,
              value: e.id,
            }))}
            onChange={(e) => setLegalEntityId(e.value)}
            placeholder={t('legal_entity')}
            className="w-full"
          />
          <Dropdown
            value={provider}
            options={PROVIDERS}
            onChange={(e) => setProvider(e.value)}
            className="w-full"
          />
          <InputText
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('label')}
            className="w-full"
          />
          <InputText
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder={t('currency')}
            className="w-full"
            maxLength={3}
          />
          <div className="flex items-center gap-2">
            <InputSwitch checked={isDefault} onChange={(e) => setIsDefault(!!e.value)} />
            <span className="text-sm">{t('is_default')}</span>
          </div>
          {provider !== 'manual_bank' ? (
            <InputText
              value={externalAccountId}
              onChange={(e) => setExternalAccountId(e.target.value)}
              placeholder={t('external_id')}
              className="w-full"
            />
          ) : (
            <>
              <InputText
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder={t('bank_name')}
                className="w-full"
              />
              <InputText
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={t('account_number')}
                className="w-full"
              />
              <InputText
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder={t('iban')}
                className="w-full"
              />
              <InputText
                value={swiftBic}
                onChange={(e) => setSwiftBic(e.target.value)}
                placeholder={t('swift')}
                className="w-full"
              />
            </>
          )}
          <Button
            type="button"
            label={t('save')}
            loading={submitting}
            onClick={() => void submit()}
          />
        </div>
      </Dialog>
    </div>
  );
}
