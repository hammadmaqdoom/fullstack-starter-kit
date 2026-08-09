'use client';

import type { HubItem } from '@/libs/api/hub';
import type { TeamPunchToday } from '@/libs/api/attendance';
import { ApprovalsQueue } from '@/components/manager/ApprovalsQueue';
import { TeamAttendanceStrip } from '@/components/manager/TeamAttendanceStrip';
import { getTodayPunches } from '@/libs/api/attendance';
import { ApiRequestError } from '@/libs/api/client';
import { listHubItems } from '@/libs/api/hub';
import { Link } from '@/libs/I18nNavigation';
import { AlertCircle, Briefcase, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { useCallback, useEffect, useState } from 'react';

type Mode = 'me' | 'team';

export default function ManagerCockpitPage() {
  const t = useTranslations('ManagerCockpit');
  const [mode, setMode] = useState<Mode>('team');
  const [approvals, setApprovals] = useState<HubItem[]>([]);
  const [punches, setPunches] = useState<TeamPunchToday[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const modeOptions = [
    { label: t('mode_me'), value: 'me' as const },
    { label: t('mode_team'), value: 'team' as const },
  ];

  const loadApprovals = useCallback(async () => {
    setApprovalsLoading(true);
    setApprovalsError(null);
    try {
      const { data } = await listHubItems('for_me');
      setApprovals(data.filter(item => item.actionable !== false));
    } catch (err) {
      setApprovals([]);
      setApprovalsError(err instanceof ApiRequestError ? err.message : t('error_load_approvals'));
    } finally {
      setApprovalsLoading(false);
    }
  }, [t]);

  const loadAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const { data } = await getTodayPunches({ scope: 'team' });
      setPunches(data);
    } catch (err) {
      setPunches([]);
      setAttendanceError(err instanceof ApiRequestError ? err.message : t('error_load_attendance'));
    } finally {
      setAttendanceLoading(false);
    }
  }, [t]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadApprovals(), loadAttendance()]);
  }, [loadApprovals, loadAttendance]);

  useEffect(() => {
    if (mode === 'team') {
      void loadAll();
    }
  }, [mode, loadAll]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="size-5 text-gray-700" aria-hidden />
            <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SelectButton
            value={mode}
            onChange={e => setMode(e.value as Mode)}
            options={modeOptions}
            optionLabel="label"
            optionValue="value"
            allowEmpty={false}
            aria-label={t('mode_toggle')}
          />
          {mode === 'team' && (
            <Button
              type="button"
              severity="secondary"
              outlined
              size="small"
              onClick={() => void loadAll()}
              className="gap-2"
              aria-label={t('refresh')}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {t('refresh')}
            </Button>
          )}
        </div>
      </div>

      {mode === 'me' ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-700">{t('me_mode_body')}</p>
          <Link
            href="/employee/home"
            className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {t('me_mode_cta')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.2fr)]">
          <section className="space-y-3" aria-labelledby="team-today-heading">
            <div className="flex items-center justify-between gap-2">
              <h2 id="team-today-heading" className="text-sm font-semibold text-gray-900">
                {t('attendance_title')}
              </h2>
            </div>
            <TeamAttendanceStrip
              punches={punches}
              loading={attendanceLoading}
              error={attendanceError}
              onRetry={() => void loadAttendance()}
            />
          </section>

          <section className="space-y-3" aria-labelledby="awaiting-heading">
            <div className="flex items-center gap-2">
              <h2 id="awaiting-heading" className="text-sm font-semibold text-gray-900">
                {t('approvals_title')}
              </h2>
              {!approvalsLoading && !approvalsError && approvals.length > 0 && (
                <Badge value={approvals.length} severity="info" />
              )}
            </div>
            <ApprovalsQueue
              items={approvals}
              loading={approvalsLoading}
              error={approvalsError}
              onRetry={() => void loadApprovals()}
              onChanged={() => void loadApprovals()}
            />
          </section>
        </div>
      )}

      {mode === 'team' && !approvalsLoading && !attendanceLoading && approvalsError && attendanceError && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <AlertCircle className="size-3.5" aria-hidden />
          {t('partial_error_hint')}
        </div>
      )}
    </div>
  );
}
