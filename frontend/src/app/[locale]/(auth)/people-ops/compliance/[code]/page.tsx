'use client';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  getComplianceControl,
  runComplianceControl,
} from '@/libs/api/compliance-controls';
import { Link } from '@/libs/I18nNavigation';
import { ArrowLeft, Play, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Button } from 'primereact/button';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';

export default function PeopleOpsComplianceDetailPage() {
  const t = useTranslations('PeopleOpsCompliance');
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof getComplianceControl>
  >['data'] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getComplianceControl(code);
      setDetail(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [code, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRun = async () => {
    setRunning(true);
    try {
      await runComplianceControl(code);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_run'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <OfflineBanner />
      <Link
        href="/people-ops/compliance"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('back')}
      </Link>

      {loading && <Skeleton height="10rem" />}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <Button type="button" className="mt-4 gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && detail && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                {detail.code}
              </p>
              <h1 className="text-xl font-semibold text-gray-900">
                {detail.title}
              </h1>
              <p className="mt-2 text-sm text-gray-600">{detail.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Tag value={detail.domain} />
                <Tag value={detail.ownerRole} severity="secondary" />
                {detail.latestRun && (
                  <Tag value={detail.latestRun.result} />
                )}
              </div>
            </div>
            <Button
              type="button"
              className="gap-2 self-start"
              onClick={() => void onRun()}
              disabled={running || !detail.testAdapterKey}
              label={t('run_now')}
              icon={<Play className="size-4" aria-hidden />}
            />
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">
              {t('frameworks_heading')}
            </h2>
            <ul className="space-y-1 text-sm text-gray-700">
              {detail.frameworks.map((f) => (
                <li key={`${f.framework}:${f.externalRef}`}>
                  {f.framework} — {f.externalRef}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">
              {t('runs_heading')}
            </h2>
            {detail.runs.length === 0 ? (
              <p className="text-sm text-gray-500">{t('runs_empty')}</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                {detail.runs.map((run) => (
                  <li
                    key={run.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <Tag value={run.result} />
                    <span className="text-gray-500">
                      {new Date(run.ranAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
