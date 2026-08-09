# Employee Home (Today) Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Employee Home into a personal Today page (greeting, denser widgets, no permanent Try again) and add optional worker `dateOfBirth` so birthday/anniversary cards can render.

**Architecture:** Backend adds nullable `dateOfBirth` on `workers` (migration + DTO/service + DOB redaction in mapper). Frontend extracts pure helpers and section components under `components/employee/home/`, loads leave/Hub/calendar/me independently, and rewires `employee/home/page.tsx` into a vertical stack. Shell check-in CTA stays a link to `#check-in`.

**Tech Stack:** NestJS 10 + TypeORM + Jest; Next.js 16 + PrimeReact + Lucide + next-intl (`en.json` only) + Vitest.

**Spec:** `docs/superpowers/specs/2026-08-10-employee-home-today-design.md`

## Global Constraints

- English only — edit `frontend/src/locales/en.json` only; do not edit `ar.json` / `fr.json`
- Lucide icons only; no emoji
- Never hard-code country logic (`if country === 'PK'`)
- Every worker mutation that sets/clears DOB continues to write `audit_log` (existing `worker.create` / `worker.update`); do not log the DOB value in app logs
- DB column name follows existing workers table style: quoted camelCase `"dateOfBirth"` (not snake_case)
- Never edit old migrations — add a new one
- Keep `#check-in` on the punch section for shell deep-link
- Conventional Commits: `feat(core-hr): …`, `feat(frontend): …`, `test(…): …`, `docs(…): …`

---

## File map

### Create

| File | Responsibility |
|---|---|
| `backend/src/database/migrations/1783040900000-AddWorkerDateOfBirth.ts` | Add nullable `"dateOfBirth"` date column on `workers` |
| `frontend/src/libs/employee/home-today.util.ts` | Pure greeting / celebration / upcoming helpers |
| `frontend/src/libs/employee/home-today.util.test.ts` | Vitest for helpers |
| `frontend/src/components/employee/home/HomeGreeting.tsx` | Time-of-day + name + date |
| `frontend/src/components/employee/home/HomeCheckInCard.tsx` | Punch UI extracted from page (`id="check-in"`) |
| `frontend/src/components/employee/home/HomeLeaveBalances.tsx` | Leave chips + empty/error |
| `frontend/src/components/employee/home/HomeNeedsYou.tsx` | Hub `forMe` preview |
| `frontend/src/components/employee/home/HomeComingUp.tsx` | Next-7-days leave/holidays |
| `frontend/src/components/employee/home/HomeCelebration.tsx` | Birthday / anniversary cards |
| `frontend/src/components/employee/home/HomeShortcuts.tsx` | Quick links row |

### Modify

| File | Change |
|---|---|
| `backend/src/modules/core-hr/entities/worker.entity.ts` | Add `dateOfBirth` column |
| `backend/src/modules/core-hr/dto/create-worker.dto.ts` | Optional `@IsDateString() dateOfBirth?` |
| `backend/src/modules/core-hr/worker.service.ts` | Persist DOB on create/update |
| `backend/src/modules/core-hr/worker.mapper.ts` | Redact DOB unless self (`userId`) or sensitive role |
| `backend/src/modules/core-hr/__tests__/worker.service.spec.ts` | Create/update DOB + mapper redaction coverage |
| `backend/src/database/seeds/1783038400000-demo-org.seed.ts` | Set employee persona DOB to today’s month/day |
| `docs/superpowers/specs/2026-08-08-demo-accounts.md` | Note birthday DOB on `employee.demo` |
| `docs/project-requirements/database-design.md` | Document `date_of_birth` / `dateOfBirth` on workers |
| `frontend/src/libs/api/workers.ts` | Make `dateOfBirth` a real field; add to create input; remove “reserved” comment |
| `frontend/src/locales/en.json` | New `EmployeeHome` greeting / needs_you / coming_up / shortcuts keys |
| `frontend/src/app/[locale]/(auth)/employee/home/page.tsx` | Compose new sections; remove header Try again |
| `docs/superpowers/specs/2026-08-10-employee-home-today-design.md` | Status → Implemented after last task |

---

### Task 1: Worker `dateOfBirth` migration + entity

**Files:**
- Create: `backend/src/database/migrations/1783040900000-AddWorkerDateOfBirth.ts`
- Modify: `backend/src/modules/core-hr/entities/worker.entity.ts`
- Modify: `docs/project-requirements/database-design.md` (workers table — add row for date of birth)

**Interfaces:**
- Produces: `WorkerEntity.dateOfBirth: string | null` mapped to column `"dateOfBirth"` type `date`

- [ ] **Step 1: Add entity column** (after `startDate`):

```ts
@Column({ type: 'date', nullable: true })
dateOfBirth: string | null;
```

- [ ] **Step 2: Create migration**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkerDateOfBirth1783040900000 implements MigrationInterface {
  name = 'AddWorkerDateOfBirth1783040900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workers"
        ADD COLUMN IF NOT EXISTS "dateOfBirth" date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workers"
        DROP COLUMN IF EXISTS "dateOfBirth"
    `);
  }
}
```

- [ ] **Step 3: Document in `database-design.md`** under `workers` columns — add:

`| date_of_birth / dateOfBirth | DATE | nullable — used for Home birthday card; PII |`

(Note physical column is camelCase `"dateOfBirth"` to match existing workers DDL.)

- [ ] **Step 4: Commit**

```bash
git add backend/src/database/migrations/1783040900000-AddWorkerDateOfBirth.ts \
  backend/src/modules/core-hr/entities/worker.entity.ts \
  docs/project-requirements/database-design.md
git commit -m "$(cat <<'EOF'
feat(core-hr): add nullable worker dateOfBirth column

EOF
)"
```

---

### Task 2: DTO, service, mapper redaction + tests

**Files:**
- Modify: `backend/src/modules/core-hr/dto/create-worker.dto.ts`
- Modify: `backend/src/modules/core-hr/worker.service.ts`
- Modify: `backend/src/modules/core-hr/worker.mapper.ts`
- Modify: `backend/src/modules/core-hr/__tests__/worker.service.spec.ts`
- Test: same spec file (extend) — optionally add `worker.mapper` assertions via service responses

**Interfaces:**
- Consumes: `CreateWorkerDto` / `UpdateWorkerDto` (PartialType)
- Produces: create/update persist `dateOfBirth`; `toWorkerResponse` returns `dateOfBirth` only when `worker.userId === auth.userId` OR role in existing `SENSITIVE_ROLES`; otherwise `null`

- [ ] **Step 1: Write failing test** in `worker.service.spec.ts` — assert create passes `dateOfBirth` into repository create, and update assigns it. Also unit-test mapper by importing `toWorkerResponse`:

```ts
import { toWorkerResponse } from '../worker.mapper';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';

it('redacts dateOfBirth for non-self non-sensitive viewers', () => {
  const worker = {
    ...baseWorkerEntity,
    userId: 'owner-user',
    dateOfBirth: '1995-08-10',
  } as WorkerEntity;
  const auth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'other-user',
    roleCodes: [PolarisRoleCode.EMPLOYEE],
    assignments: [],
    broadestScope: ScopeType.OWN,
  };
  expect(toWorkerResponse(worker, auth).dateOfBirth).toBeNull();
});

it('includes dateOfBirth for self', () => {
  const worker = {
    ...baseWorkerEntity,
    userId: 'owner-user',
    dateOfBirth: '1995-08-10',
  } as WorkerEntity;
  const auth = {
    tenantId: DIGITARO_TENANT_ID,
    userId: 'owner-user',
    roleCodes: [PolarisRoleCode.EMPLOYEE],
    assignments: [],
    broadestScope: ScopeType.OWN,
  };
  expect(toWorkerResponse(worker, auth).dateOfBirth).toBe('1995-08-10');
});
```

Adapt `baseWorkerEntity` to whatever fixture shape the spec already uses (or minimal cast).

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd backend && pnpm test -- src/modules/core-hr/__tests__/worker.service.spec.ts`

Expected: FAIL (mapper does not redact / field missing)

- [ ] **Step 3: Implement DTO field** on `CreateWorkerDto`:

```ts
@ApiPropertyOptional({ example: '1995-08-10' })
@IsOptional()
@IsDateString()
dateOfBirth?: string;
```

- [ ] **Step 4: Persist in service**

In `create`, add `dateOfBirth: dto.dateOfBirth ?? null` to `workerRepository.create({...})`.

In `update`, add:

```ts
if (workerDto.dateOfBirth !== undefined) {
  worker.dateOfBirth = workerDto.dateOfBirth;
}
```

Do **not** put the DOB value into `auditLogService.append` `changes` payload (keep existing change keys; optional: add `dateOfBirthChanged: true` boolean only if you need evidence — prefer omit value).

- [ ] **Step 5: Mapper redaction**

```ts
const canViewDob =
  (worker.userId != null && worker.userId === auth.userId) ||
  [...roleCodes].some((code) => SENSITIVE_ROLES.has(code));

const { tenant, employmentType, deletedAt, dateOfBirth, ...rest } = worker;

return {
  ...rest,
  dateOfBirth: canViewDob ? dateOfBirth : null,
  statutoryFields: canViewStatutory ? worker.statutoryFields : null,
  compensationBand: canViewCompensation ? worker.compensationBand : null,
  contractorProfile: contractorProfile ?? null,
};
```

- [ ] **Step 6: Run tests — expect PASS**

Run: `cd backend && pnpm test -- src/modules/core-hr/__tests__/worker.service.spec.ts`

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/core-hr/dto/create-worker.dto.ts \
  backend/src/modules/core-hr/worker.service.ts \
  backend/src/modules/core-hr/worker.mapper.ts \
  backend/src/modules/core-hr/__tests__/worker.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(core-hr): accept and redact worker dateOfBirth

EOF
)"
```

---

### Task 3: Demo seed birthday DOB

**Files:**
- Modify: `backend/src/database/seeds/1783038400000-demo-org.seed.ts`
- Modify: `docs/superpowers/specs/2026-08-08-demo-accounts.md`

**Interfaces:**
- Produces: `employee.demo` worker gets `dateOfBirth` whose month/day equals seed-run “today” (UTC), year `1995`, so Home birthday card shows after `pnpm seed:run`

- [ ] **Step 1: Helper in seed file** (near top of run method or module scope):

```ts
function demoBirthdayIso(now = new Date()): string {
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `1995-${mm}-${dd}`;
}
```

- [ ] **Step 2: On create path** for workers, set `dateOfBirth: persona.key === 'employee' ? demoBirthdayIso() : null`.

- [ ] **Step 3: On else update path**, when `persona.key === 'employee'`, set `worker.dateOfBirth = demoBirthdayIso()` before save so re-seeds refresh the card.

- [ ] **Step 4: Document** in demo-accounts.md under Accounts / sample data:

`employee.demo` has `dateOfBirth` set to today’s month/day (year 1995) so Employee Home shows the birthday card after seeding.

- [ ] **Step 5: Commit**

```bash
git add backend/src/database/seeds/1783038400000-demo-org.seed.ts \
  docs/superpowers/specs/2026-08-08-demo-accounts.md
git commit -m "$(cat <<'EOF'
chore(demo): seed employee.demo birthday for Home card

EOF
)"
```

---

### Task 4: Frontend home pure helpers (TDD)

**Files:**
- Create: `frontend/src/libs/employee/home-today.util.ts`
- Test: `frontend/src/libs/employee/home-today.util.test.ts`

**Interfaces:**
- Consumes: `StaffCalendarResponse` from `@/libs/api/calendars`
- Produces:
  - `firstNameFromDisplayName(name: string | null | undefined): string` — first token; empty → `''`
  - `greetingPeriod(date: Date, timeZone?: string | null): 'morning' | 'afternoon' | 'evening'` — hour `<12` morning, `<17` afternoon, else evening (use `Intl` with timeZone when set)
  - `isMonthDayMatch(isoDate: string | null | undefined, today: Date, timeZone?: string | null): boolean`
  - `anniversaryYears(startDate: string, today: Date, timeZone?: string | null): number | null` — null if no month/day match or years `< 1`
  - `type HomeUpcomingItem = { key: string; kind: 'leave' | 'holiday'; title: string; dateLabel: string }`
  - `upcomingFromCalendar(calendar: StaffCalendarResponse, fromIso: string, toIso: string): HomeUpcomingItem[]`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  anniversaryYears,
  firstNameFromDisplayName,
  greetingPeriod,
  isMonthDayMatch,
  upcomingFromCalendar,
} from './home-today.util';
import type { StaffCalendarResponse } from '@/libs/api/calendars';

describe('firstNameFromDisplayName', () => {
  it('returns first token', () => {
    expect(firstNameFromDisplayName('Ayesha Khan')).toBe('Ayesha');
  });
  it('returns empty for blank', () => {
    expect(firstNameFromDisplayName('  ')).toBe('');
  });
});

describe('greetingPeriod', () => {
  it('classifies morning in UTC', () => {
    expect(greetingPeriod(new Date('2026-08-10T08:00:00Z'), 'UTC')).toBe('morning');
  });
  it('classifies afternoon in UTC', () => {
    expect(greetingPeriod(new Date('2026-08-10T14:00:00Z'), 'UTC')).toBe('afternoon');
  });
  it('classifies evening in UTC', () => {
    expect(greetingPeriod(new Date('2026-08-10T19:00:00Z'), 'UTC')).toBe('evening');
  });
});

describe('isMonthDayMatch', () => {
  it('matches month and day ignoring year', () => {
    expect(isMonthDayMatch('1995-08-10', new Date('2026-08-10T12:00:00Z'), 'UTC')).toBe(true);
    expect(isMonthDayMatch('1995-08-11', new Date('2026-08-10T12:00:00Z'), 'UTC')).toBe(false);
  });
});

describe('anniversaryYears', () => {
  it('returns years when anniversary day and at least 1 year', () => {
    expect(anniversaryYears('2024-08-10', new Date('2026-08-10T12:00:00Z'), 'UTC')).toBe(2);
  });
  it('returns null on start year anniversary day (0 years)', () => {
    expect(anniversaryYears('2026-08-10', new Date('2026-08-10T12:00:00Z'), 'UTC')).toBeNull();
  });
});

describe('upcomingFromCalendar', () => {
  it('includes leave and holidays in range', () => {
    const calendar: StaffCalendarResponse = {
      from: '2026-08-10',
      to: '2026-08-16',
      timezone: 'UTC',
      days: [],
      leave: [
        {
          leaveRequestId: 'lr1',
          leaveTypeId: 'lt1',
          leaveTypeName: 'Annual',
          startDate: '2026-08-12',
          endDate: '2026-08-13',
          status: 'approved',
        },
      ],
      holidays: [
        {
          id: 'h1',
          name: 'Independence Day',
          holidayDate: '2026-08-14',
          countryCode: 'PK',
          isCompanyClosure: false,
        },
      ],
    };
    const items = upcomingFromCalendar(calendar, '2026-08-10', '2026-08-16');
    expect(items.map(i => i.kind)).toEqual(['leave', 'holiday']);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd frontend && pnpm exec vitest run src/libs/employee/home-today.util.test.ts`

- [ ] **Step 3: Implement helpers** in `home-today.util.ts` (parse `YYYY-MM-DD` as calendar date; for `greetingPeriod` use `Intl.DateTimeFormat` with `hour: 'numeric', hour12: false, timeZone`).

For `upcomingFromCalendar`: include leave if range overlaps `[fromIso,toIso]`; include holidays whose `holidayDate` is in range; stable keys `leave:{id}` / `holiday:{id}`; `dateLabel` can be start date or `start–end` for multi-day leave.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/libs/employee/home-today.util.ts \
  frontend/src/libs/employee/home-today.util.test.ts
git commit -m "$(cat <<'EOF'
feat(frontend): add Employee Home today helpers

EOF
)"
```

---

### Task 5: i18n + workers client type cleanup

**Files:**
- Modify: `frontend/src/locales/en.json` (`EmployeeHome` + ensure `HumanMoments` keys exist)
- Modify: `frontend/src/libs/api/workers.ts`

- [ ] **Step 1: Update `Worker` type** — keep `dateOfBirth: string | null` (required nullability), remove the “reserved” comment. Add `dateOfBirth?: string` to `CreateWorkerInput`.

- [ ] **Step 2: Add `EmployeeHome` strings** (merge; do not delete existing punch keys):

```json
"greeting_morning": "Good morning, {name}",
"greeting_afternoon": "Good afternoon, {name}",
"greeting_evening": "Good evening, {name}",
"greeting_fallback_name": "there",
"greeting_date": "{date}",
"needs_you_section": "Needs you",
"needs_you_empty_title": "Nothing needs you",
"needs_you_empty_description": "Approvals and signatures waiting on you will show up here.",
"needs_you_view_hub": "Open Hub",
"needs_you_error": "Could not load Hub items.",
"coming_up_section": "Coming up",
"coming_up_empty": "Nothing upcoming this week.",
"coming_up_error": "Could not load upcoming items.",
"coming_up_view_calendar": "View calendar",
"leave_error": "Could not load leave balances.",
"shortcuts_section": "Shortcuts",
"shortcut_leave": "Leave",
"shortcut_calendar": "Calendar",
"shortcut_hub": "Hub",
"shortcut_documents": "Documents",
"shortcut_payslips": "Payslips"
```

Reuse `HumanMoments.birthday_title`, `birthday_description`, `anniversary_title`, `anniversary_description`, `section_label` in celebration component.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/locales/en.json frontend/src/libs/api/workers.ts
git commit -m "$(cat <<'EOF'
feat(frontend): home i18n and worker dateOfBirth client type

EOF
)"
```

---

### Task 6: Section components + page composition

**Files:**
- Create: all `frontend/src/components/employee/home/*.tsx` listed in file map
- Modify: `frontend/src/app/[locale]/(auth)/employee/home/page.tsx`

**Interfaces:**
- Consumes: helpers from Task 4; `getTodayAttendance` / punch APIs; `listLeaveBalances`; `getHubInbox`; `getMyCalendar`; `getMyWorker`; `useSession` / `useAuth`; existing offline helpers
- Produces: page stack per spec §1; **no** permanent header Try again; section-level retry only

- [ ] **Step 1: Extract `HomeCheckInCard`** — move current punch UI (status messages, buttons, punch error, day-off) into props-driven or self-contained client component with `id="check-in"` on the section. Keep punch mutation behavior identical (including `notifyAttendanceUpdated` and `ALREADY_CHECKED_IN` reload).

- [ ] **Step 2: Implement remaining presentational sections**

`HomeGreeting`: `useTranslations('EmployeeHome')` + period key; format date with `Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })`.

`HomeLeaveBalances`: load on mount; skeleton; chips showing `remaining` + type + unit; empty uses `no_balances` + Link to `/employee/leave`; error + retry button.

`HomeNeedsYou`: `getHubInbox()` → `forMe.slice(0, 3)`; Link to `/hub`; empty + error states.

`HomeComingUp`: compute `from`/`to` as today and today+6 (`YYYY-MM-DD` local or worker TZ); `getMyCalendar`; map via `upcomingFromCalendar`; Link to `/employee/calendar`.

`HomeCelebration`: from `getMyWorker()`; if birthday match show card using `HumanMoments` birthday strings; if `anniversaryYears` non-null show anniversary; birthday first; return `null` if neither.

`HomeShortcuts`: links to `/employee/leave`, `/employee/calendar`, `/hub`, `/employee/documents`, `/employee/payslips` with Lucide icons (`Palmtree`/`CalendarDays`/`Inbox`/`FileText`/`Wallet` — pick icons already used in nav if present).

- [ ] **Step 3: Rewrite page**

```tsx
<div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
  <OfflineBanner />
  <HomeGreeting />
  {/* offline Message if needed */}
  <HomeCheckInCard />
  <HomeLeaveBalances />
  <HomeNeedsYou />
  <HomeComingUp />
  <HomeCelebration />
  <HomeShortcuts />
</div>
```

Remove the header row that always shows Try again. Do not show a page-level error that replaces the whole stack — check-in keeps its own error UI.

- [ ] **Step 4: Manual smoke** (or light Vitest on util already covered): load `/employee/home` as `employee.demo` after migration + seed — greeting shows name; no header Try again; birthday card visible when DOB seeded.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/employee/home \
  frontend/src/app/[locale]/\(auth\)/employee/home/page.tsx
git commit -m "$(cat <<'EOF'
feat(frontend): redesign Employee Home Today layout

EOF
)"
```

---

### Task 7: Spec status + acceptance pass

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-employee-home-today-design.md`

- [ ] **Step 1: Mark status** `Implemented — see docs/superpowers/plans/2026-08-10-employee-home-today.md`

- [ ] **Step 2: Tick acceptance checklist** in the spec (all boxes that are done)

- [ ] **Step 3: Run targeted tests**

```bash
cd backend && pnpm test -- src/modules/core-hr/__tests__/worker.service.spec.ts
cd frontend && pnpm exec vitest run src/libs/employee/home-today.util.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-08-10-employee-home-today-design.md
git commit -m "$(cat <<'EOF'
docs(employee-home): mark Today redesign spec implemented

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Greeting + first name + date | 5, 6 |
| Remove permanent Try again | 6 |
| Check-in hero + `#check-in` | 6 |
| Leave balances from API | 6 |
| Hub needs you (max 3) | 6 |
| Coming up 7 days | 4, 6 |
| Shortcuts | 6 |
| Birthday + anniversary cards | 4, 6 |
| `dateOfBirth` column + me payload | 1, 2 |
| DOB PII / no broad directory exposure | 2 (mapper redaction) |
| Demo seed matchable DOB | 3 |
| English only | Global + 5 |
| Independent section loads / per-section retry | 6 |
| Shell CTA unchanged | Global (no shell edits) |
