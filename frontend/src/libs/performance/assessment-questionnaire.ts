export type AssessmentQuestionType =
  | 'short_text'
  | 'long_text'
  | 'rating'
  | 'yes_no'
  | 'single_choice'
  | 'multi_choice';

export type AssessmentQuestionOption = { id: string; label: string };

export type AssessmentQuestion = {
  id: string;
  type: AssessmentQuestionType;
  label: string;
  required: boolean;
  helpText?: string;
  scaleMin?: number;
  scaleMax?: number;
  options?: AssessmentQuestionOption[];
};

export type AssessmentAnswerValue = string | number | boolean | string[];
export type AssessmentAnswers = Record<string, AssessmentAnswerValue>;

export type AssessmentPayload = {
  questionsSnapshot: AssessmentQuestion[];
  answers: AssessmentAnswers;
};

export function isTemplateEmpty(questions: AssessmentQuestion[]): boolean {
  return questions.length === 0;
}

export function hasRequiredGaps(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswers,
): boolean {
  return questions.some((q) => {
    if (!q.required) return false;
    const v = answers[q.id];
    if (v === undefined || v === null) return true;
    if (typeof v === 'string') return v.trim().length === 0;
    if (Array.isArray(v)) return v.length === 0;
    return false;
  });
}

export function formatAnswerDisplay(
  question: AssessmentQuestion,
  value: AssessmentAnswerValue | undefined,
): string {
  if (value === undefined || value === null) return '';
  if (question.type === 'yes_no') return value === true ? 'Yes' : 'No';
  if (question.type === 'single_choice' && typeof value === 'string') {
    return question.options?.find((o) => o.id === value)?.label ?? value;
  }
  if (question.type === 'multi_choice' && Array.isArray(value)) {
    return value
      .map((id) => question.options?.find((o) => o.id === id)?.label ?? id)
      .join(', ');
  }
  return String(value);
}
