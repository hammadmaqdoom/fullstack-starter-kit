'use client';

import type {
  AssessmentQuestion,
  PerformanceReview,
  TeamPerformanceDashboard,
} from '@/libs/api/talent';
import type { DirectoryEntry } from '@/libs/api/org';
import {
  createFeedback,
  createOneOnOne,
  getReview,
  getTeamPerformanceDashboard,
  listDevelopmentPlanActions,
  listDevelopmentPlans,
  signOffReview,
  submitManagerReview,
  triggerSeparationFromProbationReview,
  updateOneOnOne,
} from '@/libs/api/talent';
import { ApiRequestError } from '@/libs/api/client';
import { AssessmentAnswersReadOnly } from '@/components/performance/AssessmentAnswersReadOnly';
import { AssessmentQuestionnaireForm } from '@/components/performance/AssessmentQuestionnaireForm';
import { DevelopmentPlanPanel } from '@/components/performance/DevelopmentPlanPanel';
import {
  hasRequiredGaps,
  isTemplateEmpty,
  type AssessmentAnswers,
} from '@/libs/performance/assessment-questionnaire';
import { parsePerformanceSearchParams } from '@/libs/performance/performance-query';
import {
  canManagerSignOff,
  canTriggerProbationSeparation,
} from '@/libs/performance/review-visibility';
import { EmptyState } from '@/components/shared/EmptyState';
import { WorkerPicker } from '@/components/shared/WorkerPicker';
import {
  Calendar,
  ClipboardList,
  MessageSquare,
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
  const [managerAnswers, setManagerAnswers] = useState<AssessmentAnswers>({});
  const [managerTemplate, setManagerTemplate] = useState<AssessmentQuestion[]>([]);
  const [reviewDetailLoading, setReviewDetailLoading] = useState(false);
  const [outcome, setOutcome] = useState('meets');
  const [probationOutcome, setProbationOutcome] = useState<string | null>(null);

  const [oneOnOneOpen, setOneOnOneOpen] = useState(false);
  const [oneOnOneWorkerId, setOneOnOneWorkerId] = useState<string | null>(null);
  const [oneOnOneAt, setOneOnOneAt] = useState('');
  const [oneOnOneAgenda, setOneOnOneAgenda] = useState('');

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRecipient, setFeedbackRecipient] = useState<DirectoryEntry | null>(null);
  const [feedbackType, setFeedbackType] = useState('praise');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const [separationOpen, setSeparationOpen] = useState(false);
  const [separationReview, setSeparationReview] = useState<PerformanceReview | null>(null);
  const [lastWorkingDay, setLastWorkingDay] = useState('');

  const [developmentActionId, setDevelopmentActionId] = useState<string | null>(null);
  const [idpWorkerId, setIdpWorkerId] = useState<string | null>(null);

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

  const openManagerReview = useCallback(async (review: PerformanceReview) => {
    setActiveReview(review);
    setManagerAnswers({});
    setOutcome('meets');
    setProbationOutcome(null);
    setReviewDialogOpen(true);
    setReviewDetailLoading(true);
    try {
      const { data: detail } = await getReview(review.id);
      setActiveReview(detail);
      setManagerTemplate(detail.cycle?.managerAssessmentTemplate ?? []);
    } catch (err) {
      setManagerTemplate([]);
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setReviewDetailLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!data) return;
    const { reviewId, developmentActionId: actionId } =
      parsePerformanceSearchParams(window.location.search);
    if (actionId) {
      setDevelopmentActionId(actionId);
    }
    if (!reviewId) return;
    for (const report of data.reports) {
      const review = report.reviews.find((r) => r.id === reviewId);
      if (review?.status === 'pending_manager') {
        void openManagerReview(review);
        break;
      }
    }
  }, [data, openManagerReview]);

  useEffect(() => {
    if (!data || !developmentActionId) return;
    let cancelled = false;
    void (async () => {
      for (const report of data.reports) {
        try {
          const { data: plans } = await listDevelopmentPlans(report.workerId);
          for (const plan of plans) {
            const { data: actions } = await listDevelopmentPlanActions(plan.id);
            if (actions.some((a) => a.id === developmentActionId)) {
              if (!cancelled) setIdpWorkerId(report.workerId);
              return;
            }
          }
        } catch {
          // keep scanning other reports
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, developmentActionId]);

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

  const probationOptions = [
    { label: t('probation_confirm'), value: 'confirm' },
    { label: t('probation_extend'), value: 'extend' },
    { label: t('probation_terminate'), value: 'terminate' },
  ];

  const feedbackTypeOptions = [
    { label: t('feedback_type_praise'), value: 'praise' },
    { label: t('feedback_type_constructive'), value: 'constructive' },
    { label: t('feedback_type_coaching'), value: 'coaching' },
  ];

  const isProbationCycle = activeReview?.cycle?.cycleType === 'probation';

  const handleSubmitReview = async () => {
    if (!activeReview || isTemplateEmpty(managerTemplate)) return;
    if (hasRequiredGaps(managerTemplate, managerAnswers)) return;
    if (isProbationCycle && !probationOutcome) return;
    setSubmitting(true);
    try {
      await submitManagerReview(activeReview.id, {
        answers: managerAnswers,
        outcome,
        probationOutcome: isProbationCycle
          ? (probationOutcome ?? undefined)
          : undefined,
      });
      setReviewDialogOpen(false);
      setActiveReview(null);
      setManagerAnswers({});
      setManagerTemplate([]);
      setProbationOutcome(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleManagerSignOff = async (reviewId: string) => {
    setSubmitting(true);
    try {
      await signOffReview(reviewId, true);
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

  const handleFeedback = async () => {
    if (!feedbackRecipient || !feedbackMessage.trim()) return;
    setSubmitting(true);
    try {
      await createFeedback({
        recipientWorkerId: feedbackRecipient.id,
        feedbackType,
        message: feedbackMessage.trim(),
      });
      setFeedbackOpen(false);
      setFeedbackRecipient(null);
      setFeedbackMessage('');
      setFeedbackType('praise');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const openSeparation = (review: PerformanceReview) => {
    setSeparationReview(review);
    setLastWorkingDay('');
    setSeparationOpen(true);
  };

  const handleTriggerSeparation = async () => {
    if (!separationReview || !lastWorkingDay) return;
    setSubmitting(true);
    try {
      await triggerSeparationFromProbationReview(separationReview.id, {
        lastWorkingDay,
      });
      setSeparationOpen(false);
      setSeparationReview(null);
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
            onClick={() => setFeedbackOpen(true)}
            disabled={reportOptions.length === 0}
          >
            <MessageSquare className="size-4" aria-hidden />
            {t('give_feedback')}
          </Button>
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
            const pendingSignOff = report.reviews.filter((r) =>
              canManagerSignOff(r.status, r.managerSignedOff ?? false),
            );
            const terminateReviews = report.reviews.filter((r) =>
              canTriggerProbationSeparation(r.probationOutcome),
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
                          onClick={() => void openManagerReview(review)}
                        >
                          {t('submit_manager_review')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {pendingSignOff.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {pendingSignOff.map((review) => (
                      <div
                        key={review.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-blue-50 px-3 py-2"
                      >
                        <span className="text-sm text-blue-900">{t('sign_off_due')}</span>
                        <Button
                          type="button"
                          size="small"
                          disabled={submitting}
                          onClick={() => void handleManagerSignOff(review.id)}
                        >
                          {t('sign_off')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {terminateReviews.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {terminateReviews.map((review) => (
                      <div
                        key={review.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 px-3 py-2"
                      >
                        <span className="text-sm text-red-900">{t('probation_failed')}</span>
                        <Button
                          type="button"
                          size="small"
                          severity="danger"
                          onClick={() => openSeparation(review)}
                        >
                          {t('start_separation')}
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

      {idpWorkerId && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t('development_plans')}
          </h2>
          <DevelopmentPlanPanel
            workerId={idpWorkerId}
            highlightActionId={developmentActionId}
          />
        </section>
      )}

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
          {reviewDetailLoading ? (
            <Skeleton height="8rem" />
          ) : (
            <>
              <AssessmentAnswersReadOnly
                payload={activeReview?.selfAssessmentPayload}
                fallbackText={activeReview?.selfAssessment}
              />
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
              {isProbationCycle && (
                <div>
                  <label
                    className="mb-1 block text-xs font-medium text-gray-600"
                    htmlFor="mgr-probation"
                  >
                    {t('probation_outcome')}
                  </label>
                  <Dropdown
                    inputId="mgr-probation"
                    value={probationOutcome}
                    options={probationOptions}
                    onChange={(e) => setProbationOutcome(e.value as string)}
                    placeholder={t('select_probation_outcome')}
                    className="w-full"
                  />
                </div>
              )}
              <AssessmentQuestionnaireForm
                questions={managerTemplate}
                value={managerAnswers}
                onChange={setManagerAnswers}
              />
            </>
          )}
          <Button
            type="button"
            loading={submitting}
            disabled={
              reviewDetailLoading
              || isTemplateEmpty(managerTemplate)
              || hasRequiredGaps(managerTemplate, managerAnswers)
              || (isProbationCycle && !probationOutcome)
            }
            onClick={() => void handleSubmitReview()}
          >
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
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="ooo-employee">
              {t('employee')}
            </label>
            <Dropdown
              inputId="ooo-employee"
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
          <Button
            type="button"
            loading={submitting}
            disabled={!oneOnOneWorkerId || !oneOnOneAt}
            onClick={() => void handleScheduleOneOnOne()}
          >
            {t('save')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        header={t('give_feedback')}
        visible={feedbackOpen}
        onHide={() => setFeedbackOpen(false)}
        modal
        className="w-full max-w-md"
      >
        <div className="space-y-4">
          <WorkerPicker
            value={feedbackRecipient}
            onChange={setFeedbackRecipient}
            placeholder={t('recipient_placeholder')}
          />
          <Dropdown
            value={feedbackType}
            options={feedbackTypeOptions}
            onChange={(e) => setFeedbackType(e.value as string)}
            className="w-full"
          />
          <InputTextarea
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
            placeholder={t('feedback_placeholder')}
            rows={4}
            className="w-full"
          />
          <Button
            type="button"
            loading={submitting}
            disabled={!feedbackRecipient || !feedbackMessage.trim()}
            onClick={() => void handleFeedback()}
          >
            {t('submit')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        header={t('start_separation')}
        visible={separationOpen}
        onHide={() => setSeparationOpen(false)}
        modal
        className="w-full max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('separation_hint')}</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="lwd">
              {t('last_working_day')}
            </label>
            <InputText
              id="lwd"
              type="date"
              value={lastWorkingDay}
              onChange={(e) => setLastWorkingDay(e.target.value)}
              className="w-full"
            />
          </div>
          <Button
            type="button"
            severity="danger"
            loading={submitting}
            disabled={!lastWorkingDay}
            onClick={() => void handleTriggerSeparation()}
          >
            {t('confirm_separation')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
