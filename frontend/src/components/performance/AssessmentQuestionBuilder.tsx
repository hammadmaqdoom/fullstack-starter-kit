'use client';

import type { AssessmentQuestion, AssessmentQuestionType } from '@/libs/api/talent';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';

type Props = {
  title: string;
  value: AssessmentQuestion[];
  onChange: (next: AssessmentQuestion[]) => void;
};

function newId(): string {
  return crypto.randomUUID();
}

export function AssessmentQuestionBuilder({ title, value, onChange }: Props) {
  const t = useTranslations('Performance');

  const typeOptions: { label: string; value: AssessmentQuestionType }[] = [
    { label: t('type_short_text'), value: 'short_text' },
    { label: t('type_long_text'), value: 'long_text' },
    { label: t('type_rating'), value: 'rating' },
    { label: t('type_yes_no'), value: 'yes_no' },
    { label: t('type_single_choice'), value: 'single_choice' },
    { label: t('type_multi_choice'), value: 'multi_choice' },
  ];

  const updateAt = (index: number, patch: Partial<AssessmentQuestion>) => {
    onChange(value.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const addQuestion = () => {
    onChange([
      ...value,
      {
        id: newId(),
        type: 'long_text',
        label: '',
        required: true,
      },
    ]);
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const move = (index: number, delta: number) => {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const item = next[index];
    if (!item) return;
    next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  const setType = (index: number, type: AssessmentQuestionType) => {
    const q = value[index];
    if (!q) return;
    const patch: Partial<AssessmentQuestion> = { type };
    if (type === 'rating') {
      patch.scaleMin = q.scaleMin ?? 1;
      patch.scaleMax = q.scaleMax ?? 5;
      patch.options = undefined;
    } else if (type === 'single_choice' || type === 'multi_choice') {
      patch.options =
        q.options && q.options.length > 0
          ? q.options
          : [
              { id: newId(), label: 'Option 1' },
              { id: newId(), label: 'Option 2' },
            ];
      patch.scaleMin = undefined;
      patch.scaleMax = undefined;
    } else {
      patch.options = undefined;
      patch.scaleMin = undefined;
      patch.scaleMax = undefined;
    }
    updateAt(index, patch);
  };

  return (
    <div className="space-y-3 rounded-md border border-gray-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <Button type="button" size="small" outlined className="gap-1" onClick={addQuestion}>
          <Plus className="size-3.5" aria-hidden />
          {t('add_question')}
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-amber-700">{t('template_empty_warning')}</p>
      )}

      {value.map((q, index) => (
        <div key={q.id} className="space-y-2 rounded-md bg-gray-50 p-3">
          <div className="flex flex-wrap items-start gap-2">
            <Dropdown
              value={q.type}
              options={typeOptions}
              onChange={(e) => setType(index, e.value as AssessmentQuestionType)}
              className="w-40"
            />
            <InputText
              value={q.label}
              onChange={(e) => updateAt(index, { label: e.target.value })}
              placeholder={t('question_label')}
              className="min-w-[12rem] flex-1"
            />
            <div className="flex items-center gap-1">
              <Checkbox
                inputId={`req-${q.id}`}
                checked={q.required}
                onChange={(e) => updateAt(index, { required: Boolean(e.checked) })}
              />
              <label htmlFor={`req-${q.id}`} className="text-xs text-gray-600">
                {t('question_required')}
              </label>
            </div>
            <Button
              type="button"
              size="small"
              text
              aria-label="Move up"
              onClick={() => move(index, -1)}
            >
              <ChevronUp className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              size="small"
              text
              aria-label="Move down"
              onClick={() => move(index, 1)}
            >
              <ChevronDown className="size-4" aria-hidden />
            </Button>
            <Button type="button" size="small" text severity="danger" onClick={() => removeAt(index)}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
          <InputText
            value={q.helpText ?? ''}
            onChange={(e) => updateAt(index, { helpText: e.target.value || undefined })}
            placeholder={t('question_help')}
            className="w-full"
          />
          {q.type === 'rating' && (
            <div className="flex gap-3">
              <InputNumber
                value={q.scaleMin ?? 1}
                onValueChange={(e) => updateAt(index, { scaleMin: e.value ?? 1 })}
                className="w-24"
              />
              <InputNumber
                value={q.scaleMax ?? 5}
                onValueChange={(e) => updateAt(index, { scaleMax: e.value ?? 5 })}
                className="w-24"
              />
            </div>
          )}
          {(q.type === 'single_choice' || q.type === 'multi_choice') && (
            <div className="space-y-2">
              {(q.options ?? []).map((opt, optIndex) => (
                <div key={opt.id} className="flex gap-2">
                  <InputText
                    value={opt.label}
                    onChange={(e) => {
                      const options = [...(q.options ?? [])];
                      options[optIndex] = { ...opt, label: e.target.value };
                      updateAt(index, { options });
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="small"
                    text
                    severity="danger"
                    onClick={() => {
                      updateAt(index, {
                        options: (q.options ?? []).filter((_, i) => i !== optIndex),
                      });
                    }}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="small"
                outlined
                onClick={() =>
                  updateAt(index, {
                    options: [...(q.options ?? []), { id: newId(), label: 'Option' }],
                  })
                }
              >
                {t('add_option')}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
