'use client';

import type {
  PerformanceReview,
  TeamPerformanceDashboard,
} from '@/libs/api/talent';
import {
  createOneOnOne,
  getTeamPerformanceDashboard,
  submitManagerReview,
  updateOneOnOne,
} from '@/libs/api/talent';
import { ApiRequestError } from '@/libs/api/client';
import { parsePerformanceSearchParams } from '@/libs/performance/performance-query';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Calendar,
  ClipboardList,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressBar } from 'primereact/progressbar';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function ManagerPerformanceBoard() {
  const t = useTranslations('ManagerPerformance');
  const [data, setData] = useState<TeamPerformanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [activeReview, setActiveReview] = useState<PerformanceReview | null>(null);
  const [managerAssessment, setManagerAssessment] = useState('');
  const [outcome, setOutcome] = useState('meets');

  const [oneOnOneOpen, setOneOnOneOpen] = useState(false);
  const [oneOnOneWorkerId, setOneOnOneWorkerId] = useState<string | null>(null);
  const [oneOnOneAt, setOneOnOneAt] = useState('');
  const [oneOnOneAgenda, setOneOnOneAgenda] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: dashboard } = await getTeamPerformanceDashboard();
      setData(dashboard);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const { reviewId } = parsePerformanceSearchParams(window.location.search);
    if (!reviewId) return;
    for (const report of data.reports) {
      const review = report.reviews.find((r) => r.id === reviewId);
      if (review?.status === 'pending_manager') {
        setActiveReview(review);
        setManagerAssessment('');
        setOutcome('meets');
        setReviewDialogOpen(true);
        break;
      }
    }
  }, [data]);

  const reportOptions = useMemo(
    () =>
      (data?.reports ?? []).map((r) => ({
        label: `${r.firstName} ${r.lastName}`,
        value: r.workerId,
      })),
    [data],
  );

  const outcomeOptions = [
    { label: t('outcome_exceeds'), value: 'exceeds' },
    { label: t('outcome_meets'), value: 'meets' },
    { label: t('outcome_below'), value: 'below' },
  ];

  const handleSubmitReview = async () => {
    if (!activeReview || !managerAssessment.trim()) return;
    setSubmitting(true);
    try {
      await submitManagerReview(activeReview.id, {
        managerAssessment: managerAssessment.trim(),
        outcome,
      });
      setReviewDialogOpen(false);
      setActiveReview(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleOneOnOne = async () => {
    if (!oneOnOneWorkerId || !oneOnOneAt) return;
    setSubmitting(true);
    try {
      await createOneOnOne({
        employeeWorkerId: oneOnOneWorkerId,
        scheduledAt: new Date(oneOnOneAt).toISOString(),
        agenda: oneOnOneAgenda.trim() || undefined,
      });
      setOneOnOneOpen(false);
      setOneOnOneWorkerId(null);
      setOneOnOneAt('');
      setOneOnOneAgenda('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteOneOnOne = async (id: string) => {
    setSubmitting(true);
    try {
      await updateOneOnOne(id, { status: 'completed' });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton height="2rem" className="w-64" />
        <Skeleton height="12rem" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <Button type="button" className="mt-4 gap-2" onClick={() => void load()}>
          <RefreshCw className="size-4" aria-hidden />
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (!data) {
    return <EmptyState title={t('empty')} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="gap-2"
            onClick={() => setOneOnOneOpen(true)}
            disabled={reportOptions.length === 0}
          >
            <Calendar className="size-4" aria-hidden />
            {t('schedule_one_on_one')}
          </Button>
          <Button type="button" severity="secondary" outlined className="gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="size-4" aria-hidden />
            {t('direct_reports')}
          </div>
          <p className="mt-2 text-2xl font-semibold">{data.reports.length}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ClipboardList className="size-4" aria-hidden />
            {t('reviews_awaiting')}
          </div>
          <p className="mt-2 text-2xl font-semibold">{data.reviewsAwaitingMe}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="size-4" aria-hidden />
            {t('upcoming_one_on_ones')}
          </div>
          <p className="mt-2 text-2xl font-semibold">{data.oneOnOnes.length}</p>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t('team_section')}
        </h2>
        {data.reports.length === 0 ? (
          <EmptyState icon={Users} title={t('no_reports')} />
        ) : (
          data.reports.map((report) => {
            const pendingManager = report.reviews.filter(
              (r) => r.status === 'pending_manager',
            );
            return (
              <Card key={report.workerId} className="shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {report.firstName}
                      {' '}
                      {report.lastName}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('goals_count', { count: report.goals.length })}
                      {' · '}
                      {t('reviews_count', { count: report.reviews.length })}
                    </p>
                  </div>
                </div>

                {report.goals.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {report.goals.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="rounded-md border border-gray-100 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 text-sm text-gray-800">
                            <Target className="size-3.5" aria-hidden />
                            {goal.title}
                          </span>
                          <Tag value={`${goal.progressPercent}%`} />
                        </div>
                        <ProgressBar value={goal.progressPercent} className="mt-2 h-1.5" showValue={false} />
                      </div>
                    ))}
                  </div>
                )}

                {pendingManager.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {pendingManager.map((review) => (
                      <div
                        key={review.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-amber-50 px-3 py-2"
                      >
                        <span className="text-sm text-amber-900">{t('manager_review_due')}</span>
                        <Button
                          type="button"
                          size="small"
                          onClick={() => {
                            setActiveReview(review);
                            setManagerAssessment('');
                            setOutcome('meets');
                            setReviewDialogOpen(true);
                          }}
                        >
                          {t('submit_manager_review')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t('upcoming_one_on_ones')}
        </h2>
        {data.oneOnOnes.length === 0 ? (
          <EmptyState icon={Calendar} title={t('no_one_on_ones')} />
        ) : (
          data.oneOnOnes.map((meeting) => (
            <Card key={meeting.id} className="shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(meeting.scheduledAt).toLocaleString()}
                  </p>
                  {meeting.agenda && (
                    <p className="mt-1 text-sm text-gray-500">{meeting.agenda}</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="small"
                  outlined
                  disabled={submitting}
                  onClick={() => void handleCompleteOneOnOne(meeting.id)}
                >
                  {t('mark_completed')}
                </Button>
              </div>
            </Card>
          ))
        )}
      </section>

      <Dialog
        header={t('submit_manager_review')}
        visible={reviewDialogOpen}
        onHide={() => setReviewDialogOpen(false)}
        modal
        className="w-full max-w-lg"
      >
        <div className="space-y-4">
          {activeReview?.selfAssessment && (
            <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-medium text-gray-900">{t('self_assessment')}</p>
              <p className="mt-1">{activeReview.selfAssessment}</p>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="mgr-outcome">
              {t('outcome')}
            </label>
            <Dropdown
              inputId="mgr-outcome"
              value={outcome}
              options={outcomeOptions}
              onChange={(e) => setOutcome(e.value as string)}
              className="w-full"
            />
          </div>
          <InputTextarea
            value={managerAssessment}
            onChange={(e) => setManagerAssessment(e.target.value)}
            placeholder={t('manager_assessment_placeholder')}
            rows={5}
            className="w-full"
          />
          <Button type="button" loading={submitting} onClick={() => void handleSubmitReview()}>
            {t('submit')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        header={t('schedule_one_on_one')}
        visible={oneOnOneOpen}
        onHide={() => setOneOnOneOpen(false)}
        modal
        className="w-full max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="ooo-worker">
              {t('employee')}
            </label>
            <Dropdown
              inputId="ooo-worker"
              value={oneOnOneWorkerId}
              options={reportOptions}
              onChange={(e) => setOneOnOneWorkerId(e.value as string)}
              placeholder={t('select_employee')}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="ooo-at">
              {t('scheduled_at')}
            </label>
            <InputText
              id="ooo-at"
              type="datetime-local"
              value={oneOnOneAt}
              onChange={(e) => setOneOnOneAt(e.target.value)}
              className="w-full"
            />
          </div>
          <InputTextarea
            value={oneOnOneAgenda}
            onChange={(e) => setOneOnOneAgenda(e.target.value)}
            placeholder={t('agenda_placeholder')}
            rows={3}
            className="w-full"
          />
          <Button type="button" loading={submitting} onClick={() => void handleScheduleOneOnOne()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
