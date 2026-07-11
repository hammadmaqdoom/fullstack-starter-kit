'use client';

import type { PulseSurvey } from '@/libs/api/talent';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Slider } from 'primereact/slider';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ApiRequestError } from '@/libs/api/client';
import { listPulseSurveys, submitPulseResponse } from '@/libs/api/talent';

export default function PulseSurveyPage() {
  const t = useTranslations('PulseSurvey');
  const [surveys, setSurveys] = useState<PulseSurvey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [activeSurvey, setActiveSurvey] = useState<PulseSurvey | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [completedSurveyIds, setCompletedSurveyIds] = useState<Set<string>>(() => new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await listPulseSurveys();
      setSurveys(data.filter(s => s.status === 'active'));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openSurvey = (survey: PulseSurvey) => {
    setSubmitError(null);
    setActiveSurvey(survey);
    const defaults: Record<string, number> = {};
    for (const question of survey.questions) {
      defaults[question.id] = Math.round((question.scaleMin + question.scaleMax) / 2);
    }
    setAnswers(defaults);
  };

  const handleSubmit = async () => {
    if (!activeSurvey) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitPulseResponse(activeSurvey.id, answers);
      setCompletedSurveyIds(prev => new Set(prev).add(activeSurvey.id));
      setActiveSurvey(null);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setCompletedSurveyIds(prev => new Set(prev).add(activeSurvey.id));
        setActiveSurvey(null);
      } else {
        setSubmitError(err instanceof ApiRequestError ? err.message : t('error_submit'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="list" rows={3} />;
  }

  if (activeSurvey) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
          onClick={() => setActiveSurvey(null)}
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {t('back_to_surveys')}
        </button>

        <div>
          <h1 className="text-xl font-semibold text-gray-900">{activeSurvey.title}</h1>
          {activeSurvey.description && <p className="mt-1 text-sm text-gray-500">{activeSurvey.description}</p>}
        </div>

        {submitError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {submitError}
          </div>
        )}

        <div className="space-y-6">
          {activeSurvey.questions.map(question => (
            <div key={question.id} className="rounded-xl border border-gray-200 p-4">
              <p className="mb-4 text-sm font-medium text-gray-900">{question.text}</p>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400">{question.scaleMin}</span>
                <Slider
                  value={answers[question.id] ?? question.scaleMin}
                  onChange={e => setAnswers(prev => ({ ...prev, [question.id]: e.value as number }))}
                  min={question.scaleMin}
                  max={question.scaleMax}
                  className="flex-1"
                />
                <span className="text-xs text-gray-400">{question.scaleMax}</span>
                <span className="w-8 text-right text-sm font-semibold text-gray-900">{answers[question.id]}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400">{t('anonymity_note')}</p>

        <Button type="button" className="w-full" loading={submitting} onClick={() => void handleSubmit()}>
          {t('submit')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {error && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!error && surveys.length === 0 && (
        <EmptyState icon={ClipboardList} title={t('empty_title')} description={t('empty_description')} />
      )}

      <div className="space-y-3">
        {surveys.map(survey => (
          <div key={survey.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <div>
              <p className="font-medium text-gray-900">{survey.title}</p>
              {survey.description && <p className="mt-0.5 text-sm text-gray-500">{survey.description}</p>}
              <p className="mt-1 text-xs text-gray-400">
                {t('question_count', { count: survey.questions.length })}
                {survey.closesAt && ` · ${t('closes_on', { date: survey.closesAt })}`}
              </p>
            </div>
            {completedSurveyIds.has(survey.id)
              ? (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                    <CheckCircle2 className="size-4" aria-hidden />
                    {t('completed')}
                  </span>
                )
              : (
                  <Button type="button" size="small" onClick={() => openSurvey(survey)}>
                    {t('respond')}
                  </Button>
                )}
          </div>
        ))}
      </div>
    </div>
  );
}
