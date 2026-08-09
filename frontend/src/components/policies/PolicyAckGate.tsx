'use client';

import type { PendingPolicyAcknowledgement } from '@/libs/api/policies';
import { PolicyAckModal } from '@/components/policies/PolicyAckModal';
import { OfflineBanner, useOnlineStatus } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  acknowledgePolicyVersion,
  listPendingAcknowledgements,
} from '@/libs/api/policies';
import { CheckCircle2, FileCheck2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';

type GateStatus = 'loading' | 'ready' | 'error' | 'success' | 'cleared';

type PolicyAckGateProps = {
  children: React.ReactNode;
};

const SUCCESS_HOLD_MS = 900;

export function PolicyAckGate({ children }: PolicyAckGateProps) {
  const t = useTranslations('Policies');
  const isOnline = useOnlineStatus();

  const [status, setStatus] = useState<GateStatus>('loading');
  const [items, setItems] = useState<PendingPolicyAcknowledgement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PendingPolicyAcknowledgement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { data } = await listPendingAcknowledgements();
      const pending = data ?? [];
      setItems(pending);
      setStatus(pending.length === 0 ? 'cleared' : 'ready');
    } catch (err) {
      // Users without a linked worker have nothing to acknowledge — allow through.
      if (
        err instanceof ApiRequestError
        && (err.status === 404
          || err.errors.some(e => e.code === 'WORKER_NOT_FOUND'))
      ) {
        setItems([]);
        setStatus('cleared');
        return;
      }
      setItems([]);
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setStatus('error');
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (status !== 'success') {
      return;
    }
    const timer = window.setTimeout(() => {
      setStatus('cleared');
    }, SUCCESS_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleAcknowledge = async () => {
    if (!selected) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await acknowledgePolicyVersion(selected.policyVersionId);
      const remaining = items.filter(p => p.policyVersionId !== selected.policyVersionId);
      setSelected(null);
      setItems(remaining);
      if (remaining.length === 0) {
        setStatus('success');
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_ack'));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'cleared') {
    return <>{children}</>;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-ack-gate-title"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <OfflineBanner className="mb-4" />

        <div className="mb-6 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <ShieldCheck className="size-5 text-gray-700" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1
              id="policy-ack-gate-title"
              className="text-xl font-semibold text-gray-900"
            >
              {t('gate_title')}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t('gate_subtitle')}</p>
            {status === 'ready' && items.length > 0 && (
              <p className="mt-2 text-xs font-medium text-gray-600">
                {t('gate_remaining', { count: items.length })}
              </p>
            )}
          </div>
        </div>

        {!isOnline && status !== 'loading' && status !== 'success' && (
          <Message
            severity="warn"
            className="mb-4 w-full justify-start"
            text={t('gate_offline')}
          />
        )}

        {error && status === 'ready' && (
          <Message
            severity="error"
            className="mb-4 w-full justify-start"
            text={error}
          />
        )}

        {status === 'loading' && (
          <div className="space-y-3" aria-busy="true" aria-label={t('gate_loading')}>
            <Skeleton height="5.5rem" />
            <Skeleton height="5.5rem" />
            <Skeleton height="5.5rem" />
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error ?? t('error_load')}</p>
            <Button
              type="button"
              className="mt-4 gap-2"
              onClick={() => void load()}
              disabled={!isOnline}
            >
              <RefreshCw className="size-4" aria-hidden />
              {t('retry')}
            </Button>
          </div>
        )}

        {status === 'success' && (
          <Message
            severity="success"
            className="w-full justify-start"
            role="status"
            content={(
              <span className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                {t('gate_success')}
              </span>
            )}
          />
        )}

        {status === 'ready' && items.length > 0 && (
          <ul className="space-y-3 overflow-y-auto pb-4">
            {items.map(policy => (
              <li
                key={policy.policyVersionId}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-gray-900">
                        {policy.policyTitle}
                      </h2>
                      <Tag value={t(`category_${policy.category}`)} severity="info" />
                      <Tag value={t('status_pending')} severity="warning" />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('version_label', { version: policy.version })}
                      {' · '}
                      {t('effective_from', {
                        date:
                          typeof policy.effectiveFrom === 'string'
                            ? policy.effectiveFrom.slice(0, 10)
                            : String(policy.effectiveFrom),
                      })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="gap-2 self-start"
                    onClick={() => {
                      setError(null);
                      setSelected(policy);
                    }}
                    disabled={!isOnline || submitting}
                  >
                    <FileCheck2 className="size-4" aria-hidden />
                    {t('read_and_acknowledge')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PolicyAckModal
        policy={selected}
        visible={selected !== null}
        submitting={submitting}
        mandatory
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
