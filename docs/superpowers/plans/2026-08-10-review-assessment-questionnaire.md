# Review Assessment Questionnaires Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-field self/manager assessment with per-cycle configurable questionnaires (full question types), snapshotting answers on submit.

**Architecture:** JSONB templates on `performance_cycles` (`selfAssessmentTemplate`, `managerAssessmentTemplate`). On submit, validate answers against the live template, store `{ questionsSnapshot, answers }` on the review, and derive plain-text into legacy `selfAssessment` / `managerAssessment` columns. Pure helpers in `assessment-questionnaire.util.ts` own validation and summary text. Frontend adds a People Ops question builder and dynamic assessment forms for employee/manager.

**Tech Stack:** NestJS 10, TypeORM, class-validator, Jest; Next.js 16, PrimeReact, Vitest, next-intl (`en.json` only).

**Spec:** `docs/superpowers/specs/2026-08-10-review-assessment-questionnaire-design.md`

## Global Constraints

- English only — edit `frontend/src/locales/en.json` only; do not edit `ar.json` / `fr.json`
- Lucide icons only; no emoji
- Every mutation writes `audit_log` (existing talent service pattern)
- API envelope `{ data, meta, errors }`; base `/api/v1/talent`
- No free-text fallback when template is empty — reject submit
- Snapshot on submit; later template edits must not mutate stored payloads
- Conventional Commits: `feat(talent): …`, `test(talent): …`, `feat(frontend): …`

---

## File map

### Create

| File | Responsibility |
|---|---|
| `backend/src/modules/talent/assessment-questionnaire.util.ts` | Question/answer types, validate template, validate answers, derive plain-text summary |
| `backend/src/modules/talent/__tests__/assessment-questionnaire.util.spec.ts` | Unit tests for util |
| `backend/src/database/migrations/1783040800000-AddReviewAssessmentQuestionnaires.ts` | Add JSONB columns |
| `frontend/src/libs/performance/assessment-questionnaire.ts` | Shared FE types + client-side answer helpers (mirror backend rules for UX) |
| `frontend/src/libs/performance/assessment-questionnaire.test.ts` | Vitest for FE helpers |
| `frontend/src/components/performance/AssessmentQuestionBuilder.tsx` | People Ops template editor |
| `frontend/src/components/performance/AssessmentQuestionnaireForm.tsx` | Render/submit answers for a `Question[]` |
| `frontend/src/components/performance/AssessmentAnswersReadOnly.tsx` | Display snapshotted Q&A |

### Modify

| File | Change |
|---|---|
| `backend/src/modules/talent/entities/performance-cycle.entity.ts` | Add template columns |
| `backend/src/modules/talent/entities/performance-review.entity.ts` | Add payload columns |
| `backend/src/modules/talent/dto/talent.dto.ts` | Question DTOs; cycle create/update; self/manager submit bodies |
| `backend/src/modules/talent/talent.service.ts` | Persist templates; validate+snapshot on submit |
| `backend/src/database/seeds/1783040700000-demo-performance.seed.ts` | Seed both templates + payload on pending_manager review |
| `frontend/src/libs/api/talent.ts` | Types + API shapes |
| `frontend/src/app/[locale]/(auth)/people-ops/performance/page.tsx` | Builder on create; edit templates via PATCH |
| `frontend/src/components/performance/PerformanceDashboardView.tsx` | Dynamic self-assessment form |
| `frontend/src/components/performance/ManagerPerformanceBoard.tsx` | Read-only employee Q&A + manager form |
| `frontend/src/locales/en.json` | New `Performance` strings |

---

### Task 1: Assessment questionnaire util (TDD)

**Files:**
- Create: `backend/src/modules/talent/assessment-questionnaire.util.ts`
- Test: `backend/src/modules/talent/__tests__/assessment-questionnaire.util.spec.ts`

**Interfaces:**
- Produces:
  - `AssessmentQuestionType`, `AssessmentQuestion`, `AssessmentAnswers`, `AssessmentPayload`
  - `assertValidTemplate(questions: AssessmentQuestion[]): void` — throws `BadRequestException` with code `ASSESSMENT_TEMPLATE_INVALID`
  - `assertValidAnswers(template: AssessmentQuestion[], answers: AssessmentAnswers): void` — empty template → `ASSESSMENT_TEMPLATE_EMPTY`; else field errors
  - `buildAssessmentPayload(template: AssessmentQuestion[], answers: AssessmentAnswers): AssessmentPayload`
  - `summarizeAssessment(payload: AssessmentPayload): string`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/modules/talent/__tests__/assessment-questionnaire.util.spec.ts
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
    expect(() =>
      assertValidAnswers([ratingQ], { q2: 9 }),
    ).toThrow(BadRequestException);
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
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd backend && pnpm exec jest src/modules/talent/__tests__/assessment-questionnaire.util.spec.ts -v`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement util**

```typescript
// backend/src/modules/talent/assessment-questionnaire.util.ts
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
      display =
        q.options?.find((o) => o.id === raw)?.label ?? String(raw);
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
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd backend && pnpm exec jest src/modules/talent/__tests__/assessment-questionnaire.util.spec.ts -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/talent/assessment-questionnaire.util.ts \
  backend/src/modules/talent/__tests__/assessment-questionnaire.util.spec.ts
git commit -m "$(cat <<'EOF'
feat(talent): add assessment questionnaire validation helpers

EOF
)"
```

---

### Task 2: Migration + entities

**Files:**
- Create: `backend/src/database/migrations/1783040800000-AddReviewAssessmentQuestionnaires.ts`
- Modify: `backend/src/modules/talent/entities/performance-cycle.entity.ts`
- Modify: `backend/src/modules/talent/entities/performance-review.entity.ts`

**Interfaces:**
- Consumes: `AssessmentQuestion`, `AssessmentPayload` types from util (entity column types)
- Produces: columns available to TypeORM

- [ ] **Step 1: Write migration**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewAssessmentQuestionnaires1783040800000
  implements MigrationInterface
{
  name = 'AddReviewAssessmentQuestionnaires1783040800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "performance_cycles"
        ADD COLUMN IF NOT EXISTS "selfAssessmentTemplate" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "managerAssessmentTemplate" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "performance_reviews"
        ADD COLUMN IF NOT EXISTS "selfAssessmentPayload" jsonb,
        ADD COLUMN IF NOT EXISTS "managerAssessmentPayload" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "performance_reviews"
        DROP COLUMN IF EXISTS "managerAssessmentPayload",
        DROP COLUMN IF EXISTS "selfAssessmentPayload"
    `);
    await queryRunner.query(`
      ALTER TABLE "performance_cycles"
        DROP COLUMN IF EXISTS "managerAssessmentTemplate",
        DROP COLUMN IF EXISTS "selfAssessmentTemplate"
    `);
  }
}
```

- [ ] **Step 2: Update entities**

On `PerformanceCycleEntity` after `calibrationEnabled`:

```typescript
@Column({ type: 'jsonb', default: [] })
selfAssessmentTemplate: AssessmentQuestion[];

@Column({ type: 'jsonb', default: [] })
managerAssessmentTemplate: AssessmentQuestion[];
```

On `PerformanceReviewEntity` after `managerAssessment`:

```typescript
@Column({ type: 'jsonb', nullable: true })
selfAssessmentPayload: AssessmentPayload | null;

@Column({ type: 'jsonb', nullable: true })
managerAssessmentPayload: AssessmentPayload | null;
```

Import types from `../assessment-questionnaire.util`.

- [ ] **Step 3: Run migration**

Run: `cd backend && pnpm migration:up`  
Expected: migration applied without error

- [ ] **Step 4: Commit**

```bash
git add backend/src/database/migrations/1783040800000-AddReviewAssessmentQuestionnaires.ts \
  backend/src/modules/talent/entities/performance-cycle.entity.ts \
  backend/src/modules/talent/entities/performance-review.entity.ts
git commit -m "$(cat <<'EOF'
feat(talent): add assessment questionnaire JSONB columns

EOF
)"
```

---

### Task 3: DTOs

**Files:**
- Modify: `backend/src/modules/talent/dto/talent.dto.ts`

**Interfaces:**
- Produces: `AssessmentQuestionDto`, extended cycle DTOs, `SubmitSelfAssessmentDto.answers`, `SubmitManagerReviewDto.answers`

- [ ] **Step 1: Add nested question DTO + wire into cycle/submit DTOs**

Add near cycle DTOs:

```typescript
export class AssessmentQuestionOptionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  label: string;
}

export class AssessmentQuestionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({
    enum: [
      'short_text',
      'long_text',
      'rating',
      'yes_no',
      'single_choice',
      'multi_choice',
    ],
  })
  @IsIn([
    'short_text',
    'long_text',
    'rating',
    'yes_no',
    'single_choice',
    'multi_choice',
  ])
  type:
    | 'short_text'
    | 'long_text'
    | 'rating'
    | 'yes_no'
    | 'single_choice'
    | 'multi_choice';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty()
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  helpText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  scaleMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  scaleMax?: number;

  @ApiPropertyOptional({ type: [AssessmentQuestionOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionOptionDto)
  options?: AssessmentQuestionOptionDto[];
}
```

On `CreatePerformanceCycleDto` and `UpdatePerformanceCycleDto`:

```typescript
@ApiPropertyOptional({ type: [AssessmentQuestionDto] })
@IsOptional()
@IsArray()
@ValidateNested({ each: true })
@Type(() => AssessmentQuestionDto)
selfAssessmentTemplate?: AssessmentQuestionDto[];

@ApiPropertyOptional({ type: [AssessmentQuestionDto] })
@IsOptional()
@IsArray()
@ValidateNested({ each: true })
@Type(() => AssessmentQuestionDto)
managerAssessmentTemplate?: AssessmentQuestionDto[];
```

Replace `SubmitSelfAssessmentDto` body field:

```typescript
export class SubmitSelfAssessmentDto {
  @ApiProperty({
    description: 'Answers keyed by questionId',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  answers: Record<string, string | number | boolean | string[]>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  competencyRatings?: Record<string, number>;
}
```

On `SubmitManagerReviewDto`, replace `managerAssessment: string` with the same `answers` object (keep `outcome`, `probationOutcome`, `competencyRatings`).

Ensure imports: `IsIn`, `IsArray`, `ValidateNested`, `Type`, `IsNumber`, `IsBoolean`.

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/talent/dto/talent.dto.ts
git commit -m "$(cat <<'EOF'
feat(talent): DTOs for assessment questionnaire templates and answers

EOF
)"
```

---

### Task 4: Service — cycle templates + submit snapshot

**Files:**
- Modify: `backend/src/modules/talent/talent.service.ts` (`createCycle`, `updateCycle`, `submitSelfAssessment`, `submitManagerReview`)
- Test: extend or add `backend/src/modules/talent/__tests__/talent-assessment-questionnaire.spec.ts` (prefer focused service unit with mocked repos; if existing review specs are heavy, add util-backed integration assertions in a thin service test)

**Interfaces:**
- Consumes: util functions from Task 1; DTOs from Task 3
- Produces: cycles with templates; reviews with payloads + text summaries

- [ ] **Step 1: Write failing service tests for empty template + snapshot**

Minimal pattern (mock `cycleRepository` / `reviewRepository` like other talent specs):

```typescript
it('rejects self-assessment when cycle template empty', async () => {
  // review pending_self for acting worker; cycle.selfAssessmentTemplate = []
  await expect(
    service.submitSelfAssessment(reviewId, { answers: { q1: 'x' } }, actor),
  ).rejects.toMatchObject({ response: { code: 'ASSESSMENT_TEMPLATE_EMPTY' } });
});

it('stores payload snapshot and plain-text summary', async () => {
  // template with long_text q1; submit answers; expect saved.selfAssessmentPayload.questionsSnapshot
  // and saved.selfAssessment containing label text; status PENDING_MANAGER
});

it('does not mutate stored payload when cycle template later changes', async () => {
  // after submit, change cycle template; re-load review — payload.questionsSnapshot still old
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd backend && pnpm exec jest src/modules/talent/__tests__/talent-assessment-questionnaire.spec.ts -v`  
Expected: FAIL / missing behaviors

- [ ] **Step 3: Implement service changes**

`createCycle` — when saving:

```typescript
selfAssessmentTemplate: dto.selfAssessmentTemplate ?? [],
managerAssessmentTemplate: dto.managerAssessmentTemplate ?? [],
```

Before save, if templates provided: `assertValidTemplate(...)`.

`updateCycle` — if `dto.selfAssessmentTemplate` / `managerAssessmentTemplate` present, `assertValidTemplate` then assign (existing `Object.assign` already covers if DTO includes them).

`submitSelfAssessment`:

```typescript
const cycle = await this.cycleRepository.findOne({
  where: { id: review.cycleId, tenantId },
});
if (!cycle) {
  throw new NotFoundException({ code: 'CYCLE_NOT_FOUND', message: 'Cycle not found' });
}
const template = cycle.selfAssessmentTemplate ?? [];
const payload = buildAssessmentPayload(template, dto.answers);
review.selfAssessmentPayload = payload;
review.selfAssessment = summarizeAssessment(payload);
// competencyRatings, selfSubmittedAt, status PENDING_MANAGER unchanged
```

`submitManagerReview` — load cycle (already has `relations: ['cycle']`):

```typescript
const template = review.cycle?.managerAssessmentTemplate ?? [];
const payload = buildAssessmentPayload(template, dto.answers);
review.managerAssessmentPayload = payload;
review.managerAssessment = summarizeAssessment(payload);
// outcome / status transitions unchanged
```

Ensure `getReview` continues returning `cycle` relation so FE can read templates.

- [ ] **Step 4: Run tests — PASS**

Run: `cd backend && pnpm exec jest src/modules/talent/__tests__/talent-assessment-questionnaire.spec.ts src/modules/talent/__tests__/assessment-questionnaire.util.spec.ts -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/talent/talent.service.ts \
  backend/src/modules/talent/__tests__/talent-assessment-questionnaire.spec.ts
git commit -m "$(cat <<'EOF'
feat(talent): snapshot assessment questionnaires on review submit

EOF
)"
```

---

### Task 5: Frontend types + API client

**Files:**
- Create: `frontend/src/libs/performance/assessment-questionnaire.ts`
- Create: `frontend/src/libs/performance/assessment-questionnaire.test.ts`
- Modify: `frontend/src/libs/api/talent.ts`

**Interfaces:**
- Produces FE types matching backend; `submitSelfAssessment(id, { answers })`; `updateCycle(id, { …templates })`; `getReview` helper if missing

- [ ] **Step 1: Write Vitest for `isTemplateEmpty` / `hasRequiredGaps`**

```typescript
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
```

- [ ] **Step 2: Implement FE helpers + update `talent.ts`**

```typescript
// assessment-questionnaire.ts — mirror types; export isTemplateEmpty / hasRequiredGaps
```

In `talent.ts`:

```typescript
export type AssessmentQuestion = { /* same shape */ };
export type AssessmentPayload = {
  questionsSnapshot: AssessmentQuestion[];
  answers: Record<string, string | number | boolean | string[]>;
};

export type PerformanceCycle = {
  // existing fields…
  selfAssessmentTemplate?: AssessmentQuestion[];
  managerAssessmentTemplate?: AssessmentQuestion[];
};

export type PerformanceReview = {
  // existing…
  selfAssessmentPayload?: AssessmentPayload | null;
  managerAssessmentPayload?: AssessmentPayload | null;
  cycle?: PerformanceCycle | null;
};
```

```typescript
export async function updateCycle(
  id: string,
  input: {
    status?: string;
    name?: string;
    peerFeedbackEnabled?: boolean;
    selfAssessmentTemplate?: AssessmentQuestion[];
    managerAssessmentTemplate?: AssessmentQuestion[];
  },
) {
  return apiRequest<PerformanceCycle>(`${BASE}/performance-cycles/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function getReview(id: string) {
  return apiRequest<PerformanceReview>(`${BASE}/reviews/${id}`);
}

export async function submitSelfAssessment(
  reviewId: string,
  input: { answers: Record<string, string | number | boolean | string[]> },
) {
  return apiRequest(`${BASE}/reviews/${reviewId}/self-assessment`, {
    method: 'POST',
    body: input,
  });
}

export async function submitManagerReview(
  reviewId: string,
  input: {
    answers: Record<string, string | number | boolean | string[]>;
    outcome: string;
    probationOutcome?: string;
  },
) {
  return apiRequest(`${BASE}/reviews/${reviewId}/manager-review`, {
    method: 'POST',
    body: input,
  });
}
```

Extend `createCycle` input with optional templates.

Confirm `GET reviews/:id` exists on controller; if not, add thin controller method calling `getReview`.

- [ ] **Step 3: Run Vitest**

Run: `cd frontend && pnpm exec vitest run src/libs/performance/assessment-questionnaire.test.ts`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/libs/performance/assessment-questionnaire.ts \
  frontend/src/libs/performance/assessment-questionnaire.test.ts \
  frontend/src/libs/api/talent.ts
git commit -m "$(cat <<'EOF'
feat(frontend): assessment questionnaire types and API client

EOF
)"
```

---

### Task 6: People Ops question builder + cycle UI

**Files:**
- Create: `frontend/src/components/performance/AssessmentQuestionBuilder.tsx`
- Modify: `frontend/src/app/[locale]/(auth)/people-ops/performance/page.tsx`
- Modify: `frontend/src/locales/en.json` (`Performance` keys)

**Interfaces:**
- Consumes: `AssessmentQuestion` from API types
- Produces: builder that edits two arrays; create/update cycle with templates

- [ ] **Step 1: Add i18n keys** (English only)

Under `Performance`:

```json
"self_template_title": "Self-assessment questions",
"manager_template_title": "Manager assessment questions",
"template_empty_warning": "Add at least one question or employees cannot submit.",
"add_question": "Add question",
"question_label": "Question",
"question_type": "Type",
"question_required": "Required",
"question_help": "Help text",
"edit_templates": "Edit questionnaires",
"type_short_text": "Short text",
"type_long_text": "Long text",
"type_rating": "Rating",
"type_yes_no": "Yes / No",
"type_single_choice": "Single choice",
"type_multi_choice": "Multi choice",
"add_option": "Add option",
"assessment_template_empty": "Questionnaire not configured. Contact People Ops.",
"assessment_answers_title": "Responses"
```

- [ ] **Step 2: Implement `AssessmentQuestionBuilder`**

Props: `value: AssessmentQuestion[]`, `onChange: (next: AssessmentQuestion[]) => void`, `title: string`.

Behavior:
- List questions; each row: type Dropdown, label InputText, required Checkbox, help InputText
- Rating: scaleMin/scaleMax number inputs (default 1–5)
- Choice types: editable options list (`id` = `crypto.randomUUID()`, label InputText)
- Add / remove / move up-down buttons (Lucide `Plus`, `Trash2`, `ChevronUp`, `ChevronDown`)
- Show empty warning when `value.length === 0`

- [ ] **Step 3: Wire into People Ops performance page**

State:

```typescript
const [selfTemplate, setSelfTemplate] = useState<AssessmentQuestion[]>([]);
const [managerTemplate, setManagerTemplate] = useState<AssessmentQuestion[]>([]);
```

In create dialog, render two builders; pass templates into `createCycle`.

Add “Edit questionnaires” dialog per cycle row: load templates from cycle, `updateCycle(id, { selfAssessmentTemplate, managerAssessmentTemplate })`.

- [ ] **Step 4: Manual smoke** — create cycle with 2 self + 2 manager questions; refresh list; edit; save.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/performance/AssessmentQuestionBuilder.tsx \
  frontend/src/app/[locale]/\(auth\)/people-ops/performance/page.tsx \
  frontend/src/locales/en.json
git commit -m "$(cat <<'EOF'
feat(frontend): People Ops assessment questionnaire builder on cycles

EOF
)"
```

---

### Task 7: Employee + manager assessment forms

**Files:**
- Create: `frontend/src/components/performance/AssessmentQuestionnaireForm.tsx`
- Create: `frontend/src/components/performance/AssessmentAnswersReadOnly.tsx`
- Modify: `frontend/src/components/performance/PerformanceDashboardView.tsx`
- Modify: `frontend/src/components/performance/ManagerPerformanceBoard.tsx`

**Interfaces:**
- Consumes: `getReview`, templates on `cycle`, payloads on review
- Produces: answer maps posted to new API shape

- [ ] **Step 1: Implement form + read-only components**

`AssessmentQuestionnaireForm`:
- Props: `questions`, `value`, `onChange`, `disabled?`
- Render by type: InputText / InputTextarea / InputNumber or rating Dropdown / yes-no Dropdown / RadioButton / MultiSelect (PrimeReact)
- Show `helpText` under label

`AssessmentAnswersReadOnly`:
- Props: `payload: AssessmentPayload | null`
- If null and legacy `text` provided, show plain text; else map snapshot labels → display values (same rules as `summarizeAssessment`)

- [ ] **Step 2: Employee self-assessment dialog**

On open (when `pending_self`):

```typescript
const { data: review } = await getReview(activeReviewId);
setActiveTemplate(review.cycle?.selfAssessmentTemplate ?? []);
setAnswers({});
```

If `isTemplateEmpty(activeTemplate)`: show `t('assessment_template_empty')`, disable submit.

Else render `AssessmentQuestionnaireForm`; submit:

```typescript
await submitSelfAssessment(activeReviewId, { answers });
```

Remove single `InputTextarea` path.

- [ ] **Step 3: Manager board**

When reviewing a `pending_manager` review:
- Fetch `getReview` for cycle templates + `selfAssessmentPayload`
- Show `AssessmentAnswersReadOnly` for employee payload (fallback to `selfAssessment` text)
- Replace manager textarea with `AssessmentQuestionnaireForm` bound to `managerAssessmentTemplate`
- Submit `{ answers, outcome }` via updated `submitManagerReview`
- Empty manager template → disable submit + empty message

- [ ] **Step 4: Smoke** — employee.demo completes questionnaire; manager.demo sees Q&A and submits manager form.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/performance/AssessmentQuestionnaireForm.tsx \
  frontend/src/components/performance/AssessmentAnswersReadOnly.tsx \
  frontend/src/components/performance/PerformanceDashboardView.tsx \
  frontend/src/components/performance/ManagerPerformanceBoard.tsx \
  frontend/src/locales/en.json
git commit -m "$(cat <<'EOF'
feat(frontend): dynamic self and manager assessment questionnaires

EOF
)"
```

---

### Task 8: Demo seed + spec link

**Files:**
- Modify: `backend/src/database/seeds/1783040700000-demo-performance.seed.ts`
- Modify: `docs/superpowers/specs/2026-08-10-review-assessment-questionnaire-design.md` (Status → Implemented when done; link plan)

**Interfaces:**
- Demo cycle must have non-empty self + manager templates so empty-template rule does not block demos

- [ ] **Step 1: Seed templates on `IDS.cycle1`**

```typescript
selfAssessmentTemplate: [
  {
    id: 'self-wins',
    type: 'long_text',
    label: 'What were your key wins this cycle?',
    required: true,
  },
  {
    id: 'self-impact',
    type: 'rating',
    label: 'How would you rate your overall impact?',
    required: true,
    scaleMin: 1,
    scaleMax: 5,
  },
  {
    id: 'self-focus',
    type: 'single_choice',
    label: 'Primary focus area next cycle',
    required: true,
    options: [
      { id: 'delivery', label: 'Delivery excellence' },
      { id: 'craft', label: 'Craft / technical depth' },
      { id: 'leadership', label: 'Leadership / mentoring' },
    ],
  },
],
managerAssessmentTemplate: [
  {
    id: 'mgr-summary',
    type: 'long_text',
    label: 'Manager summary',
    required: true,
  },
  {
    id: 'mgr-recommend',
    type: 'yes_no',
    label: 'Ready for expanded scope?',
    required: true,
  },
],
```

- [ ] **Step 2: For `reviewEmployee2PendingManager`, set `selfAssessmentPayload` matching a snapshot + keep/update plain-text `selfAssessment` via summary style**

- [ ] **Step 3: Re-run seed**

Run: `cd backend && pnpm seed:run` (or project’s demo seed command)  
Expected: cycle templates present; employee pending_self can open form with questions

- [ ] **Step 4: Update design spec status line to point at this plan; mark Implemented when verification done**

- [ ] **Step 5: Commit**

```bash
git add backend/src/database/seeds/1783040700000-demo-performance.seed.ts \
  docs/superpowers/specs/2026-08-10-review-assessment-questionnaire-design.md
git commit -m "$(cat <<'EOF'
chore(talent): seed assessment questionnaires for demo cycle

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| Per-cycle self + manager templates | 2, 3, 4, 6 |
| Full question types | 1, 6, 7 |
| Editable anytime + snapshot on submit | 1, 4 |
| Block empty template | 1, 4, 7 |
| Legacy plain-text summary | 1, 4 |
| People Ops builder | 6 |
| Employee + manager UX | 7 |
| Errors / validation | 1, 4 |
| Tests | 1, 4, 5 |
| Demo seeds | 8 |
| No peer / pulse refactor / analytics | excluded (non-goals) |

Type names consistent: `AssessmentQuestion`, `AssessmentPayload`, `answers` keyed by `questionId`.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-10-review-assessment-questionnaire.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
**2. Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
