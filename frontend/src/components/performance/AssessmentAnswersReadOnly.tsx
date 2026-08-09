'use client';

import type { AssessmentPayload } from '@/libs/api/talent';
import { formatAnswerDisplay } from '@/libs/performance/assessment-questionnaire';
import { useTranslations } from 'next-intl';

type Props = {
  payload?: AssessmentPayload | null;
  fallbackText?: string | null;
};

export function AssessmentAnswersReadOnly({ payload, fallbackText }: Props) {
  const t = useTranslations('Performance');

  if (payload?.questionsSnapshot?.length) {
    return (
      <div className="space-y-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
        <p className="font-medium text-gray-900">{t('assessment_answers_title')}</p>
        {payload.questionsSnapshot.map((q) => {
          const display = formatAnswerDisplay(q, payload.answers[q.id]);
          if (!display) return null;
          return (
            <div key={q.id}>
              <p className="text-xs font-medium text-gray-500">{q.label}</p>
              <p className="mt-0.5 whitespace-pre-wrap">{display}</p>
            </div>
          );
        })}
      </div>
    );
  }

  if (fallbackText) {
    return (
      <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
        <p className="font-medium text-gray-900">{t('assessment_answers_title')}</p>
        <p className="mt-1 whitespace-pre-wrap">{fallbackText}</p>
      </div>
    );
  }

  return null;
}
