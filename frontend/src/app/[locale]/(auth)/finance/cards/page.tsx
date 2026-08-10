'use client';

import {
  allocateCardTransaction,
  issueCorporateCard,
  listCardTransactions,
  listCorporateCards,
  listFundingAccounts,
  syncCardTransactions,
  type CardTransaction,
  type CorporateCard,
  type FundingAccount,
} from '@/libs/api/payout-rails';
import { listLegalEntities, type LegalEntity } from '@/libs/api/org-admin';
import { ApiRequestError } from '@/libs/api/client';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { CreditCard, Plus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Toast } from 'primereact/toast';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function CorporateCardsPage() {
  const t = useTranslations('FinanceCards');
  const toast = useRef<Toast>(null);
  const [cards, setCards] = useState<CorporateCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [txns, setTxns] = useState<CardTransaction[]>([]);
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [funding, setFunding] = useState<FundingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [legalEntityId, setLegalEntityId] = useState<string | null>(null);
  const [provider, setProvider] = useState<'aspire' | 'wise'>('aspire');
  const [label, setLabel] = useState('');
  const [currency, setCurrency] = useState('SGD');
  const [spendLimit, setSpendLimit] = useState('1000.00');
  const [fundingAccountId, setFundingAccountId] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cardRes, le, fa] = await Promise.all([
        listCorporateCards(),
        listLegalEntities(),
        listFundingAccounts(),
      ]);
      setCards(cardRes.data);
      setEntities(le.data);
      setFunding(fa.data);
      if (!selectedCardId && cardRes.data[0]) {
        setSelectedCardId(cardRes.data[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setLoading(false);
    }
  }, [selectedCardId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedCardId) {
      setTxns([]);
      return;
    }
    void listCardTransactions(selectedCardId)
      .then((res) => setTxns(res.data))
      .catch(() => setTxns([]));
  }, [selectedCardId]);

  async function issue() {
    if (!legalEntityId || !fundingAccountId || !label.trim()) return;
    try {
      await issueCorporateCard({
        legalEntityId,
        provider,
        label: label.trim(),
        currency: currency.toUpperCase(),
        spendLimit,
        fundingAccountId,
        workerId: workerId || undefined,
      });
      toast.current?.show({ severity: 'success', summary: t('issue_success') });
      setOpen(false);
      await load();
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: err instanceof ApiRequestError ? err.message : t('error_issue'),
      });
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
            onClick={() => void load()}
          />
          <Button
            type="button"
            icon={<Plus className="size-4" />}
            label={t('issue')}
            onClick={() => setOpen(true)}
          />
        </div>
      </div>
      {error && <Message severity="error" text={error} className="w-full" />}

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={t('empty_title')}
          description={t('empty_description')}
        />
      ) : (
        <>
          <DataTable
            value={cards}
            size="small"
            selectionMode="single"
            selection={cards.find((c) => c.id === selectedCardId) ?? null}
            onSelectionChange={(e) =>
              setSelectedCardId((e.value as CorporateCard | null)?.id ?? null)
            }
          >
            <Column field="label" header={t('col_label')} />
            <Column field="provider" header={t('col_provider')} />
            <Column field="currency" header={t('col_currency')} />
            <Column field="spendLimit" header={t('col_limit')} />
            <Column field="status" header={t('col_status')} />
          </DataTable>

          {selectedCardId && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t('transactions')}</h2>
                <Button
                  type="button"
                  outlined
                  label={t('sync_txns')}
                  onClick={() =>
                    void syncCardTransactions(selectedCardId).then(async () => {
                      const res = await listCardTransactions(selectedCardId);
                      setTxns(res.data);
                    })
                  }
                />
              </div>
              <DataTable value={txns} size="small" emptyMessage={t('empty_txns')}>
                <Column field="transactedAt" header={t('col_date')} />
                <Column field="merchant" header={t('col_merchant')} />
                <Column field="amount" header={t('col_amount')} />
                <Column field="currency" header={t('col_currency')} />
                <Column
                  header={t('col_actions')}
                  body={(r: CardTransaction) =>
                    r.expenseClaimId ? (
                      r.expenseClaimId.slice(0, 8)
                    ) : (
                      <Button
                        type="button"
                        text
                        label={t('allocate')}
                        onClick={() =>
                          void allocateCardTransaction(r.id, {
                            category: 'travel',
                            note: r.merchant ?? undefined,
                          }).then(async () => {
                            toast.current?.show({
                              severity: 'success',
                              summary: t('allocate_success'),
                            });
                            const res = await listCardTransactions(selectedCardId);
                            setTxns(res.data);
                          })
                        }
                      />
                    )
                  }
                />
              </DataTable>
            </section>
          )}
        </>
      )}

      <Dialog
        header={t('issue_title')}
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
          />
          <Dropdown
            value={provider}
            options={[
              { label: 'Aspire', value: 'aspire' },
              { label: 'Wise', value: 'wise' },
            ]}
            onChange={(e) => setProvider(e.value)}
          />
          <Dropdown
            value={fundingAccountId}
            options={funding
              .filter((f) => f.provider === provider)
              .filter((f) => !legalEntityId || f.legalEntityId === legalEntityId)
              .map((f) => ({ label: f.label, value: f.id }))}
            onChange={(e) => setFundingAccountId(e.value)}
            placeholder={t('funding_account')}
          />
          <InputText
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('label')}
          />
          <InputText
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            maxLength={3}
            placeholder={t('currency')}
          />
          <InputText
            value={spendLimit}
            onChange={(e) => setSpendLimit(e.target.value)}
            placeholder={t('spend_limit')}
          />
          <InputText
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            placeholder={t('worker_id')}
          />
          <Button type="button" label={t('issue')} onClick={() => void issue()} />
        </div>
      </Dialog>
    </div>
  );
}
