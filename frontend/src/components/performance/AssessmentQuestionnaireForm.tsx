'use client';

import type { AssessmentAnswers, AssessmentQuestion } from '@/libs/performance/assessment-questionnaire';
import { useTranslations } from 'next-intl';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';

type Props = {
  questions: AssessmentQuestion[];
  value: AssessmentAnswers;
  onChange: (next: AssessmentAnswers) => void;
  disabled?: boolean;
};

export function AssessmentQuestionnaireForm({
  questions,
  value,
  onChange,
  disabled = false,
}: Props) {
  const t = useTranslations('Performance');

  const setAnswer = (id: string, answer: AssessmentAnswers[string]) => {
    onChange({ ...value, [id]: answer });
  };

  if (questions.length === 0) {
    return (
      <p className="text-sm text-amber-700">{t('assessment_template_empty')}</p>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="space-y-1">
          <label className="block text-sm font-medium text-gray-900" htmlFor={`aq-${q.id}`}>
            {q.label}
            {q.required ? ' *' : ''}
          </label>
          {q.helpText && <p className="text-xs text-gray-500">{q.helpText}</p>}

          {q.type === 'short_text' && (
            <InputText
              id={`aq-${q.id}`}
              value={typeof value[q.id] === 'string' ? (value[q.id] as string) : ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              disabled={disabled}
              className="w-full"
            />
          )}

          {q.type === 'long_text' && (
            <InputTextarea
              id={`aq-${q.id}`}
              value={typeof value[q.id] === 'string' ? (value[q.id] as string) : ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              disabled={disabled}
              rows={4}
              className="w-full"
            />
          )}

          {q.type === 'rating' && (
            <InputNumber
              inputId={`aq-${q.id}`}
              value={typeof value[q.id] === 'number' ? (value[q.id] as number) : null}
              onValueChange={(e) => setAnswer(q.id, e.value ?? (q.scaleMin ?? 1))}
              min={q.scaleMin ?? 1}
              max={q.scaleMax ?? 5}
              disabled={disabled}
              className="w-full"
            />
          )}

          {q.type === 'yes_no' && (
            <Dropdown
              inputId={`aq-${q.id}`}
              value={typeof value[q.id] === 'boolean' ? value[q.id] : null}
              options={[
                { label: 'Yes', value: true },
                { label: 'No', value: false },
              ]}
              onChange={(e) => setAnswer(q.id, e.value as boolean)}
              disabled={disabled}
              className="w-full"
              placeholder="—"
            />
          )}

          {q.type === 'single_choice' && (
            <Dropdown
              inputId={`aq-${q.id}`}
              value={typeof value[q.id] === 'string' ? value[q.id] : null}
              options={(q.options ?? []).map((o) => ({ label: o.label, value: o.id }))}
              onChange={(e) => setAnswer(q.id, e.value as string)}
              disabled={disabled}
              className="w-full"
              placeholder="—"
            />
          )}

          {q.type === 'multi_choice' && (
            <MultiSelect
              inputId={`aq-${q.id}`}
              value={Array.isArray(value[q.id]) ? value[q.id] : []}
              options={(q.options ?? []).map((o) => ({ label: o.label, value: o.id }))}
              onChange={(e) => setAnswer(q.id, (e.value as string[]) ?? [])}
              disabled={disabled}
              className="w-full"
              display="chip"
            />
          )}
        </div>
      ))}
    </div>
  );
}
