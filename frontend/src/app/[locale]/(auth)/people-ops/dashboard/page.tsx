'use client';

import type { ComplianceDashboardRow } from '@/libs/api/policies';
import { AlertCircle, RefreshCw, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Skeleton } from 'primereact/skeleton';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiRequestError } from '@/libs/api/client';
import { getOnboardingKanban } from '@/libs/api/onboarding';
import { getComplianceDashboard } from '@/libs/api/policies';
import { listWorkers } from '@/libs/api/workers';
import {
  countActiveOnboardings,
  filterAckGaps,
  sumPendingAcknowledgements,
} from '@/libs/people-ops-dashboard.metrics';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

type WidgetState<T>
  = | { status: 'loading' }
    | { status: 'ready'; data: T }
    | { status: 'error'; message: string }
    | { status: 'unavailable' };

function MetricCard({
  label,
  hint,
  value,
  state,
  unavailableLabel,
  errorLabel,
}: {
  label: string;
  hint: string;
  value: number | null;
  state: WidgetState<unknown>;
  unavailableLabel: string;
  errorLabel: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      {state.status === 'loading' && <Skeleton height="2rem" className="mt-3" width="4rem" />}
      {state.status === 'ready' && (
        <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">{value ?? 0}</p>
      )}
      {state.status === 'unavailable' && (
        <p className="mt-3 text-sm text-gray-400">{unavailableLabel}</p>
      )}
      {state.status === 'error' && (
        <p className="mt-3 text-sm text-red-600">{errorLabel}</p>
      )}
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

export default function PeopleOpsDashboardPage() {
  const t = useTranslations('PeopleOpsDashboard');

  const [headcount, setHeadcount] = useState<WidgetState<number>>({ status: 'loading' });
  const [compliance, setCompliance] = useState<WidgetState<ComplianceDashboardRow[]>>({
    status: 'loading',
  });
  const [onboarding, setOnboarding] = useState<WidgetState<number>>({ status: 'loading' });

  const load = useCallback(async () => {
    setHeadcount({ status: 'loading' });
    setCompliance({ status: 'loading' });
    setOnboarding({ status: 'loading' });

    const [workersResult, complianceResult, onboardingResult] = await Promise.allSettled([
      listWorkers({ status: 'active', limit: 1 }),
      getComplianceDashboard(),
      getOnboardingKanban(),
    ]);

    if (workersResult.status === 'fulfilled') {
      const total = Number(workersResult.value.meta.total ?? workersResult.value.data.length);
      setHeadcount({
        status: 'ready',
        data: Number.isFinite(total) ? total : workersResult.value.data.length,
      });
    } else {
      const err = workersResult.reason;
      setHeadcount(
        err instanceof ApiRequestError && err.status === 404
          ? { status: 'unavailable' }
          : { status: 'error', message: err instanceof Error ? err.message : t('widget_error') },
      );
    }

    if (complianceResult.status === 'fulfilled') {
      setCompliance({ status: 'ready', data: complianceResult.value.data });
    } else {
      const err = complianceResult.reason;
      setCompliance(
        err instanceof ApiRequestError && (err.status === 404 || err.status === 403)
          ? { status: 'unavailable' }
          : { status: 'error', message: err instanceof Error ? err.message : t('widget_error') },
      );
    }

    if (onboardingResult.status === 'fulfilled') {
      setOnboarding({
        status: 'ready',
        data: countActiveOnboardings(onboardingResult.value.data),
      });
    } else {
      const err = onboardingResult.reason;
      setOnboarding(
        err instanceof ApiRequestError && (err.status === 404 || err.status === 403)
          ? { status: 'unavailable' }
          : { status: 'error', message: err instanceof Error ? err.message : t('widget_error') },
      );
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingAcks = useMemo(() => {
    if (compliance.status !== 'ready') {
      return null;
    }
    return sumPendingAcknowledgements(compliance.data);
  }, [compliance]);

  const ackGaps = useMemo(() => {
    if (compliance.status !== 'ready') {
      return [];
    }
    return filterAckGaps(compliance.data);
  }, [compliance]);

  const allFailed
    = headcount.status === 'error'
      && compliance.status === 'error'
      && onboarding.status === 'error';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <OfflineBanner />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button
          type="button"
          outlined
          onClick={() => void load()}
          className="gap-2"
          aria-label={t('refresh')}
        >
          <RefreshCw className="size-4" aria-hidden />
          {t('refresh')}
        </Button>
      </div>

      {allFailed
        ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-10 text-center">
              <AlertCircle className="size-8 text-red-500" aria-hidden />
              <p className="text-sm text-red-700">{t('error_all')}</p>
              <Button type="button" onClick={() => void load()}>{t('retry')}</Button>
            </div>
          )
        : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                  label={t('metric_headcount')}
                  hint={t('metric_headcount_hint')}
                  value={headcount.status === 'ready' ? headcount.data : null}
                  state={headcount}
                  unavailableLabel={t('widget_unavailable')}
                  errorLabel={t('widget_error')}
                />
                <MetricCard
                  label={t('metric_pending_acks')}
                  hint={t('metric_pending_acks_hint')}
                  value={pendingAcks}
                  state={compliance}
                  unavailableLabel={t('widget_unavailable')}
                  errorLabel={t('widget_error')}
                />
                <MetricCard
                  label={t('metric_onboarding')}
                  hint={t('metric_onboarding_hint')}
                  value={onboarding.status === 'ready' ? onboarding.data : null}
                  state={onboarding}
                  unavailableLabel={t('widget_unavailable')}
                  errorLabel={t('widget_error')}
                />
              </div>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-900">{t('acks_table_title')}</h2>

                {compliance.status === 'loading' && (
                  <div className="space-y-2" aria-busy="true">
                    <Skeleton height="2.5rem" />
                    <Skeleton height="8rem" />
                  </div>
                )}

                {compliance.status === 'unavailable' && (
                  <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center">
                    <Users className="mx-auto size-8 text-gray-300" aria-hidden />
                    <p className="mt-3 text-sm font-medium text-gray-700">{t('acks_unavailable_title')}</p>
                    <p className="mt-1 text-sm text-gray-500">{t('acks_unavailable_description')}</p>
                  </div>
                )}

                {compliance.status === 'error' && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center">
                    <p className="text-sm text-red-700">{t('widget_error')}</p>
                  </div>
                )}

                {compliance.status === 'ready' && ackGaps.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center">
                    <p className="text-sm font-medium text-gray-700">{t('acks_empty_title')}</p>
                    <p className="mt-1 text-sm text-gray-500">{t('acks_empty_description')}</p>
                  </div>
                )}

                {compliance.status === 'ready' && ackGaps.length > 0 && (
                  <DataTable
                    value={ackGaps}
                    dataKey="policyVersionId"
                    className="text-sm"
                    emptyMessage={t('acks_empty_title')}
                  >
                    <Column field="policyTitle" header={t('col_policy')} />
                    <Column field="policyCode" header={t('col_code')} style={{ width: '8rem' }} />
                    <Column field="version" header={t('col_version')} style={{ width: '6rem' }} />
                    <Column field="pendingCount" header={t('col_pending')} style={{ width: '7rem' }} />
                    <Column field="acknowledgedCount" header={t('col_acked')} style={{ width: '8rem' }} />
                  </DataTable>
                )}
              </section>
            </>
          )}
    </div>
  );
}
