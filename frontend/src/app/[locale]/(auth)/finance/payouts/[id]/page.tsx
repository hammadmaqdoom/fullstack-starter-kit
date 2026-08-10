'use client';

import {
  confirmManualPaid,
  executeManualPayout,
  executeProviderPayout,
  getPayoutBatch,
  retryPayoutWithSecondary,
  type PayoutBatch,
  type PayoutBatchLine,
} from '@/libs/api/payout-rails';
import { ApiRequestError } from '@/libs/api/client';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { useCallback, useEffect, useRef, useState } from 'react';

const STATUS_STEPS = [
  'draft',
  'previewed',
  'submitted',
  'processing',
  'paid',
] as const;

export default function PayoutBatchDetailPage() {
  const t = useTranslations('FinancePayouts');
  const params = useParams<{ id: string }>();
  const toast = useRef<Toast>(null);
  const [batch, setBatch] = useState<PayoutBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPayoutBatch(params.id);
      setBatch(res.data);
      const next: Record<string, string> = {};
      for (const line of res.data.lines ?? []) {
        next[line.id] = line.paymentReference ?? '';
      }
      setRefs(next);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setLoading(false);
    }
  }, [params.id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function downloadCsv() {
    setBusy(true);
    try {
      const { blob, fileName } = await executeManualPayout(params.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.current?.show({ severity: 'success', summary: t('csv_ready') });
      await load();
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: err instanceof Error ? err.message : t('error_execute'),
      });
    } finally {
      setBusy(false);
    }
  }

  async function confirmPaid() {
    if (!batch?.lines?.length) return;
    setBusy(true);
    try {
      await confirmManualPaid(
        params.id,
        batch.lines
          .filter((l) => refs[l.id]?.trim())
          .map((l) => ({ lineId: l.id, paymentReference: refs[l.id]!.trim() })),
      );
      toast.current?.show({ severity: 'success', summary: t('confirm_success') });
      await load();
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: err instanceof ApiRequestError ? err.message : t('error_confirm'),
      });
    } finally {
      setBusy(false);
    }
  }

  async function runProvider() {
    setBusy(true);
    try {
      await executeProviderPayout(params.id);
      toast.current?.show({ severity: 'success', summary: t('provider_submitted') });
      await load();
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: err instanceof ApiRequestError ? err.message : t('error_execute'),
      });
    } finally {
      setBusy(false);
    }
  }

  async function retrySecondary() {
    setBusy(true);
    try {
      await retryPayoutWithSecondary(params.id);
      toast.current?.show({ severity: 'success', summary: t('retry_success') });
      await load();
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: err instanceof ApiRequestError ? err.message : t('error_retry'),
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageSkeleton />;
  if (error || !batch) {
    return <Message severity="error" text={error ?? t('error_load')} className="m-4" />;
  }

  const statusIndex = Math.max(
    0,
    STATUS_STEPS.indexOf(
      (batch.status === 'partially_paid' ? 'paid' : batch.status) as (typeof STATUS_STEPS)[number],
    ),
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Toast ref={toast} />
      <OfflineBanner />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {t('batch_title', { id: batch.id.slice(0, 8) })}
          </h1>
          <p className="text-sm text-gray-500">
            {batch.batchType} · {batch.rail} · {batch.currencyCode}
          </p>
        </div>
        <Tag value={batch.status} />
      </div>

      <ol className="flex flex-wrap gap-2 text-xs">
        {STATUS_STEPS.map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-2.5 py-1 ${
              i <= statusIndex
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {s}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        {batch.rail === 'manual_bank' && (
          <>
            <Button
              type="button"
              label={t('download_csv')}
              loading={busy}
              onClick={() => void downloadCsv()}
            />
            <Button
              type="button"
              outlined
              label={t('confirm_paid')}
              loading={busy}
              onClick={() => void confirmPaid()}
            />
          </>
        )}
        {(batch.rail === 'aspire' || batch.rail === 'wise') && (
          <Button
            type="button"
            label={t('execute_provider')}
            loading={busy}
            onClick={() => void runProvider()}
          />
        )}
        {batch.status === 'failed' && batch.rail === 'aspire' && (
          <Button
            type="button"
            severity="warning"
            label={t('retry_secondary')}
            loading={busy}
            onClick={() => void retrySecondary()}
          />
        )}
      </div>

      <DataTable value={batch.lines ?? []} size="small">
        <Column field="workerId" header={t('col_worker')} />
        <Column field="amount" header={t('col_amount')} />
        <Column field="status" header={t('col_status')} />
        <Column
          header={t('col_payment_ref')}
          body={(line: PayoutBatchLine) =>
            batch.rail === 'manual_bank' && line.status !== 'paid' ? (
              <InputText
                value={refs[line.id] ?? ''}
                onChange={(e) =>
                  setRefs((prev) => ({ ...prev, [line.id]: e.target.value }))
                }
                className="w-40"
              />
            ) : (
              line.paymentReference ?? line.providerTransferId ?? '—'
            )
          }
        />
      </DataTable>
    </div>
  );
}
