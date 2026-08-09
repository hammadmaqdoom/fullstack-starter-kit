'use client';

import type { DirectoryEntry } from '@/libs/api/org';
import type { PerformanceDashboard, PerformanceReview } from '@/libs/api/talent';
import {
  addGoalCheckIn,
  createFeedback,
  createGoal,
  createRecognition,
  getPerformanceDashboard,
  submitSelfAssessment,
} from '@/libs/api/talent';
import { ApiRequestError } from '@/libs/api/client';
import { parsePerformanceSearchParams } from '@/libs/performance/performance-query';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusTracker, type TrackerStep } from '@/components/shared/StatusTracker';
import { WorkerPicker } from '@/components/shared/WorkerPicker';
import {
  Award,
  Calendar,
  ClipboardList,
  MessageSquare,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressBar } from 'primereact/progressbar';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';

type PerformanceDashboardViewProps = {
  showAdminHints?: boolean;
};

type FeedbackTypeOption = 'praise' | 'constructive' | 'coaching';
type ProgressStatusOption = 'on_track' | 'at_risk' | 'off_track';

function reviewTrackerSteps(review: PerformanceReview, t: (key: string) => string): TrackerStep[] {
  const order = [
    'pending_self',
    'pending_manager',
    'pending_peer',
    'pending_calibration',
    'pending_sign_off',
    'completed',
  ] as const;
  const currentIdx = order.indexOf(review.status as (typeof order)[number]);
  const labels: Record<(typeof order)[number], string> = {
    pending_self: t('tracker_self'),
    pending_manager: t('tracker_manager'),
    pending_peer: t('tracker_peer'),
    pending_calibration: t('tracker_calibration'),
    pending_sign_off: t('tracker_sign_off'),
    completed: t('tracker_completed'),
  };

  return order.map((status, idx) => ({
    label: labels[status],
    state:
      currentIdx < 0
        ? 'todo'
        : idx < currentIdx
          ? 'done'
          : idx === currentIdx
            ? 'current'
            : 'todo',
  }));
}

export function PerformanceDashboardView({
  showAdminHints = false,
}: PerformanceDashboardViewProps) {
  const t = useTranslations('Performance');
  const [data, setData] = useState<PerformanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalDueDate, setNewGoalDueDate] = useState('');
  const [newGoalWeight, setNewGoalWeight] = useState<number | null>(null);

  const [checkInGoalId, setCheckInGoalId] = useState<string | null>(null);
  const [checkInPercent, setCheckInPercent] = useState(0);
  const [checkInStatus, setCheckInStatus] = useState<ProgressStatusOption>('on_track');
  const [checkInNotes, setCheckInNotes] = useState('');

  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackRecipient, setFeedbackRecipient] = useState<DirectoryEntry | null>(null);
  const [feedbackType, setFeedbackType] = useState<FeedbackTypeOption>('praise');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const [recognitionDialogOpen, setRecognitionDialogOpen] = useState(false);
  const [recognitionRecipient, setRecognitionRecipient] = useState<DirectoryEntry | null>(null);
  const [recognitionMessage, setRecognitionMessage] = useState('');
  const [recognitionTag, setRecognitionTag] = useState('');

  const [selfAssessmentOpen, setSelfAssessmentOpen] = useState(false);
  const [selfAssessmentText, setSelfAssessmentText] = useState('');
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: dashboard } = await getPerformanceDashboard();
      setData(dashboard);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : t('error_load');
      setError(message);
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
    const review = data.reviews.find((r) => r.id === reviewId);
    if (review?.status === 'pending_self') {
      setActiveReviewId(review.id);
      setSelfAssessmentOpen(true);
    }
  }, [data]);

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) return;
    const workerId = data?.actingWorkerId;
    if (!workerId) {
      setError(t('error_no_worker_profile'));
      return;
    }
    setSubmitting(true);
    try {
      await createGoal({
        workerId,
        title: newGoalTitle.trim(),
        description: newGoalDescription.trim() || undefined,
        dueDate: newGoalDueDate || undefined,
        weightPercent: newGoalWeight ?? undefined,
      });
      setGoalDialogOpen(false);
      setNewGoalTitle('');
      setNewGoalDescription('');
      setNewGoalDueDate('');
      setNewGoalWeight(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const openCheckIn = (goalId: string, progressPercent: number, progressStatus: string) => {
    setCheckInGoalId(goalId);
    setCheckInPercent(progressPercent);
    setCheckInStatus(
      progressStatus === 'at_risk' || progressStatus === 'off_track'
        ? progressStatus
        : 'on_track',
    );
    setCheckInNotes('');
  };

  const handleCheckIn = async () => {
    if (!checkInGoalId) return;
    setSubmitting(true);
    try {
      await addGoalCheckIn(checkInGoalId, {
        progressPercent: checkInPercent,
        progressStatus: checkInStatus,
        notes: checkInNotes.trim() || undefined,
      });
      setCheckInGoalId(null);
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
      setFeedbackDialogOpen(false);
      setFeedbackMessage('');
      setFeedbackRecipient(null);
      setFeedbackType('praise');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecognition = async () => {
    if (!recognitionRecipient || !recognitionMessage.trim()) return;
    setSubmitting(true);
    try {
      await createRecognition({
        recipientWorkerId: recognitionRecipient.id,
        message: recognitionMessage.trim(),
        valueTag: recognitionTag.trim() || undefined,
      });
      setRecognitionDialogOpen(false);
      setRecognitionMessage('');
      setRecognitionRecipient(null);
      setRecognitionTag('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelfAssessment = async () => {
    if (!activeReviewId || !selfAssessmentText.trim()) return;
    setSubmitting(true);
    try {
      await submitSelfAssessment(activeReviewId, {
        selfAssessment: selfAssessmentText.trim(),
      });
      setSelfAssessmentOpen(false);
      setSelfAssessmentText('');
      setActiveReviewId(null);
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
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton height="12rem" />
          <Skeleton height="12rem" />
        </div>
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
    return (
      <EmptyState title={t('empty')} description={t('error_no_worker_profile')} />
    );
  }

  const feedbackTypeOptions = [
    { label: t('feedback_type_praise'), value: 'praise' },
    { label: t('feedback_type_constructive'), value: 'constructive' },
    { label: t('feedback_type_coaching'), value: 'coaching' },
  ];

  const progressStatusOptions = [
    { label: t('status_on_track'), value: 'on_track' },
    { label: t('status_at_risk'), value: 'at_risk' },
    { label: t('status_off_track'), value: 'off_track' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="gap-2" onClick={() => setGoalDialogOpen(true)}>
            <Target className="size-4" aria-hidden />
            {t('add_goal')}
          </Button>
          <Button
            type="button"
            severity="secondary"
            className="gap-2"
            onClick={() => setFeedbackDialogOpen(true)}
          >
            <MessageSquare className="size-4" aria-hidden />
            {t('give_feedback')}
          </Button>
          <Button
            type="button"
            severity="secondary"
            className="gap-2"
            onClick={() => setRecognitionDialogOpen(true)}
          >
            <Award className="size-4" aria-hidden />
            {t('give_recognition')}
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

      {showAdminHints && (
        <Card className="border-blue-100 bg-blue-50/50">
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 size-5 text-blue-600" aria-hidden />
            <div>
              <p className="font-medium text-gray-900">{t('admin_hint_title')}</p>
              <p className="mt-1 text-sm text-gray-600">{t('admin_hint_body')}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Target className="size-4" aria-hidden />
            {t('active_goals')}
          </div>
          <p className="mt-2 text-2xl font-semibold">{data.goals.length}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MessageSquare className="size-4" aria-hidden />
            {t('recent_feedback')}
          </div>
          <p className="mt-2 text-2xl font-semibold">{data.feedback.length}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="size-4" aria-hidden />
            {t('one_on_ones')}
          </div>
          <p className="mt-2 text-2xl font-semibold">{data.oneOnOnes.length}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ClipboardList className="size-4" aria-hidden />
            {t('reviews_awaiting')}
          </div>
          <p className="mt-2 text-2xl font-semibold">{data.reviewsAwaitingMe ?? 0}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t('my_goals')}
          </h2>
          {data.goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title={t('no_goals')}
              actionLabel={t('add_goal')}
              onAction={() => setGoalDialogOpen(true)}
            />
          ) : (
            data.goals.map((goal) => (
              <Card key={goal.id} className="shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{goal.title}</p>
                    {goal.description && (
                      <p className="mt-1 text-sm text-gray-500">{goal.description}</p>
                    )}
                    {goal.dueDate && (
                      <p className="mt-1 text-xs text-gray-400">
                        {t('due_date_label', { date: goal.dueDate })}
                      </p>
                    )}
                  </div>
                  <Tag
                    value={t(`status_${goal.progressStatus}`)}
                    severity={
                      goal.progressStatus === 'on_track'
                        ? 'success'
                        : goal.progressStatus === 'at_risk'
                          ? 'warning'
                          : 'danger'
                    }
                  />
                </div>
                <ProgressBar value={goal.progressPercent} className="mt-3 h-2" showValue={false} />
                <p className="mt-1 text-xs text-gray-500">{goal.progressPercent}%</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="small"
                    outlined
                    disabled={submitting}
                    onClick={() => openCheckIn(goal.id, goal.progressPercent, goal.progressStatus)}
                  >
                    {t('check_in')}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t('reviews')}
          </h2>
          {data.reviews.length === 0 ? (
            <EmptyState icon={ClipboardList} title={t('no_reviews')} />
          ) : (
            data.reviews.map((review) => (
              <Card key={review.id} className="shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{t('review_cycle')}</p>
                  <Tag value={review.status.replace(/_/g, ' ')} />
                </div>
                <StatusTracker steps={reviewTrackerSteps(review, t)} className="mt-3" />
                {review.status === 'pending_self' && (
                  <Button
                    type="button"
                    size="small"
                    className="mt-3"
                    onClick={() => {
                      setActiveReviewId(review.id);
                      setSelfAssessmentOpen(true);
                    }}
                  >
                    {t('submit_self_assessment')}
                  </Button>
                )}
              </Card>
            ))
          )}

          <h2 className="pt-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t('upcoming_one_on_ones')}
          </h2>
          {data.oneOnOnes.length === 0 ? (
            <EmptyState icon={Calendar} title={t('no_one_on_ones')} />
          ) : (
            data.oneOnOnes.map((meeting) => (
              <Card key={meeting.id} className="shadow-sm">
                <p className="font-medium text-gray-900">
                  {new Date(meeting.scheduledAt).toLocaleString()}
                </p>
                {meeting.agenda && (
                  <p className="mt-1 text-sm text-gray-500">{meeting.agenda}</p>
                )}
                <Tag className="mt-2" value={meeting.status} />
              </Card>
            ))
          )}

          <h2 className="pt-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t('objectives')}
          </h2>
          {data.objectives.length === 0 ? (
            <EmptyState icon={TrendingUp} title={t('no_objectives')} />
          ) : (
            data.objectives.slice(0, 5).map((objective) => (
              <Card key={objective.id} className="shadow-sm">
                <p className="font-medium text-gray-900">{objective.title}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {objective.level}
                  {' · '}
                  {objective.periodStart}
                  {' – '}
                  {objective.periodEnd}
                </p>
              </Card>
            ))
          )}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t('recognition_feed')}
        </h2>
        {data.recognition.length === 0 ? (
          <EmptyState icon={Award} title={t('no_recognition')} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.recognition.map((entry) => (
              <Card key={entry.id} className="shadow-sm">
                <p className="text-sm text-gray-800">{entry.message}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {entry.authorName
                    ? t('recognition_from', { name: entry.authorName })
                    : null}
                  {entry.authorName ? ' · ' : ''}
                  {new Date(entry.createdAt).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t('development_plans')}
        </h2>
        {data.developmentPlans.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t('no_development_plans')} />
        ) : (
          data.developmentPlans.map((plan) => (
            <Card key={plan.id} className="shadow-sm">
              <p className="font-medium text-gray-900">{plan.title}</p>
              {plan.summary && (
                <p className="mt-1 text-sm text-gray-500">{plan.summary}</p>
              )}
              <Tag className="mt-2" value={plan.status} />
            </Card>
          ))
        )}
      </section>

      {(data.reviewsAwaitingMe ?? 0) > 0 && (
        <p className="text-xs text-gray-500">
          {t('pending_reviews_count', { count: data.reviewsAwaitingMe })}
        </p>
      )}

      <Dialog
        header={t('add_goal')}
        visible={goalDialogOpen}
        onHide={() => setGoalDialogOpen(false)}
        modal
        className="w-full max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="goal-title">
              {t('goal_title_label')}
            </label>
            <InputText
              id="goal-title"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder={t('goal_title_placeholder')}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="goal-desc">
              {t('goal_description')}
            </label>
            <InputTextarea
              id="goal-desc"
              value={newGoalDescription}
              onChange={(e) => setNewGoalDescription(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="goal-due">
              {t('goal_due_date')}
            </label>
            <InputText
              id="goal-due"
              type="date"
              value={newGoalDueDate}
              onChange={(e) => setNewGoalDueDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="goal-weight">
              {t('goal_weight')}
            </label>
            <InputNumber
              inputId="goal-weight"
              value={newGoalWeight}
              onValueChange={(e) => setNewGoalWeight(e.value ?? null)}
              min={0}
              max={100}
              className="w-full"
            />
          </div>
          <Button type="button" loading={submitting} onClick={() => void handleCreateGoal()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        header={t('check_in_title')}
        visible={checkInGoalId !== null}
        onHide={() => setCheckInGoalId(null)}
        modal
        className="w-full max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="checkin-pct">
              {t('check_in_progress')}
            </label>
            <InputNumber
              inputId="checkin-pct"
              value={checkInPercent}
              onValueChange={(e) => setCheckInPercent(e.value ?? 0)}
              min={0}
              max={100}
              suffix="%"
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="checkin-status">
              {t('check_in_status')}
            </label>
            <Dropdown
              inputId="checkin-status"
              value={checkInStatus}
              options={progressStatusOptions}
              onChange={(e) => setCheckInStatus(e.value as ProgressStatusOption)}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="checkin-notes">
              {t('check_in_notes')}
            </label>
            <InputTextarea
              id="checkin-notes"
              value={checkInNotes}
              onChange={(e) => setCheckInNotes(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>
          <Button type="button" loading={submitting} onClick={() => void handleCheckIn()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        header={t('give_feedback')}
        visible={feedbackDialogOpen}
        onHide={() => setFeedbackDialogOpen(false)}
        modal
        className="w-full max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {t('recipient_label')}
            </label>
            <WorkerPicker
              value={feedbackRecipient}
              onChange={setFeedbackRecipient}
              placeholder={t('recipient_worker_placeholder')}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="feedback-type">
              {t('feedback_type')}
            </label>
            <Dropdown
              inputId="feedback-type"
              value={feedbackType}
              options={feedbackTypeOptions}
              onChange={(e) => setFeedbackType(e.value as FeedbackTypeOption)}
              className="w-full"
            />
          </div>
          <InputTextarea
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
            placeholder={t('feedback_placeholder')}
            rows={4}
            className="w-full"
          />
          <Button type="button" loading={submitting} onClick={() => void handleFeedback()}>
            {t('send')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        header={t('give_recognition')}
        visible={recognitionDialogOpen}
        onHide={() => setRecognitionDialogOpen(false)}
        modal
        className="w-full max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {t('recipient_label')}
            </label>
            <WorkerPicker
              value={recognitionRecipient}
              onChange={setRecognitionRecipient}
              placeholder={t('recipient_worker_placeholder')}
            />
          </div>
          <InputTextarea
            value={recognitionMessage}
            onChange={(e) => setRecognitionMessage(e.target.value)}
            placeholder={t('recognition_placeholder')}
            rows={3}
            className="w-full"
          />
          <InputText
            value={recognitionTag}
            onChange={(e) => setRecognitionTag(e.target.value)}
            placeholder={t('recognition_tag_placeholder')}
            className="w-full"
          />
          <Button type="button" loading={submitting} onClick={() => void handleRecognition()}>
            {t('send')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        header={t('submit_self_assessment')}
        visible={selfAssessmentOpen}
        onHide={() => setSelfAssessmentOpen(false)}
        modal
        className="w-full max-w-lg"
      >
        <div className="space-y-4">
          <InputTextarea
            value={selfAssessmentText}
            onChange={(e) => setSelfAssessmentText(e.target.value)}
            placeholder={t('self_assessment_placeholder')}
            rows={6}
            className="w-full"
          />
          <Button type="button" loading={submitting} onClick={() => void handleSelfAssessment()}>
            {t('submit')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
