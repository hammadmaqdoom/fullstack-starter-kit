'use client';

import type { ProfileChangeRequest } from '@/libs/api/profile-change';
import type { Worker } from '@/libs/api/workers';
import { AlertCircle, Archive, ArrowLeft, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { ChangeRequestList } from '@/components/employee/ChangeRequestList';
import { WorkerForm } from '@/components/workers/WorkerForm';
import { ApiRequestError } from '@/libs/api/client';
import { listDivisions } from '@/libs/api/org-admin';
import { listProfileChangeRequests } from '@/libs/api/profile-change';
import { archiveWorker, getWorker } from '@/libs/api/workers';
import { Link } from '@/libs/I18nNavigation';

export default function WorkerDetailPage() {
  const t = useTranslations('Workers');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const workerId = params.id;

  const [worker, setWorker] = useState<Worker | null>(null);
  const [divisionLabel, setDivisionLabel] = useState('—');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changeRequests, setChangeRequests] = useState<ProfileChangeRequest[]>([]);
  const [changeRequestsLoading, setChangeRequestsLoading] = useState(true);
  const [changeRequestsError, setChangeRequestsError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const loadWorker = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [{ data }, divisionsRes] = await Promise.all([
        getWorker(workerId),
        listDivisions().catch(() => ({ data: [] as { id: string; name: string }[] })),
      ]);
      setWorker(data);
      const label = data.divisionId
        ? divisionsRes.data.find(d => d.id === data.divisionId)?.name ?? '—'
        : '—';
      setDivisionLabel(label);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setIsLoading(false);
    }
  }, [workerId, t]);

  const loadChangeRequests = useCallback(async () => {
    setChangeRequestsLoading(true);
    setChangeRequestsError(null);
    try {
      const { data } = await listProfileChangeRequests(workerId);
      setChangeRequests(data ?? []);
    } catch (err) {
      setChangeRequests([]);
      setChangeRequestsError(
        err instanceof ApiRequestError ? err.message : t('error_load_change_requests'),
      );
    } finally {
      setChangeRequestsLoading(false);
    }
  }, [workerId, t]);

  useEffect(() => {
    void loadWorker();
    void loadChangeRequests();
  }, [loadWorker, loadChangeRequests]);

  const handleArchive = () => {
    confirmDialog({
      message: t('archive_confirm'),
      header: t('archive'),
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => {
        void (async () => {
          setArchiving(true);
          setError(null);
          try {
            await archiveWorker(workerId);
            router.push('/people-ops/workers');
          } catch (err) {
            setError(
              err instanceof ApiRequestError ? err.message : t('error_archive'),
            );
          } finally {
            setArchiving(false);
          }
        })();
      },
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <Skeleton height="2rem" width="40%" />
        <Skeleton height="20rem" className="w-full" />
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <AlertCircle className="mx-auto size-8 text-red-500" aria-hidden />
        <p className="text-sm text-red-700">{error ?? t('error_load')}</p>
        <div className="flex justify-center gap-2">
          <Button type="button" outlined onClick={() => void loadWorker()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('retry')}
          </Button>
          <Link
            href="/people-ops/workers"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t('back_to_list')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ConfirmDialog />
      <div>
        <Link
          href="/people-ops/workers"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('back_to_list')}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">
            {worker.firstName}
            {' '}
            {worker.lastName}
          </h1>
          <Tag value={t(`status_${worker.status}`)} />
          <span className="text-sm text-gray-500">
            {worker.employmentType?.displayName}
            {' '}
            ·
            {divisionLabel}
            {' '}
            ·
            {' '}
            {worker.countryCode}
          </span>
          {worker.status !== 'archived' && (
            <Button
              type="button"
              severity="danger"
              outlined
              size="small"
              className="ml-auto gap-1"
              loading={archiving}
              onClick={handleArchive}
            >
              <Archive className="size-3.5" aria-hidden />
              {archiving ? t('archiving') : t('archive')}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">{t('edit_title')}</h2>
        <WorkerForm
          worker={worker}
          onSuccess={(updated) => {
            setWorker(updated);
            router.refresh();
          }}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">{t('change_requests_title')}</h2>
        <ChangeRequestList
          requests={changeRequests}
          isLoading={changeRequestsLoading}
          error={changeRequestsError}
          onRetry={() => void loadChangeRequests()}
          canApprove
          onChanged={() => void loadChangeRequests()}
        />
      </div>
    </div>
  );
}
