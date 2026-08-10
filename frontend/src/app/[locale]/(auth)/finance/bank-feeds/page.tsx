'use client';

import {
  ignoreBankFeed,
  listBankFeeds,
  listFundingAccounts,
  matchBankFeed,
  syncBankFeed,
  type BankFeedTxn,
  type FundingAccount,
} from '@/libs/api/payout-rails';
import { ApiRequestError } from '@/libs/api/client';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Landmark, RefreshCw } from 'lucide-react';
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

export default function BankFeedsPage() {
  const t = useTranslations('FinanceBankFeeds');
  const toast = useRef<Toast>(null);
  const [rows, setRows] = useState<BankFeedTxn[]>([]);
  const [funding, setFunding] = useState<FundingAccount[]>([]);
  const [fundingAccountId, setFundingAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [payoutLineId, setPayoutLineId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [feeds, accounts] = await Promise.all([
        listBankFeeds({ matchStatus: 'unmatched', limit: 50 }),
        listFundingAccounts({ provider: 'aspire' }),
      ]);
      setRows(feeds.data);
      setFunding(accounts.data);
      if (!fundingAccountId && accounts.data[0]) {
        setFundingAccountId(accounts.data[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setLoading(false);
    }
  }, [fundingAccountId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sync() {
    if (!fundingAccountId) return;
    try {
      const res = await syncBankFeed(fundingAccountId);
      toast.current?.show({
        severity: 'success',
        summary: t('sync_success', {
          inserted: String(res.data.inserted),
          updated: String(res.data.updated),
        }),
      });
      await load();
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: err instanceof ApiRequestError ? err.message : t('error_sync'),
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
        <div className="flex flex-wrap gap-2">
          <Dropdown
            value={fundingAccountId}
            options={funding.map((f) => ({ label: f.label, value: f.id }))}
            onChange={(e) => setFundingAccountId(e.value)}
            placeholder={t('funding_account')}
          />
          <Button type="button" label={t('sync')} onClick={() => void sync()} />
          <Button
            type="button"
            outlined
            icon={<RefreshCw className="size-4" />}
            onClick={() => void load()}
          />
        </div>
      </div>
      {error && <Message severity="error" text={error} className="w-full" />}
      {rows.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title={t('empty_title')}
          description={t('empty_description')}
        />
      ) : (
        <DataTable value={rows} size="small">
          <Column field="bookedAt" header={t('col_date')} />
          <Column field="txnType" header={t('col_type')} />
          <Column field="amount" header={t('col_amount')} />
          <Column field="currency" header={t('col_currency')} />
          <Column field="description" header={t('col_description')} />
          <Column
            header={t('col_actions')}
            body={(r: BankFeedTxn) => (
              <div className="flex gap-1">
                <Button
                  type="button"
                  text
                  label={t('match')}
                  onClick={() => setMatchId(r.id)}
                />
                <Button
                  type="button"
                  text
                  label={t('ignore')}
                  onClick={() =>
                    void ignoreBankFeed(r.id).then(() => load())
                  }
                />
              </div>
            )}
          />
        </DataTable>
      )}

      <Dialog
        header={t('match_title')}
        visible={!!matchId}
        onHide={() => setMatchId(null)}
        className="w-full max-w-md"
      >
        <div className="flex flex-col gap-3">
          <InputText
            value={payoutLineId}
            onChange={(e) => setPayoutLineId(e.target.value)}
            placeholder={t('payout_line_id')}
          />
          <Button
            type="button"
            label={t('match')}
            onClick={() => {
              if (!matchId || !payoutLineId) return;
              void matchBankFeed(matchId, { payoutBatchLineId: payoutLineId })
                .then(async () => {
                  toast.current?.show({
                    severity: 'success',
                    summary: t('match_success'),
                  });
                  setMatchId(null);
                  await load();
                })
                .catch((err: unknown) => {
                  toast.current?.show({
                    severity: 'error',
                    summary:
                      err instanceof ApiRequestError
                        ? err.message
                        : t('error_match'),
                  });
                });
            }}
          />
        </div>
      </Dialog>
    </div>
  );
}
