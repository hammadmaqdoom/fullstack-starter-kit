import { describe, expect, it } from 'vitest';
import {
  hasRequiredGaps,
  isTemplateEmpty,
  type AssessmentQuestion,
} from './assessment-questionnaire';

const q: AssessmentQuestion = {
  id: 'q1',
  type: 'long_text',
  label: 'Wins',
  required: true,
};

describe('assessment-questionnaire', () => {
  it('detects empty template', () => {
    expect(isTemplateEmpty([])).toBe(true);
    expect(isTemplateEmpty([q])).toBe(false);
  });

  it('detects missing required answers', () => {
    expect(hasRequiredGaps([q], {})).toBe(true);
    expect(hasRequiredGaps([q], { q1: 'ok' })).toBe(false);
  });
});
