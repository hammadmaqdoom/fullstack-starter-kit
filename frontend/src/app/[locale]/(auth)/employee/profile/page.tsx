'use client';

import type { ProfileChangeRequest } from '@/libs/api/profile-change';
import type { Worker } from '@/libs/api/workers';
import { AlertCircle, Clock, RefreshCw, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { ChangeRequestList } from '@/components/employee/ChangeRequestList';
import { ProfileChangeForm } from '@/components/employee/ProfileChangeForm';
import { ApiRequestError } from '@/libs/api/client';
import {
  formatInTimezone,
  getTimezoneAbbreviation,
  resolveDisplayTimezone,
} from '@/libs/datetime/format-in-timezone';
import { usePolarisShell } from '@/libs/hooks/usePolarisShell';
import { listProfileChangeRequests } from '@/libs/api/profile-change';
import { getMyWorker } from '@/libs/api/workers';

function initials(worker: Worker): string {
  return `${worker.firstName[0] ?? ''}${worker.lastName[0] ?? ''}`.toUpperCase() || 'U';
}

export default function EmployeeProfilePage() {
  const t = useTranslations('EmployeeProfile');
  const { shell } = usePolarisShell();
  const canEditExtendedFields = (shell?.roles ?? []).some((role) =>
    ['people_ops', 'super_admin', 'hrbp'].includes(role.toLowerCase()),
  );
  const [worker, setWorker] = useState<Worker | null>(null);
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const loadRequests = useCallback(async (workerId: string) => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const { data } = await listProfileChangeRequests(workerId);
      setRequests(data ?? []);
    } catch (err) {
      setRequests([]);
      setRequestsError(err instanceof ApiRequestError ? err.message : t('error_load_requests'));
    } finally {
      setRequestsLoading(false);
    }
  }, [t]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNotLinked(false);
    setOffline(typeof navigator !== 'undefined' && !navigator.onLine);

    try {
      const { data } = await getMyWorker();
      setWorker(data);
      void loadRequests(data.id);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setNotLinked(true);
      } else {
        setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [t, loadRequests]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onOnline() {
      setOffline(false);
      void load();
    }
    function onOffline() {
      setOffline(true);
    }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [load]);

  const displayTimezone = resolveDisplayTimezone(worker?.timezone);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16 lg:pb-0">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {offline && (
        <Message severity="warn" text={t('offline_banner')} className="w-full" />
      )}

      {isLoading && (
        <div className="space-y-4" aria-busy="true">
          <Skeleton height="8rem" className="rounded-2xl" />
          <Skeleton height="14rem" className="rounded-2xl" />
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load()} className="gap-2">
            <RefreshCw className="size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!isLoading && !error && notLinked && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-white shadow-sm">
            <User className="size-6 text-gray-400" aria-hidden />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{t('not_linked_title')}</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{t('not_linked_description')}</p>
        </div>
      )}

      {!isLoading && !error && !notLinked && worker && (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-700">
                {initials(worker)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {worker.firstName} {worker.lastName}
                  </h2>
                  <Tag value={t(`status_${worker.status}` as 'status_active')} />
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  {worker.employmentType?.displayName}
                  {worker.email ? ` · ${worker.email}` : ''}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="size-3.5 shrink-0" aria-hidden />
                  {t('local_time', {
                    time: formatInTimezone(new Date().toISOString(), displayTimezone, {
                      hour: 'numeric',
                      minute: '2-digit',
                    }),
                    zone: getTimezoneAbbreviation(displayTimezone),
                  })}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">{t('edit_section_title')}</h2>
            <ProfileChangeForm
              worker={worker}
              canEditExtendedFields={canEditExtendedFields}
              onSubmitted={() => void loadRequests(worker.id)}
            />
          </section>

          <section aria-label={t('requests_section_title')} className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">{t('requests_section_title')}</h2>
            <ChangeRequestList
              requests={requests}
              isLoading={requestsLoading}
              error={requestsError}
              onRetry={() => void loadRequests(worker.id)}
              timezone={displayTimezone}
              canApprove={false}
            />
          </section>
        </>
      )}
    </div>
  );
}
