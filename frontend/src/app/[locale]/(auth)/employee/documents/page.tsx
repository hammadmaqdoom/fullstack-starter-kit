'use client';

import type { EsignEnvelope } from '@/libs/api/esign';
import type { TrackerStep } from '@/components/shared/StatusTracker';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { listPendingEnvelopes } from '@/libs/api/esign';
import { useRouter } from '@/libs/I18nNavigation';
import { FileSignature, PenLine, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';

function envelopeSteps(
  envelope: EsignEnvelope,
  t: ReturnType<typeof useTranslations<'Documents'>>,
): TrackerStep[] {
  const status = envelope.status;
  const sentDone = status !== 'draft';
  const inProgress
    = status === 'partially_signed'
      || status === 'sent'
      || status === 'completed';
  const completed = status === 'completed';

  return [
    {
      label: t('tracker_sent'),
      state: sentDone ? 'done' : 'current',
    },
    {
      label: t('tracker_you_sign'),
      state: completed ? 'done' : inProgress ? 'current' : 'todo',
      actor: t('tracker_you'),
    },
    {
      label: t('tracker_completed'),
      state: completed ? 'done' : 'todo',
    },
  ];
}

function statusSeverity(
  status: EsignEnvelope['status'],
): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'sent':
    case 'partially_signed':
      return 'warning';
    case 'voided':
    case 'declined':
      return 'danger';
    case 'draft':
      return 'secondary';
    default:
      return 'info';
  }
}

export default function EmployeeDocumentsPage() {
  const t = useTranslations('Documents');
  const router = useRouter();
  const [envelopes, setEnvelopes] = useState<EsignEnvelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listPendingEnvelopes();
      setEnvelopes(data ?? []);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setEnvelopes([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
          disabled={loading}
        >
          <RefreshCw className="size-4" aria-hidden />
          {t('refresh')}
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton height="7rem" />
          <Skeleton height="7rem" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <Button type="button" className="mt-4 gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && !error && envelopes.length === 0 && (
        <EmptyState
          icon={FileSignature}
          title={t('empty_title')}
          description={t('empty_description')}
        />
      )}

      {!loading && !error && envelopes.length > 0 && (
        <ul className="space-y-3">
          {envelopes.map(envelope => (
            <li
              key={envelope.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-900">{envelope.title}</h2>
                    <Tag
                      value={t(`status_${envelope.status}`)}
                      severity={statusSeverity(envelope.status)}
                    />
                  </div>
                  {envelope.nextStepText && (
                    <p className="mt-1 text-xs text-gray-500">{envelope.nextStepText}</p>
                  )}
                </div>
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => router.push(`/employee/documents/sign/${envelope.id}`)}
                >
                  <PenLine className="size-4" aria-hidden />
                  {t('sign_now')}
                </Button>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-3">
                <StatusTracker
                  steps={envelopeSteps(envelope, t)}
                  nextStepText={envelope.nextStepText ?? t('tracker_next_sign')}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
