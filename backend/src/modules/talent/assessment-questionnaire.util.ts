import { BadRequestException } from '@nestjs/common';

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

const TYPES: AssessmentQuestionType[] = [
  'short_text',
  'long_text',
  'rating',
  'yes_no',
  'single_choice',
  'multi_choice',
];

function isBlank(v: AssessmentAnswerValue | undefined): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function assertValidTemplate(questions: AssessmentQuestion[]): void {
  for (const q of questions) {
    if (!q.id || !q.label?.trim() || !TYPES.includes(q.type)) {
      throw new BadRequestException({
        code: 'ASSESSMENT_TEMPLATE_INVALID',
        message: 'Invalid assessment question',
        questionId: q?.id,
      });
    }
    if (q.type === 'rating') {
      if (
        typeof q.scaleMin !== 'number' ||
        typeof q.scaleMax !== 'number' ||
        q.scaleMin >= q.scaleMax
      ) {
        throw new BadRequestException({
          code: 'ASSESSMENT_TEMPLATE_INVALID',
          message: 'Rating questions need scaleMin < scaleMax',
          questionId: q.id,
        });
      }
    }
    if (q.type === 'single_choice' || q.type === 'multi_choice') {
      if (!q.options || q.options.length < 1) {
        throw new BadRequestException({
          code: 'ASSESSMENT_TEMPLATE_INVALID',
          message: 'Choice questions need options',
          questionId: q.id,
        });
      }
    }
  }
}

export function assertValidAnswers(
  template: AssessmentQuestion[],
  answers: AssessmentAnswers,
): void {
  if (template.length === 0) {
    throw new BadRequestException({
      code: 'ASSESSMENT_TEMPLATE_EMPTY',
      message:
        'Assessment questionnaire is empty. People Ops must add questions before submit.',
    });
  }

  const known = new Set(template.map((q) => q.id));
  for (const key of Object.keys(answers)) {
    if (!known.has(key)) {
      throw new BadRequestException({
        code: 'ASSESSMENT_ANSWER_UNKNOWN',
        message: `Unknown questionId: ${key}`,
        questionId: key,
      });
    }
  }

  for (const q of template) {
    const value = answers[q.id];
    if (q.required && isBlank(value)) {
      throw new BadRequestException({
        code: 'ASSESSMENT_ANSWER_REQUIRED',
        message: `Required: ${q.label}`,
        questionId: q.id,
      });
    }
    if (isBlank(value)) continue;

    switch (q.type) {
      case 'short_text':
      case 'long_text':
        if (typeof value !== 'string') {
          throw new BadRequestException({
            code: 'ASSESSMENT_ANSWER_TYPE',
            message: 'Expected string',
            questionId: q.id,
          });
        }
        break;
      case 'rating': {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new BadRequestException({
            code: 'ASSESSMENT_ANSWER_TYPE',
            message: 'Expected number',
            questionId: q.id,
          });
        }
        const min = q.scaleMin ?? 1;
        const max = q.scaleMax ?? 5;
        if (value < min || value > max) {
          throw new BadRequestException({
            code: 'ASSESSMENT_ANSWER_RANGE',
            message: `Rating must be ${min}–${max}`,
            questionId: q.id,
          });
        }
        break;
      }
      case 'yes_no':
        if (typeof value !== 'boolean') {
          throw new BadRequestException({
            code: 'ASSESSMENT_ANSWER_TYPE',
            message: 'Expected boolean',
            questionId: q.id,
          });
        }
        break;
      case 'single_choice': {
        if (typeof value !== 'string') {
          throw new BadRequestException({
            code: 'ASSESSMENT_ANSWER_TYPE',
            message: 'Expected option id',
            questionId: q.id,
          });
        }
        if (!q.options?.some((o) => o.id === value)) {
          throw new BadRequestException({
            code: 'ASSESSMENT_ANSWER_OPTION',
            message: 'Invalid option',
            questionId: q.id,
          });
        }
        break;
      }
      case 'multi_choice': {
        if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
          throw new BadRequestException({
            code: 'ASSESSMENT_ANSWER_TYPE',
            message: 'Expected string[]',
            questionId: q.id,
          });
        }
        const allowed = new Set((q.options ?? []).map((o) => o.id));
        for (const id of value) {
          if (!allowed.has(id)) {
            throw new BadRequestException({
              code: 'ASSESSMENT_ANSWER_OPTION',
              message: 'Invalid option',
              questionId: q.id,
            });
          }
        }
        break;
      }
    }
  }
}

export function buildAssessmentPayload(
  template: AssessmentQuestion[],
  answers: AssessmentAnswers,
): AssessmentPayload {
  assertValidAnswers(template, answers);
  return {
    questionsSnapshot: structuredClone(template),
    answers: { ...answers },
  };
}

export function summarizeAssessment(payload: AssessmentPayload): string {
  const lines: string[] = [];
  for (const q of payload.questionsSnapshot) {
    const raw = payload.answers[q.id];
    if (isBlank(raw)) continue;
    let display: string;
    if (q.type === 'yes_no') {
      display = raw === true ? 'Yes' : 'No';
    } else if (q.type === 'single_choice') {
      display = q.options?.find((o) => o.id === raw)?.label ?? String(raw);
    } else if (q.type === 'multi_choice' && Array.isArray(raw)) {
      display = raw
        .map((id) => q.options?.find((o) => o.id === id)?.label ?? id)
        .join(', ');
    } else {
      display = String(raw);
    }
    lines.push(`${q.label}: ${display}`);
  }
  return lines.join('\n');
}
