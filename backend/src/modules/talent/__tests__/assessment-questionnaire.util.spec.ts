import { BadRequestException } from '@nestjs/common';
import {
  assertValidAnswers,
  assertValidTemplate,
  buildAssessmentPayload,
  summarizeAssessment,
  type AssessmentQuestion,
} from '../assessment-questionnaire.util';

const longTextQ: AssessmentQuestion = {
  id: 'q1',
  type: 'long_text',
  label: 'Wins',
  required: true,
};

const ratingQ: AssessmentQuestion = {
  id: 'q2',
  type: 'rating',
  label: 'Impact',
  required: true,
  scaleMin: 1,
  scaleMax: 5,
};

describe('assertValidTemplate', () => {
  it('accepts empty array', () => {
    expect(() => assertValidTemplate([])).not.toThrow();
  });

  it('rejects choice type without options', () => {
    expect(() =>
      assertValidTemplate([
        {
          id: 'c1',
          type: 'single_choice',
          label: 'Pick',
          required: true,
          options: [],
        },
      ]),
    ).toThrow(BadRequestException);
  });
});

describe('assertValidAnswers', () => {
  it('rejects empty template', () => {
    try {
      assertValidAnswers([], {});
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as BadRequestException).getResponse()).toMatchObject({
        code: 'ASSESSMENT_TEMPLATE_EMPTY',
      });
    }
  });

  it('rejects missing required', () => {
    expect(() => assertValidAnswers([longTextQ], {})).toThrow(
      BadRequestException,
    );
  });

  it('rejects unknown questionId', () => {
    expect(() =>
      assertValidAnswers([longTextQ], { q1: 'ok', x: 'nope' }),
    ).toThrow(BadRequestException);
  });

  it('rejects out-of-range rating', () => {
    expect(() => assertValidAnswers([ratingQ], { q2: 9 })).toThrow(
      BadRequestException,
    );
  });

  it('accepts valid answers', () => {
    expect(() =>
      assertValidAnswers([longTextQ, ratingQ], { q1: 'Shipped Hub', q2: 4 }),
    ).not.toThrow();
  });
});

describe('buildAssessmentPayload + summarizeAssessment', () => {
  it('snapshots questions and builds readable summary', () => {
    const answers = { q1: 'Shipped Hub', q2: 4 };
    const payload = buildAssessmentPayload([longTextQ, ratingQ], answers);
    expect(payload.questionsSnapshot).toEqual([longTextQ, ratingQ]);
    expect(payload.answers).toEqual(answers);
    const text = summarizeAssessment(payload);
    expect(text).toContain('Wins: Shipped Hub');
    expect(text).toContain('Impact: 4');
  });
});
