'use client';

import type { PendingPolicyAcknowledgement } from '@/libs/api/policies';
import type { TrackerStep } from '@/components/shared/StatusTracker';
import { PolicyAckModal } from '@/components/policies/PolicyAckModal';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  acknowledgePolicyVersion,
  listPendingAcknowledgements,
} from '@/libs/api/policies';
import { CheckCircle2, FileCheck2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { useCallback, useEffect, useRef, useState } from 'react';

function policyTrackerSteps(t: ReturnType<typeof useTranslations<'Policies'>>): TrackerStep[] {
  return [
    { label: t('tracker_published'), state: 'done' },
    { label: t('tracker_pending'), state: 'current', actor: t('tracker_you') },
    { label: t('tracker_acknowledged'), state: 'todo' },
  ];
}

export default function EmployeePoliciesPage() {
  const t = useTranslations('Policies');
  const toast = useRef<Toast>(null);

  const [items, setItems] = useState<PendingPolicyAcknowledgement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PendingPolicyAcknowledgement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listPendingAcknowledgements();
      setItems(data ?? []);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAcknowledge = async () => {
    if (!selected) {
      return;
    }
    setSubmitting(true);
    try {
      await acknowledgePolicyVersion(selected.policyVersionId);
      setSelected(null);
      setSuccessMessage(t('ack_success'));
      toast.current?.show({
        severity: 'success',
        summary: t('ack_success'),
        life: 3000,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_ack'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Toast ref={toast} />
      <OfflineBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('employee_title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('employee_subtitle')}</p>
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

      {successMessage && (
        <Message
          severity="success"
          className="w-full justify-start"
          content={(
            <span className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              {successMessage}
            </span>
          )}
        />
      )}

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

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={FileCheck2}
          title={t('empty_pending_title')}
          description={t('empty_pending_description')}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3">
          {items.map(policy => (
            <li
              key={policy.policyVersionId}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-900">{policy.policyTitle}</h2>
                    <Tag value={t(`category_${policy.category}`)} severity="info" />
                    <Tag value={t('status_pending')} severity="warning" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {t('version_label', { version: policy.version })}
                    {' · '}
                    {t('effective_from', { date: policy.effectiveFrom })}
                  </p>
                </div>
                <Button
                  type="button"
                  className="gap-2 self-start"
                  onClick={() => {
                    setSuccessMessage(null);
                    setSelected(policy);
                  }}
                >
                  <FileCheck2 className="size-4" aria-hidden />
                  {t('acknowledge')}
                </Button>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-3">
                <StatusTracker
                  steps={policyTrackerSteps(t)}
                  nextStepText={t('tracker_next_ack')}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <PolicyAckModal
        policy={selected}
        visible={selected !== null}
        submitting={submitting}
        onHide={() => {
          if (!submitting) {
            setSelected(null);
          }
        }}
        onConfirm={() => void handleAcknowledge()}
      />
    </div>
  );
}
