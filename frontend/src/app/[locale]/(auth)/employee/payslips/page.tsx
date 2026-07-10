'use client';

import type { Payslip } from '@/libs/api/payroll';
import { AlertCircle, Download, RefreshCw, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { downloadPayslip, listPayslips } from '@/libs/api/payroll';

export default function EmployeePayslipsPage() {
  const t = useTranslations('EmployeePayslips');

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listPayslips();
      setPayslips(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setPayslips([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDownload = async (payslip: Payslip) => {
    setDownloadingId(payslip.id);
    setDownloadError(null);
    try {
      const { data } = await downloadPayslip(payslip.id);
      if (typeof window !== 'undefined' && data.pdfBlobUrl) {
        window.open(data.pdfBlobUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setDownloadError(err instanceof ApiRequestError ? err.message : t('error_download'));
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading && payslips.length === 0 && !error) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-16 lg:pb-0">
        <OfflineBanner />
        <PageSkeleton variant="list" rows={3} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16 lg:pb-0">
      <OfflineBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button
          type="button"
          severity="secondary"
          outlined
          className="gap-2 self-start"
          onClick={() => void load()}
          disabled={isLoading}
        >
          <RefreshCw className="size-4" aria-hidden />
          {t('refresh')}
        </Button>
      </div>

      {downloadError && (
        <Message severity="error" text={downloadError} className="w-full" />
      )}

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

      {!isLoading && !error && payslips.length === 0 && (
        <EmptyState
          icon={Wallet}
          title={t('empty_title')}
          description={t('empty_description')}
        />
      )}

      {!isLoading && !error && payslips.length > 0 && (
        <ul className="space-y-3">
          {payslips.map(payslip => (
            <li key={payslip.id}>
              <article className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-gray-900">
                    {payslip.periodStart}
                    {' – '}
                    {payslip.periodEnd}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {t('net_pay', { amount: payslip.netPay, currency: payslip.currencyCode })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Tag
                    value={payslip.status === 'released' ? t('status_released') : t('status_draft')}
                    severity={payslip.status === 'released' ? 'success' : 'secondary'}
                  />
                  <Button
                    type="button"
                    size="small"
                    severity="secondary"
                    outlined
                    className="gap-1"
                    disabled={payslip.status !== 'released' || downloadingId === payslip.id}
                    onClick={() => void handleDownload(payslip)}
                  >
                    <Download className="size-3.5" aria-hidden />
                    {t('download')}
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
