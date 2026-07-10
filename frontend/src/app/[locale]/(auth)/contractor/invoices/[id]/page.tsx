'use client';

import type { TrackerStep } from '@/components/shared/StatusTracker';
import type {
  ContractorInvoice,
  RemittancePackWithDocuments,
} from '@/libs/api/contractor-invoices';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  contractorInvoiceRemittancePackDownloadUrl,
  getContractorInvoice,
  getContractorInvoiceRemittancePack,
  submitContractorInvoice,
  updateContractorInvoice,
} from '@/libs/api/contractor-invoices';
import { useRouter } from '@/libs/I18nNavigation';

const STATUS_SEVERITY: Record<string, 'secondary' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'secondary',
  submitted: 'info',
  manager_approved: 'info',
  finance_approved: 'warning',
  queued: 'warning',
  paid: 'success',
  rejected: 'danger',
};

function invoiceTrackerSteps(
  invoice: ContractorInvoice,
  t: ReturnType<typeof useTranslations<'ContractorPortal'>>,
): TrackerStep[] {
  if (invoice.status === 'rejected') {
    return [
      { label: t('tracker_submitted'), state: 'done' },
      { label: t('tracker_rejected'), state: 'current' },
    ];
  }
  const order = ['draft', 'submitted', 'manager_approved', 'finance_approved', 'queued', 'paid'];
  const currentIndex = order.indexOf(invoice.status);
  return [
    { label: t('tracker_draft'), state: currentIndex > 0 ? 'done' : 'current' },
    { label: t('tracker_submitted'), state: currentIndex > 1 ? 'done' : currentIndex === 1 ? 'current' : 'todo' },
    { label: t('tracker_manager'), state: currentIndex > 2 ? 'done' : currentIndex === 2 ? 'current' : 'todo' },
    { label: t('tracker_finance'), state: currentIndex > 3 ? 'done' : currentIndex === 3 ? 'current' : 'todo' },
    { label: t('tracker_paid'), state: currentIndex === 5 ? 'done' : currentIndex === 4 ? 'current' : 'todo' },
  ];
}

export default function ContractorInvoiceDetailPage() {
  const t = useTranslations('ContractorPortal');
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;

  const [invoice, setInvoice] = useState<ContractorInvoice | null>(null);
  const [remittance, setRemittance] = useState<RemittancePackWithDocuments | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pdfBlobUrl, setPdfBlobUrl] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await getContractorInvoice(invoiceId);
      setInvoice(data);
      setPdfBlobUrl(data.pdfBlobUrl ?? '');

      const { data: pack } = await getContractorInvoiceRemittancePack(invoiceId);
      setRemittance(pack);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setInvoice(null);
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    if (!invoice) {
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      if (pdfBlobUrl.trim() !== (invoice.pdfBlobUrl ?? '')) {
        await updateContractorInvoice(invoice.id, { pdfBlobUrl: pdfBlobUrl.trim() });
      }
      await submitContractorInvoice(invoice.id);
      await load();
    } catch (err) {
      setSubmitError(err instanceof ApiRequestError ? err.message : t('error_submit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !invoice && !error) {
    return (
      <>
        <OfflineBanner />
        <PageSkeleton variant="detail" rows={4} />
      </>
    );
  }

  if (!isLoading && (error || !invoice)) {
    return (
      <>
        <OfflineBanner />
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error ?? t('error_not_found')}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      </>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <>
      <OfflineBanner />

      <button
        type="button"
        onClick={() => router.push('/contractor/invoices')}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('back_to_invoices')}
      </button>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{invoice.invoiceNumber}</h1>
              <Tag value={t(`status_${invoice.status}`)} severity={STATUS_SEVERITY[invoice.status]} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {t('invoice_amount', { amount: invoice.grossAmount, currency: invoice.currencyCode })}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {t('invoice_dates', { invoiceDate: invoice.invoiceDate, dueDate: invoice.dueDate })}
            </p>
          </div>
        </div>

        {invoice.status === 'rejected' && invoice.rejectionReason && (
          <Message severity="error" className="mt-4 w-full" text={invoice.rejectionReason} />
        )}

        <div className="mt-5 border-t border-gray-100 pt-4">
          <StatusTracker steps={invoiceTrackerSteps(invoice, t)} />
        </div>

        {invoice.status === 'draft' && (
          <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
            {submitError && <Message severity="error" text={submitError} className="w-full" />}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="detail-pdf" className="text-sm font-medium text-gray-700">
                {t('field_pdf_url')}
              </label>
              <InputText
                id="detail-pdf"
                value={pdfBlobUrl}
                onChange={e => setPdfBlobUrl(e.target.value)}
                placeholder={t('field_pdf_url_placeholder')}
                className="w-full"
              />
            </div>
            <Button
              type="button"
              className="gap-2"
              onClick={() => void handleSubmit()}
              loading={isSubmitting}
              disabled={!pdfBlobUrl.trim()}
            >
              {t('submit_for_approval')}
            </Button>
          </div>
        )}

        {invoice.lineItems && invoice.lineItems.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">{t('field_line_items')}</h2>
            <ul className="space-y-1.5">
              {invoice.lineItems.map((line, index) => (
                <li key={line.id ?? index} className="flex items-center justify-between text-sm text-gray-600">
                  <span className="min-w-0 truncate pr-2">{line.description}</span>
                  <span className="shrink-0 tabular-nums">{line.amount}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {remittance && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900">{t('remittance_title')}</h2>
            <Button
              type="button"
              severity="secondary"
              outlined
              size="small"
              className="gap-1.5"
              onClick={() => window.open(contractorInvoiceRemittancePackDownloadUrl(invoice.id), '_blank', 'noopener,noreferrer')}
            >
              <Download className="size-3.5" aria-hidden />
              {t('download_zip')}
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {remittance.documents.map(document => (
              <li key={document.id} className="flex items-center gap-2 text-sm text-gray-700">
                {document.status === 'available' ? (
                  <Check className="size-4 shrink-0 text-[var(--status-in)]" aria-hidden />
                ) : (
                  <Clock className="size-4 shrink-0 text-gray-400" aria-hidden />
                )}
                <span className="flex-1">{t(`remittance_doc_${document.documentType}`)}</span>
                {document.status === 'available' && document.blobUrl && (
                  <a
                    href={document.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    {t('view')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
