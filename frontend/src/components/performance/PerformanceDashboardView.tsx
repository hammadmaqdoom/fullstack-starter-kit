'use client';

import type { PerformanceDashboard } from '@/libs/api/talent';
import {
  addGoalCheckIn,
  createFeedback,
  createGoal,
  getPerformanceDashboard,
  submitSelfAssessment,
} from '@/libs/api/talent';
import { ApiRequestError } from '@/libs/api/client';
import {
  Award,
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
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressBar } from 'primereact/progressbar';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';

type PerformanceDashboardViewProps = {
  showAdminHints?: boolean;
};

export function PerformanceDashboardView({
  showAdminHints = false,
}: PerformanceDashboardViewProps) {
  const t = useTranslations('Performance');
  const [data, setData] = useState<PerformanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackRecipientId, setFeedbackRecipientId] = useState('');
  const [selfAssessmentOpen, setSelfAssessmentOpen] = useState(false);
  const [selfAssessmentText, setSelfAssessmentText] = useState('');
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) return;
    const workerId = data?.actingWorkerId;
    if (!workerId) {
      setError(t('error_no_worker_profile'));
      return;
    }
    setSubmitting(true);
    try {
      await createGoal({ workerId, title: newGoalTitle.trim() });
      setGoalDialogOpen(false);
      setNewGoalTitle('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async (goalId: string, progressPercent: number) => {
    setSubmitting(true);
    try {
      await addGoalCheckIn(goalId, {
        progressPercent,
        progressStatus: progressPercent >= 70 ? 'on_track' : progressPercent >= 40 ? 'at_risk' : 'off_track',
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedback = async () => {
    if (!feedbackRecipientId.trim() || !feedbackMessage.trim()) return;
    setSubmitting(true);
    try {
      await createFeedback({
        recipientWorkerId: feedbackRecipientId.trim(),
        feedbackType: 'praise',
        message: feedbackMessage.trim(),
      });
      setFeedbackDialogOpen(false);
      setFeedbackMessage('');
      setFeedbackRecipientId('');
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
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        {t('empty')}
      </div>
    );
  }

  const pendingReviews = data.reviews.filter((r) => r.status === 'pending_self');

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
            <Award className="size-4" aria-hidden />
            {t('recognition')}
          </div>
          <p className="mt-2 text-2xl font-semibold">{data.recognition.length}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t('my_goals')}
          </h2>
          {data.goals.length === 0 ? (
            <p className="text-sm text-gray-500">{t('no_goals')}</p>
          ) : (
            data.goals.map((goal) => (
              <Card key={goal.id} className="shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{goal.title}</p>
                    {goal.description && (
                      <p className="mt-1 text-sm text-gray-500">{goal.description}</p>
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
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="small"
                    outlined
                    disabled={submitting}
                    onClick={() => void handleCheckIn(goal.id, Math.min(goal.progressPercent + 10, 100))}
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
            <p className="text-sm text-gray-500">{t('no_reviews')}</p>
          ) : (
            data.reviews.map((review) => (
              <Card key={review.id} className="shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{t('review_cycle')}</p>
                  <Tag value={review.status.replace(/_/g, ' ')} />
                </div>
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
            {t('objectives')}
          </h2>
          {data.objectives.length === 0 ? (
            <p className="text-sm text-gray-500">{t('no_objectives')}</p>
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
          <p className="text-sm text-gray-500">{t('no_recognition')}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.recognition.map((entry) => (
              <Card key={entry.id} className="shadow-sm">
                <p className="text-sm text-gray-800">{entry.message}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {pendingReviews.length > 0 && (
        <p className="text-xs text-gray-500">{t('pending_reviews_count', { count: pendingReviews.length })}</p>
      )}

      <Dialog header={t('add_goal')} visible={goalDialogOpen} onHide={() => setGoalDialogOpen(false)} modal className="w-full max-w-md">
        <div className="space-y-4">
          <InputText
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            placeholder={t('goal_title_placeholder')}
            className="w-full"
          />
          <Button type="button" loading={submitting} onClick={() => void handleCreateGoal()}>
            {t('save')}
          </Button>
        </div>
      </Dialog>

      <Dialog header={t('give_feedback')} visible={feedbackDialogOpen} onHide={() => setFeedbackDialogOpen(false)} modal className="w-full max-w-md">
        <div className="space-y-4">
          <InputText
            value={feedbackRecipientId}
            onChange={(e) => setFeedbackRecipientId(e.target.value)}
            placeholder={t('recipient_worker_placeholder')}
            className="w-full"
          />
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
