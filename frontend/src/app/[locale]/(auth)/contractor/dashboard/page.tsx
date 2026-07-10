'use client';

import type { TrackerStep } from '@/components/shared/StatusTracker';
import type { ContractorInvoice, ContractorInvoiceStatus } from '@/libs/api/contractor-invoices';
import type { EsignEnvelope } from '@/libs/api/esign';
import { AlertCircle, FileSignature, Plus, Receipt, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { RequestCard } from '@/components/shared/RequestCard';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { listContractorInvoices } from '@/libs/api/contractor-invoices';
import { listPendingEnvelopes } from '@/libs/api/esign';
import { useRouter } from '@/libs/I18nNavigation';

const TERMINAL_STATUSES: ContractorInvoiceStatus[] = ['paid', 'rejected'];

function invoiceTrackerSteps(
  status: ContractorInvoiceStatus,
  t: ReturnType<typeof useTranslations<'ContractorPortal'>>,
): TrackerStep[] {
  const order: ContractorInvoiceStatus[] = [
    'submitted',
    'manager_approved',
    'finance_approved',
    'queued',
    'paid',
  ];
  if (status === 'rejected') {
    return [
      { label: t('tracker_submitted'), state: 'done' },
      { label: t('tracker_rejected'), state: 'current' },
    ];
  }
  const currentIndex = status === 'draft' ? -1 : order.indexOf(status);
  return [
    { label: t('tracker_submitted'), state: currentIndex >= 0 ? (currentIndex === 0 ? 'current' : 'done') : 'todo' },
    { label: t('tracker_manager'), state: currentIndex > 1 ? 'done' : currentIndex === 1 ? 'current' : 'todo' },
    { label: t('tracker_finance'), state: currentIndex > 2 ? 'done' : currentIndex === 2 ? 'current' : 'todo' },
    { label: t('tracker_paid'), state: currentIndex === 4 ? 'done' : currentIndex === 3 ? 'current' : 'todo' },
  ];
}

export default function ContractorDashboardPage() {
  const t = useTranslations('ContractorPortal');
  const router = useRouter();

  const [invoices, setInvoices] = useState<ContractorInvoice[]>([]);
  const [envelopes, setEnvelopes] = useState<EsignEnvelope[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invoiceRes, envelopeRes] = await Promise.all([
        listContractorInvoices({ limit: 25 }),
        listPendingEnvelopes(),
      ]);
      setInvoices(invoiceRes.data);
      setEnvelopes(envelopeRes.data ?? []);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setInvoices([]);
      setEnvelopes([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const drafts = invoices.filter(invoice => invoice.status === 'draft');
  const active = invoices.filter(invoice => !TERMINAL_STATUSES.includes(invoice.status) && invoice.status !== 'draft');

  if (isLoading && invoices.length === 0 && envelopes.length === 0 && !error) {
    return (
      <>
        <OfflineBanner />
        <PageSkeleton variant="list" rows={3} />
      </>
    );
  }

  return (
    <>
      <OfflineBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('home_title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('home_subtitle')}</p>
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
          <Button
            type="button"
            className="gap-2"
            onClick={() => router.push('/contractor/invoices')}
          >
            <Plus className="size-4" aria-hidden />
            {t('submit_invoice')}
          </Button>
        </div>
      </div>

      {error && (
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

      {!error && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">{t('section_payment_status')}</h2>
          {active.length === 0 && drafts.length === 0 && (
            <EmptyState
              icon={Receipt}
              title={t('home_empty_title')}
              description={t('home_empty_description')}
              actionLabel={t('submit_invoice')}
              onAction={() => router.push('/contractor/invoices')}
            />
          )}
          {drafts.map(invoice => (
            <RequestCard
              key={invoice.id}
              icon={Receipt}
              title={invoice.invoiceNumber}
              subtitle={t('draft_subtitle', { amount: invoice.grossAmount, currency: invoice.currencyCode })}
              status="pending"
              nextStepText={t('draft_hint')}
              onClick={() => router.push(`/contractor/invoices/${invoice.id}`)}
            />
          ))}
          {active.map(invoice => (
            <RequestCard
              key={invoice.id}
              icon={Receipt}
              title={invoice.invoiceNumber}
              subtitle={`${invoice.grossAmount} ${invoice.currencyCode}`}
              status={invoice.status === 'paid' ? 'approved' : 'submitted'}
              steps={invoiceTrackerSteps(invoice.status, t)}
              onClick={() => router.push(`/contractor/invoices/${invoice.id}`)}
            />
          ))}
        </section>
      )}

      {!error && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">{t('section_needs_you')}</h2>
          {envelopes.length === 0 && (
            <EmptyState
              icon={FileSignature}
              title={t('no_docs_title')}
              description={t('no_docs_description')}
            />
          )}
          {envelopes.map(envelope => (
            <RequestCard
              key={envelope.id}
              icon={FileSignature}
              title={envelope.title}
              status={envelope.status}
              nextStepText={envelope.nextStepText ?? undefined}
              onClick={() => router.push('/contractor/documents')}
            />
          ))}
        </section>
      )}
    </>
  );
}
