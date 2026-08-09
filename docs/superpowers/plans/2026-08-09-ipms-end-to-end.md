# IPMS End-to-End Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish Polaris Performance (IPMS) end-to-end across five gated slices: employee dashboard, manager team board, People Ops cycles/OKRs, calibration/pulse, and IDPs/Hub polish — with backend gap-fills, rich demo seeds, and tests.

**Architecture:** Extend existing `talent` Nest module and frontend Performance pages; do not rewrite. Add `GET /performance/team-dashboard` for managers. Enrich dashboard payloads with display names and `reviewsAwaitingMe`. Seed idempotent demo fixtures after `DemoOrgSeed`. Implement UI slice-by-slice with hard acceptance gates.

**Tech Stack:** NestJS 10, TypeORM, Jest; Next.js 16, PrimeReact, next-intl (`en.json` only), Lucide, Vitest; Better Auth session cookies; Hub via `operations/hub.service.ts`.

**Spec:** `docs/superpowers/specs/2026-08-09-ipms-end-to-end-design.md`

## Scope note

This is intentionally one mega-plan (user choice). **Do not start Slice N+1 UI until Slice N acceptance passes.** Seed scaffolding may land early if idempotent and clearly versioned.

## Global Constraints

- API base `/api/v1/`, envelope `{ data, meta, errors }`
- Every mutation writes `audit_log`
- Row scope via `talent-scope.util.ts` / existing talent service helpers
- English only — edit `frontend/src/locales/en.json` only; do not edit `ar.json` / `fr.json`
- Lucide icons only; no emoji
- No country hard-coding (`if country === 'PK'`)
- Conventional Commits: `feat(talent): …`, `feat(frontend): …`, `test(talent): …`, `docs(talent): …`
- Compliance: US-TAL-004, FR-TAL-005, FLW-TAL-004 (calibration)
- Demo password remains `PolarisDemo!2026`; stable worker IDs from `DEMO_PERSONAS`

---

## File map

### Backend create

| File | Responsibility |
|---|---|
| `backend/src/database/seeds/1783040700000-demo-performance.seed.ts` | Idempotent IPMS demo fixtures (extends across slices) |
| `backend/src/modules/talent/performance-dashboard.util.ts` | Pure helpers: `countReviewsAwaitingMe`, display-name map helpers |
| `backend/src/modules/talent/__tests__/performance-dashboard.util.spec.ts` | Unit tests for helpers |
| `backend/src/modules/talent/__tests__/talent-team-dashboard.spec.ts` | Team dashboard scope + shape tests |

### Backend modify

| File | Change |
|---|---|
| `backend/src/modules/talent/talent.service.ts` | Enrich dashboard; add `getTeamPerformanceDashboard`; pulse admin gaps if any |
| `backend/src/modules/talent/talent.controller.ts` | `GET performance/team-dashboard` |
| `backend/src/modules/talent/dto/talent.dto.ts` | Only if new request DTOs needed (prefer reusing existing) |
| `backend/src/modules/talent/__tests__/talent-probation-calibration.spec.ts` | Extend mocks if new repos injected |

### Frontend create

| File | Responsibility |
|---|---|
| `frontend/src/libs/performance/performance-query.ts` | Parse `reviewId` / `developmentActionId` from search params |
| `frontend/src/libs/performance/performance-query.test.ts` | Vitest for query helpers |
| `frontend/src/components/performance/ManagerPerformanceBoard.tsx` | Manager/div-head team board |
| `frontend/src/components/performance/DevelopmentPlanPanel.tsx` | IDP list + actions (Slice 5) |
| `frontend/src/components/performance/OkrAdminWorkspace.tsx` | OKR admin UI |
| `frontend/src/app/[locale]/(auth)/people-ops/performance/okrs/page.tsx` | OKR route |
| `frontend/src/app/[locale]/(auth)/people-ops/performance/pulse/page.tsx` | Pulse admin (if missing) |

### Frontend modify

| File | Change |
|---|---|
| `frontend/src/components/performance/PerformanceDashboardView.tsx` | Full employee UX |
| `frontend/src/app/[locale]/(auth)/manager/performance/page.tsx` | Mount `ManagerPerformanceBoard` |
| `frontend/src/app/[locale]/(auth)/people-ops/performance/page.tsx` | Cycle form polish + error UX |
| `frontend/src/app/[locale]/(auth)/people-ops/performance/calibration/page.tsx` | Polish + seed-driven UX |
| `frontend/src/app/[locale]/(auth)/employee/performance/pulse/page.tsx` | Keep; fix gaps vs anonymity messaging |
| `frontend/src/libs/api/talent.ts` | Types + `getTeamPerformanceDashboard`, `submitManagerReview`, `createOneOnOne`, `updateOneOnOne`, IDP mutations, pulse admin, `calibrationEnabled` on createCycle |
| `frontend/src/locales/en.json` | Performance / OkrAdmin / ManagerPerformance / DevelopmentPlan keys |
| `docs/superpowers/specs/2026-08-08-demo-accounts.md` | Performance smoke (Slice 5) |

### Stable demo IDs (from `DEMO_PERSONAS`)

| Key | workerId |
|---|---|
| manager | `a2000000-0000-4000-8000-000000000007` |
| employee | `a2000000-0000-4000-8000-000000000008` |
| employee2 | `a2000000-0000-4000-8000-000000000009` |
| divhead | `a2000000-0000-4000-8000-000000000006` |
| peopleops | `a2000000-0000-4000-8000-000000000002` |

Use new stable UUIDs in `a3100000-…` range for performance seed rows (do not collide with demo-org `a3000000-…`).

---

## Slice 1 — Employee dashboard

### Task 1: Dashboard helpers — `reviewsAwaitingMe` + display-name enrichment

**Files:**
- Create: `backend/src/modules/talent/performance-dashboard.util.ts`
- Create: `backend/src/modules/talent/__tests__/performance-dashboard.util.spec.ts`
- Modify: `backend/src/modules/talent/talent.service.ts` (`getPerformanceDashboard`)

**Interfaces:**
- Produces: `countReviewsAwaitingMe(reviews: { status: string; workerId: string; managerWorkerId: string | null }[], actingWorkerId: string | null): number`
- Produces: dashboard field `reviewsAwaitingMe: number`
- Produces: feedback/recognition items may include `authorName` / `recipientName` strings when enrichment runs
- Consumes: existing `getPerformanceDashboard` repositories + `WorkerEntity` lookups

- [x] **Step 1: Write failing util tests**

```typescript
import { countReviewsAwaitingMe } from '../performance-dashboard.util';

describe('countReviewsAwaitingMe', () => {
  it('counts pending_self for acting worker', () => {
    const n = countReviewsAwaitingMe(
      [
        {
          status: 'pending_self',
          workerId: 'w1',
          managerWorkerId: 'm1',
        },
        {
          status: 'pending_manager',
          workerId: 'w1',
          managerWorkerId: 'm1',
        },
      ],
      'w1',
    );
    expect(n).toBe(1);
  });

  it('counts pending_manager where acting user is manager', () => {
    const n = countReviewsAwaitingMe(
      [
        {
          status: 'pending_manager',
          workerId: 'w1',
          managerWorkerId: 'm1',
        },
      ],
      'm1',
    );
    expect(n).toBe(1);
  });

  it('returns 0 when actingWorkerId is null', () => {
    expect(
      countReviewsAwaitingMe(
        [{ status: 'pending_self', workerId: 'w1', managerWorkerId: null }],
        null,
      ),
    ).toBe(0);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && pnpm exec jest src/modules/talent/__tests__/performance-dashboard.util.spec.ts --no-cache
```

Expected: FAIL (module not found / function undefined)

- [ ] **Step 3: Implement util**

```typescript
export type ReviewAwaitCountInput = {
  status: string;
  workerId: string;
  managerWorkerId: string | null;
};

export function countReviewsAwaitingMe(
  reviews: ReviewAwaitCountInput[],
  actingWorkerId: string | null,
): number {
  if (!actingWorkerId) {
    return 0;
  }
  return reviews.filter((r) => {
    if (r.status === 'pending_self' && r.workerId === actingWorkerId) {
      return true;
    }
    if (
      r.status === 'pending_manager' &&
      r.managerWorkerId === actingWorkerId
    ) {
      return true;
    }
    return false;
  }).length;
}

export function workerDisplayName(worker: {
  firstName: string;
  lastName: string;
}): string {
  return `${worker.firstName} ${worker.lastName}`.trim();
}
```

- [ ] **Step 4: Wire into `getPerformanceDashboard`**

In `talent.service.ts` after loading feedback/recognition/reviews:

1. Collect unique worker IDs from feedback + recognition author/recipient.
2. `workerRepository.findByIds` (or `In(...)`) for those IDs.
3. Map names onto returned objects as `authorName` / `recipientName` (plain fields on returned POJOs — do not mutate entity schema).
4. Add `reviewsAwaitingMe: countReviewsAwaitingMe(reviews.slice(0, 10) /* same array returned */, actingWorkerId)`.

Return shape addition:

```typescript
return {
  actingWorkerId,
  goals,
  feedback: enrichedFeedback,
  oneOnOnes,
  reviews: reviews.slice(0, 10),
  developmentPlans: plans,
  recognition: enrichedRecognition,
  objectives,
  roleCodes: auth.roleCodes,
  reviewsAwaitingMe: countReviewsAwaitingMe(reviews, actingWorkerId),
};
```

- [ ] **Step 5: Re-run util tests — expect PASS**

```bash
cd backend && pnpm exec jest src/modules/talent/__tests__/performance-dashboard.util.spec.ts --no-cache
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/talent/performance-dashboard.util.ts \
  backend/src/modules/talent/__tests__/performance-dashboard.util.spec.ts \
  backend/src/modules/talent/talent.service.ts
git commit -m "$(cat <<'EOF'
feat(talent): enrich performance dashboard with awaiting review count

EOF
)"
```

---

### Task 2: Demo performance seed (Slice 1 fixtures)

**Files:**
- Create: `backend/src/database/seeds/1783040700000-demo-performance.seed.ts`

**Interfaces:**
- Consumes: `DEMO_PERSONAS`, `DIGITARO_TENANT_ID`, existing performance entities
- Produces: idempotent rows for goals, feedback, recognition, 1:1, cycle, reviews (`pending_self` / `pending_manager`), active OKR + KR
- Later slices **extend this same seed file** (pulse, calibration reviews, IDP) — do not create a second seed class

- [ ] **Step 1: Create seed with fixed UUIDs**

```typescript
import { DEMO_PERSONAS } from '@/modules/compliance/constants/demo-persona.constants';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PerformanceGoalEntity } from '@/modules/talent/entities/performance-goal.entity';
// ... import FeedbackEntryEntity, RecognitionEntryEntity, OneOnOneMeetingEntity,
// OrganizationalObjectiveEntity, ObjectiveKeyResultEntity, PerformanceCycleEntity,
// PerformanceReviewEntity, enums
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

const IDS = {
  goalEmployeeOnTrack: 'a3100000-0000-4000-8000-000000000001',
  goalEmployeeAtRisk: 'a3100000-0000-4000-8000-000000000002',
  goalEmployee2: 'a3100000-0000-4000-8000-000000000003',
  feedback1: 'a3100000-0000-4000-8000-000000000010',
  recognition1: 'a3100000-0000-4000-8000-000000000020',
  oneOnOne1: 'a3100000-0000-4000-8000-000000000030',
  objective1: 'a3100000-0000-4000-8000-000000000040',
  keyResult1: 'a3100000-0000-4000-8000-000000000041',
  cycle1: 'a3100000-0000-4000-8000-000000000050',
  reviewEmployeePendingSelf: 'a3100000-0000-4000-8000-000000000051',
  reviewEmployee2PendingManager: 'a3100000-0000-4000-8000-000000000052',
} as const;

function persona(key: string) {
  const p = DEMO_PERSONAS.find((x) => x.key === key);
  if (!p) throw new Error(`Missing demo persona ${key}`);
  return p;
}

export class DemoPerformanceSeed1783040700000 implements Seeder {
  track = true;

  public async run(dataSource: DataSource, _: SeederFactoryManager): Promise<void> {
    const employee = persona('employee');
    const employee2 = persona('employee2');
    const manager = persona('manager');
    const year = new Date().getFullYear();

    // Upsert pattern: findOne by id → create if missing → save
    // 1) Active goals for employee (on_track 60%, at_risk 35%) and employee2
    // 2) Feedback from manager → employee (praise)
    // 3) Recognition manager → employee
    // 4) Scheduled 1:1 manager ↔ employee (next week)
    // 5) Active company objective + one KR
    // 6) Active annual cycle (calibrationEnabled: true for later slices)
    // 7) Review employee pending_self; employee2 pending_manager (managerWorkerId = manager.workerId)
  }
}
```

Fill entity fields to match column requirements in entity files (`tenantId`, statuses, dates as `YYYY-MM-DD` strings where date columns, etc.). Read entity files before coding — do not invent columns.

- [ ] **Step 2: Run seed locally**

```bash
cd backend && pnpm seed:run
```

Expected: completes without unique-constraint errors; re-run is idempotent.

- [ ] **Step 3: Spot-check via API (authenticated as employee.demo)**

```bash
# After signing in via UI or using session cookie:
curl -s -b cookies.txt http://localhost:8000/api/v1/talent/performance/dashboard | head
```

Expected: non-empty `goals`, `feedback`, `oneOnOnes`, `reviews`, `objectives`, `reviewsAwaitingMe >= 1`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/database/seeds/1783040700000-demo-performance.seed.ts
git commit -m "$(cat <<'EOF'
feat(talent): seed demo performance fixtures for IPMS

EOF
)"
```

---

### Task 3: Query-param helper for Hub deep-links

**Files:**
- Create: `frontend/src/libs/performance/performance-query.ts`
- Create: `frontend/src/libs/performance/performance-query.test.ts`

**Interfaces:**
- Produces: `parsePerformanceSearchParams(search: string): { reviewId: string | null; developmentActionId: string | null }`

- [ ] **Step 1: Write failing Vitest**

```typescript
import { describe, expect, it } from 'vitest';
import { parsePerformanceSearchParams } from './performance-query';

describe('parsePerformanceSearchParams', () => {
  it('reads reviewId', () => {
    expect(parsePerformanceSearchParams('?reviewId=abc')).toEqual({
      reviewId: 'abc',
      developmentActionId: null,
    });
  });

  it('reads developmentActionId', () => {
    expect(
      parsePerformanceSearchParams('?developmentActionId=act-1'),
    ).toEqual({
      reviewId: null,
      developmentActionId: 'act-1',
    });
  });

  it('returns nulls when absent', () => {
    expect(parsePerformanceSearchParams('')).toEqual({
      reviewId: null,
      developmentActionId: null,
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd frontend && pnpm exec vitest run src/libs/performance/performance-query.test.ts
```

- [ ] **Step 3: Implement**

```typescript
export function parsePerformanceSearchParams(search: string): {
  reviewId: string | null;
  developmentActionId: string | null;
} {
  const params = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  );
  return {
    reviewId: params.get('reviewId'),
    developmentActionId: params.get('developmentActionId'),
  };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd frontend && pnpm exec vitest run src/libs/performance/performance-query.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/libs/performance/performance-query.ts \
  frontend/src/libs/performance/performance-query.test.ts
git commit -m "$(cat <<'EOF'
feat(frontend): add performance Hub query param parser

EOF
)"
```

---

### Task 4: Employee `PerformanceDashboardView` end-to-end UX

**Files:**
- Modify: `frontend/src/components/performance/PerformanceDashboardView.tsx`
- Modify: `frontend/src/libs/api/talent.ts` (`PerformanceDashboard.reviewsAwaitingMe`, optional `authorName`/`recipientName` on feedback/recognition)
- Modify: `frontend/src/locales/en.json` (`Performance` keys)

**Interfaces:**
- Consumes: `getPerformanceDashboard`, `createGoal`, `addGoalCheckIn`, `createFeedback`, `createRecognition`, `submitSelfAssessment`, `WorkerPicker`, `parsePerformanceSearchParams`
- Produces: usable employee dashboard matching Slice 1 acceptance

- [ ] **Step 1: Extend API types**

In `talent.ts`:

```typescript
export type FeedbackEntry = {
  // ...existing
  authorName?: string | null;
  recipientName?: string | null;
};

export type RecognitionEntry = {
  // ...existing
  authorName?: string | null;
  recipientName?: string | null;
};

export type PerformanceDashboard = {
  // ...existing
  reviewsAwaitingMe: number;
};
```

- [ ] **Step 2: Replace summary card 4**

Use `data.reviewsAwaitingMe` with label key `reviews_awaiting` (not recognition count). Keep recognition feed as its own section.

- [ ] **Step 3: Expand Add goal dialog**

Fields bound to `createGoal`:

- `title` (required)
- `description` (optional `InputTextarea`)
- `dueDate` (optional `Calendar` or `InputText` type date → ISO date string)
- `weightPercent` (optional number 0–100)

```typescript
await createGoal({
  workerId,
  title: newGoalTitle.trim(),
  description: newGoalDescription.trim() || undefined,
  dueDate: newGoalDueDate || undefined,
  weightPercent: newGoalWeight === '' ? undefined : Number(newGoalWeight),
});
```

- [ ] **Step 4: Check-in dialog**

Replace silent +10% with dialog state: `checkInGoalId`, `checkInPercent`, `checkInStatus`, `checkInNotes`. On save call `addGoalCheckIn(goalId, { progressPercent, progressStatus, notes })`.

- [ ] **Step 5: Feedback + recognition with WorkerPicker**

```tsx
import { WorkerPicker } from '@/components/shared/WorkerPicker';
import type { DirectoryEntry } from '@/libs/api/org';

// state: feedbackRecipient: DirectoryEntry | null
// Dropdown for feedbackType: praise | constructive | coaching
await createFeedback({
  recipientWorkerId: feedbackRecipient.id,
  feedbackType,
  message: feedbackMessage.trim(),
});

await createRecognition({
  recipientWorkerId: recognitionRecipient.id,
  message: recognitionMessage.trim(),
  valueTag: recognitionTag.trim() || undefined,
});
```

Remove raw UUID `InputText` for recipient.

- [ ] **Step 6: Sections**

Render:

1. My goals (existing cards + check-in)
2. Reviews + `StatusTracker` for review status + self-assessment
3. Upcoming 1:1s (`data.oneOnOnes`)
4. OKRs (`data.objectives`)
5. Recognition feed (show `authorName` when present)
6. Development plans read-only list (`data.developmentPlans`) — actions in Slice 5

Use `EmptyState` for empty sections.

- [ ] **Step 7: Deep-link `?reviewId=`**

```typescript
useEffect(() => {
  if (!data) return;
  const { reviewId } = parsePerformanceSearchParams(window.location.search);
  if (!reviewId) return;
  const review = data.reviews.find((r) => r.id === reviewId);
  if (review?.status === 'pending_self') {
    setActiveReviewId(review.id);
    setSelfAssessmentOpen(true);
  }
}, [data]);
```

- [ ] **Step 8: Locales**

Add keys under `Performance`: `reviews_awaiting`, `goal_description`, `goal_due_date`, `goal_weight`, `check_in_title`, `check_in_notes`, `feedback_type`, `give_recognition`, `no_one_on_ones`, `development_plans`, `no_development_plans`, type labels, etc. English only.

- [ ] **Step 9: Manual smoke**

Sign in as `employee.demo@digitaro.local` / `PolarisDemo!2026` → `/employee/performance`:

1. Sees seeded goals / feedback / 1:1 / review / OKRs
2. Adds a goal with description + due date
3. Check-in updates progress
4. Gives feedback via WorkerPicker to manager or employee2
5. Opens `/employee/performance?reviewId=<seeded pending_self id>` → dialog opens

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/performance/PerformanceDashboardView.tsx \
  frontend/src/libs/api/talent.ts \
  frontend/src/locales/en.json
git commit -m "$(cat <<'EOF'
feat(frontend): complete employee performance dashboard UX

EOF
)"
```

**Slice 1 gate:** Do not start Task 5 until Step 9 passes.

---

## Slice 2 — Manager team

### Task 5: `GET /api/v1/talent/performance/team-dashboard`

**Files:**
- Modify: `backend/src/modules/talent/talent.controller.ts`
- Modify: `backend/src/modules/talent/talent.service.ts`
- Create: `backend/src/modules/talent/__tests__/talent-team-dashboard.spec.ts`

**Interfaces:**
- Produces: `getTeamPerformanceDashboard(userId: string): Promise<TeamPerformanceDashboard>`
- Shape:

```typescript
type TeamPerformanceDashboard = {
  actingWorkerId: string | null;
  reports: Array<{
    workerId: string;
    firstName: string;
    lastName: string;
    goals: PerformanceGoalEntity[];
    reviews: PerformanceReviewEntity[];
  }>;
  oneOnOnes: OneOnOneMeetingEntity[];
  reviewsAwaitingMe: number;
};
```

- Auth: manager / division_head / people_ops / admin; others `ForbiddenException` with code `TEAM_DASHBOARD_DENIED`
- Scope: workers where `managerId === actingWorkerId` (TEAM); DIVISION scope filters by `divisionId`; ALL sees all active FTE reports under tenant (people_ops) — follow existing scope patterns in talent service

- [ ] **Step 1: Write failing service test** (mock repos like `talent-probation-calibration.spec.ts`)

Assert:

1. Employee role → forbidden
2. Manager with two direct reports → two report entries and their goals/reviews loaded
3. `reviewsAwaitingMe` counts `pending_manager` for manager

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pnpm exec jest src/modules/talent/__tests__/talent-team-dashboard.spec.ts --no-cache
```

- [ ] **Step 3: Implement service + controller**

```typescript
// controller
@Get('performance/team-dashboard')
@Roles(
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
  PolarisRoleCode.HRBP,
)
getTeamDashboard(@CurrentUserSession() session: CurrentUserSession) {
  return this.talentService.getTeamPerformanceDashboard(session.user.id);
}
```

Implement service by:

1. `getContext`
2. Load report workers via `workerRepository.find({ where: { tenantId, managerId: actingWorkerId, status: ACTIVE } })` for TEAM; broaden for DIVISION/ALL using existing patterns
3. Load goals `status=ACTIVE` and reviews for those worker IDs (`In`)
4. Load 1:1s where `managerWorkerId === actingWorkerId` and status SCHEDULED
5. Return aggregated shape

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(talent): add performance team dashboard API

EOF
)"
```

---

### Task 6: Manager board UI + API client

**Files:**
- Create: `frontend/src/components/performance/ManagerPerformanceBoard.tsx`
- Modify: `frontend/src/app/[locale]/(auth)/manager/performance/page.tsx`
- Modify: `frontend/src/libs/api/talent.ts` — add:

```typescript
export async function getTeamPerformanceDashboard() {
  return apiRequest<TeamPerformanceDashboard>(`${BASE}/performance/team-dashboard`);
}

export async function submitManagerReview(
  reviewId: string,
  input: { managerAssessment: string; outcome: string },
) {
  return apiRequest(`${BASE}/reviews/${reviewId}/manager-review`, {
    method: 'POST',
    body: input,
  });
}

export async function createOneOnOne(input: {
  employeeWorkerId: string;
  scheduledAt: string;
  agenda?: string;
}) {
  return apiRequest(`${BASE}/one-on-ones`, { method: 'POST', body: input });
}

export async function updateOneOnOne(
  id: string,
  input: { status?: string; agenda?: string },
) {
  return apiRequest(`${BASE}/one-on-ones/${id}`, { method: 'PATCH', body: input });
}
```

Confirm exact paths in `talent.controller.ts` before coding (one-on-ones + manager-review routes already exist — match them).

- Modify: `frontend/src/locales/en.json` — `ManagerPerformance` namespace

**UI requirements:**

- Load team dashboard; skeleton/empty/error
- Per report: name, goals summary, reviews needing `pending_manager`
- Dialog: manager assessment + outcome (`meets` / `exceeds` / `below`)
- Schedule 1:1 (WorkerPicker limited to report worker IDs — filter suggestions client-side or pass known reports into a simple Select)
- Deep-link `?reviewId=` opens manager assessment when status `pending_manager`
- Optional: still show personal dashboard below via `<PerformanceDashboardView />` only if product wants both — **default: team board only** on manager page per spec

- [ ] **Step 1–4:** Implement client → board → wire page → locales
- [ ] **Step 5: Smoke** as `manager.demo` — see employee2 `pending_manager` review; submit assessment; Hub link `/manager/performance?reviewId=…` opens dialog
- [ ] **Step 6: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(frontend): add manager performance team board

EOF
)"
```

**Slice 2 gate:** Task 6 Step 5 must pass before Slice 3.

---

## Slice 3 — Cycles + OKRs

### Task 7: People Ops cycle form polish

**Files:**
- Modify: `frontend/src/app/[locale]/(auth)/people-ops/performance/page.tsx`
- Modify: `frontend/src/libs/api/talent.ts` — `createCycle` accepts `calibrationEnabled?: boolean`
- Modify: `frontend/src/locales/en.json`

Replace one-click “Create annual cycle” with a dialog:

- name, cycleType (`annual` | `semi_annual` | `quarterly` | `probation`), periodStart, periodEnd
- checkboxes: `peerFeedbackEnabled`, `calibrationEnabled`
- errors shown in UI (not `console.error`)
- activate still via table action

```typescript
await createCycle({
  name,
  cycleType,
  periodStart,
  periodEnd,
  peerFeedbackEnabled,
  calibrationEnabled,
});
```

Backend DTO already has `calibrationEnabled` — confirm controller passes it through `createCycle` service.

- [ ] Implement + smoke as `peopleops.demo`
- [ ] Commit: `feat(frontend): polish people-ops performance cycle create form`

---

### Task 8: Restore OKR admin at `/people-ops/performance/okrs`

**Files:**
- Create: `frontend/src/components/performance/OkrAdminWorkspace.tsx`
- Create: `frontend/src/app/[locale]/(auth)/people-ops/performance/okrs/page.tsx`
- Modify: `frontend/src/locales/en.json` (keys already largely under `OkrAdmin` — fill gaps only)
- Modify: shell nav registration if performance OKR link missing — search `shell` / `module` seed for `people-ops` performance hrefs and add `…/okrs` child or secondary link from People Ops performance page header (`Link` to `/people-ops/performance/okrs`)

**Workspace behaviour:**

1. `listObjectives()` table
2. Create objective dialog (level, title, description, period, optional divisionId)
3. Expand row → `listKeyResults` → add KR
4. Activate/close via `updateObjective({ status: 'active' | 'closed' })`

Use existing API helpers in `talent.ts` — no new backend unless create fails RBAC for people_ops (should already allow).

- [ ] Smoke: create objective → add KR → activate → appears on employee dashboard `objectives`
- [ ] Commit: `feat(frontend): restore people-ops OKR admin workspace`

**Slice 3 gate:** OKR visible on employee dashboard after activate.

---

## Slice 4 — Calibration + pulse

### Task 9: Extend demo seed — calibration + pulse

**Files:**
- Modify: `backend/src/database/seeds/1783040700000-demo-performance.seed.ts`

Add:

1. Review in `pending_calibration` for employee (after manager submitted) — or a third review row `a3100000-…053` with status `pending_calibration`, outcome provisional `meets`, `managerWorkerId` = manager
2. Ensure cycle `calibrationEnabled = true`
3. Pulse survey entity + questions JSON matching `PulseSurveyEntity` shape; status `active`; anonymityThreshold `3`

Read `pulse-survey.entity.ts` and existing create-pulse DTO/service before seeding.

- [ ] Re-run `pnpm seed:run` idempotent
- [ ] Commit: `feat(talent): extend demo performance seed with calibration and pulse`

---

### Task 10: Calibration polish + pulse admin

**Files:**
- Modify: `frontend/src/app/[locale]/(auth)/people-ops/performance/calibration/page.tsx` — empty/error states via shared components; ensure seeded cycle appears
- Create or modify People Ops pulse admin page under `people-ops/performance/pulse/page.tsx`
- Confirm employee pulse page handles results/anonymity message from `getPulseResults`
- Add API helpers if missing: `createPulseSurvey`, `activatePulseSurvey` — match controller routes in `talent.controller.ts`

- [ ] Smoke: `divhead.demo` calibrates seeded review; `employee.demo` submits pulse; results below threshold show anonymity message
- [ ] Commit: `feat(frontend): polish calibration and pulse performance flows`

**Slice 4 gate:** calibration + pulse smoke pass.

---

## Slice 5 — IDPs + Hub polish

### Task 11: Development plan panel + mutations

**Files:**
- Create: `frontend/src/components/performance/DevelopmentPlanPanel.tsx`
- Modify: `frontend/src/components/performance/PerformanceDashboardView.tsx` — replace read-only list with panel
- Modify: `frontend/src/components/performance/ManagerPerformanceBoard.tsx` — show team IDP actions
- Modify: `frontend/src/libs/api/talent.ts`:

```typescript
export async function createDevelopmentPlan(input: {
  workerId: string;
  title: string;
  summary?: string;
}) { /* POST /development-plans */ }

export async function createDevelopmentPlanAction(
  planId: string,
  input: { title: string; actionType?: string },
) { /* POST /development-plans/:planId/actions */ }

export async function updateDevelopmentPlanAction(
  actionId: string,
  input: { status: string },
) { /* PATCH path from controller — verify exact route */ }
```

- Extend seed with plan + pending action for employee (`a3100000-…060/061`) so Hub shows `development_plan_action`

Deep-link: `parsePerformanceSearchParams` → if `developmentActionId`, scroll/open that action in the panel.

- [ ] Smoke: Hub item → `/employee/performance?developmentActionId=` opens context; mark complete
- [ ] Commit: `feat(frontend): add development plan panel with Hub deep-links`

---

### Task 12: Demo accounts smoke checklist + Hub href matrix

**Files:**
- Modify: `docs/superpowers/specs/2026-08-08-demo-accounts.md`
- Optionally verify `hub.service.ts` hrefs still match routes:

| Hub type | href |
|---|---|
| performance_review (mine) | `/employee/performance?reviewId=` |
| performance_review (manager) | `/manager/performance?reviewId=` |
| one_on_one | existing href — open 1:1 section if param present or list |
| development_plan_action (mine) | `/employee/performance?developmentActionId=` |
| development_plan_action (for me) | `/manager/performance?developmentActionId=` |

Fix hrefs in Hub service if they drift.

- [ ] Update demo-accounts with Performance smoke rows per role
- [ ] Commit: `docs(talent): add performance smoke checklist to demo accounts`

**Slice 5 gate:** full matrix verified manually once.

---

## Final verification

- [ ] `cd backend && pnpm exec jest src/modules/talent/__tests__/performance-dashboard.util.spec.ts src/modules/talent/__tests__/talent-team-dashboard.spec.ts --no-cache`
- [ ] `cd frontend && pnpm exec vitest run src/libs/performance/performance-query.test.ts`
- [ ] Demo login smoke order: employee → manager → peopleops → divhead → Hub deep-links
- [ ] Update design status already Approved; mark plan tasks complete in PR description

---

## Spec coverage checklist (self-review)

| Spec requirement | Task |
|---|---|
| Goal form fields | Task 4 |
| Check-in dialog | Task 4 |
| WorkerPicker feedback/recognition | Task 4 |
| Summary card reviews awaiting | Tasks 1 + 4 |
| 1:1 section | Task 4 |
| Deep-link reviewId employee | Tasks 3 + 4 |
| Rich seeds | Tasks 2, 9, 11 |
| Team dashboard API | Task 5 |
| Manager board + manager review | Task 6 |
| Cycles polish + calibration flag | Task 7 |
| OKR admin restore | Task 8 |
| Calibration + pulse | Tasks 9–10 |
| IDPs + Hub | Tasks 11–12 |
| Demo-accounts update | Task 12 |
| FLW-TAL-004 / US-TAL-004 | Tasks 5–6, 9–10 (calibration + reviews) |
| English-only locales | All frontend tasks |

## Placeholder / consistency notes

- Confirm one-on-one and manager-review **exact** controller paths when implementing Task 6 (read `talent.controller.ts` — do not guess).
- Team dashboard scope for DIVISION_HEAD must use division filter, not only `managerId`.
- Single seed file `1783040700000-demo-performance.seed.ts` owned across Tasks 2/9/11.
