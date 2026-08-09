# Calendar Day Punch Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich staff/team calendar day cells with full punch lists and worked minutes, and show them in a shared hover/tap popover on employee and manager month heatmaps.

**Architecture:** Add pure punch pairing/grouping helpers; batch-load `attendance_punches` inside `CalendarService` and attach `punches` + `workedMinutes` to every day cell. Frontend adds `CalendarDayDetailPopover` (hover desktop / tap mobile) wired into `StaffMonthHeatmap` and `TeamMonthHeatmap` from the calendar payload — no per-day fetches.

**Tech Stack:** NestJS 10, TypeORM, Jest; Next.js 16, React 19, PrimeReact 10, Vitest, Testing Library, next-intl (`en.json` only).

**Spec:** `docs/superpowers/specs/2026-08-09-calendar-day-punch-detail-design.md`

## Global Constraints

- API base `/api/v1/`, envelope `{ data, meta, errors }`
- Read-only calendar GETs — no `audit_log` writes
- RBAC + row scope unchanged (own / team / division / all)
- No country hard-coding (`if country === 'PK'`)
- English only — edit `frontend/src/locales/en.json` only; do not edit `ar.json` / `fr.json`
- Lucide icons only; no emoji
- Conventional Commits: `feat(time-leave): …`, `feat(frontend): …`, `test(…): …`
- `workedMinutes` = sum of completed `check_in` → next `check_out` pairs only; unpaired open check-in contributes 0 but stays in `punches`
- Always emit `punches: []` and `workedMinutes: 0` (never omit fields)

---

## File map

### Backend create

| File | Responsibility |
|---|---|
| `backend/src/modules/time-leave/calendar-punch.util.ts` | Pure: pair punches → minutes; group punches by worker + local work date |
| `backend/src/modules/time-leave/__tests__/calendar-punch.util.spec.ts` | Unit tests for pairing + grouping |

### Backend modify

| File | Change |
|---|---|
| `backend/src/modules/time-leave/calendar.types.ts` | Add `CalendarDayPunch`, extend `CalendarDayCell` with `punches` + `workedMinutes` |
| `backend/src/modules/time-leave/calendar.service.ts` | Inject punch repo; batch-load; attach to staff/team cells |
| `backend/src/modules/time-leave/__tests__/calendar.service.spec.ts` | Mock punch repo; assert punches + minutes on cells |

### Frontend create

| File | Responsibility |
|---|---|
| `frontend/src/libs/datetime/format-worked-minutes.ts` | Format `Xh Ym`; detect in-progress footer |
| `frontend/src/libs/datetime/format-worked-minutes.test.ts` | Vitest for format + in-progress |
| `frontend/src/components/calendar/CalendarDayDetailPopover.tsx` | Shared day detail panel content + open/close shell |
| `frontend/src/components/calendar/CalendarDayDetailPopover.test.tsx` | Render punches, empty, total, in-progress |

### Frontend modify

| File | Change |
|---|---|
| `frontend/src/libs/api/calendars.ts` | Extend day cell types |
| `frontend/src/locales/en.json` | Punch/detail strings under `EmployeeCalendar` + `ManagerCalendar` |
| `frontend/src/components/calendar/StaffMonthHeatmap.tsx` | Pass timezone; wire popover; drop native punch `title` |
| `frontend/src/components/calendar/TeamMonthHeatmap.tsx` | Wire popover per cell; enlarge hit target |
| `frontend/src/app/[locale]/(auth)/employee/calendar/page.tsx` | Pass `timezone` into heatmap |

---

### Task 1: Punch pairing & grouping util (backend)

**Files:**
- Create: `backend/src/modules/time-leave/calendar-punch.util.ts`
- Test: `backend/src/modules/time-leave/__tests__/calendar-punch.util.spec.ts`

**Interfaces:**
- Consumes: `workDateInTimezone` from `./time-leave-scope.util`; `PunchType` from `./enums/attendance.enum`
- Produces:
  - `type PunchLike = { id: string; workerId: string; punchType: PunchType | 'check_in' | 'check_out'; punchedAt: Date }`
  - `computeWorkedMinutes(punches: Array<{ punchType: string; punchedAt: Date }>): number`
  - `groupPunchesByWorkerAndDate(punches: PunchLike[], timezoneByWorkerId: Map<string, string>): Map<string, PunchLike[]>`  
    Key = `${workerId}:${YYYY-MM-DD}` (local work date via `workDateInTimezone`). Values sorted ascending by `punchedAt`.

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/modules/time-leave/__tests__/calendar-punch.util.spec.ts
import { PunchType } from '../enums/attendance.enum';
import {
  computeWorkedMinutes,
  groupPunchesByWorkerAndDate,
} from '../calendar-punch.util';

describe('computeWorkedMinutes', () => {
  it('sums completed in→out pairs and floors to minutes', () => {
    const minutes = computeWorkedMinutes([
      { punchType: PunchType.CHECK_IN, punchedAt: new Date('2026-08-04T09:00:00.000Z') },
      { punchType: PunchType.CHECK_OUT, punchedAt: new Date('2026-08-04T12:00:00.000Z') },
      { punchType: PunchType.CHECK_IN, punchedAt: new Date('2026-08-04T13:00:00.000Z') },
      { punchType: PunchType.CHECK_OUT, punchedAt: new Date('2026-08-04T17:30:00.000Z') },
    ]);
    // 3h + 4h30m = 450
    expect(minutes).toBe(450);
  });

  it('ignores unpaired open check-in for minutes', () => {
    expect(
      computeWorkedMinutes([
        { punchType: PunchType.CHECK_IN, punchedAt: new Date('2026-08-04T09:00:00.000Z') },
      ]),
    ).toBe(0);
  });

  it('returns 0 for empty list', () => {
    expect(computeWorkedMinutes([])).toBe(0);
  });

  it('skips orphan check-out until a check-in opens a pair', () => {
    expect(
      computeWorkedMinutes([
        { punchType: PunchType.CHECK_OUT, punchedAt: new Date('2026-08-04T08:00:00.000Z') },
        { punchType: PunchType.CHECK_IN, punchedAt: new Date('2026-08-04T09:00:00.000Z') },
        { punchType: PunchType.CHECK_OUT, punchedAt: new Date('2026-08-04T10:00:00.000Z') },
      ]),
    ).toBe(60);
  });
});

describe('groupPunchesByWorkerAndDate', () => {
  it('groups by worker local work date across UTC midnight', () => {
    const tz = new Map([['w1', 'Asia/Karachi']]); // UTC+5
    // 2026-08-04 22:00 UTC = 2026-08-05 03:00 in Karachi
    const punches = [
      {
        id: 'p1',
        workerId: 'w1',
        punchType: PunchType.CHECK_IN,
        punchedAt: new Date('2026-08-04T22:00:00.000Z'),
      },
      {
        id: 'p2',
        workerId: 'w1',
        punchType: PunchType.CHECK_OUT,
        punchedAt: new Date('2026-08-05T06:00:00.000Z'),
      },
    ];
    const map = groupPunchesByWorkerAndDate(punches, tz);
    expect(map.get('w1:2026-08-05')?.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(map.has('w1:2026-08-04')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pnpm exec jest src/modules/time-leave/__tests__/calendar-punch.util.spec.ts --no-cache`

Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/modules/time-leave/calendar-punch.util.ts
import { PunchType } from './enums/attendance.enum';
import { workDateInTimezone } from './time-leave-scope.util';

export type PunchLike = {
  id: string;
  workerId: string;
  punchType: PunchType | 'check_in' | 'check_out';
  punchedAt: Date;
};

export function computeWorkedMinutes(
  punches: Array<{ punchType: string; punchedAt: Date }>,
): number {
  const sorted = [...punches].sort(
    (a, b) => a.punchedAt.getTime() - b.punchedAt.getTime(),
  );
  let openIn: Date | null = null;
  let totalMs = 0;
  for (const punch of sorted) {
    if (punch.punchType === PunchType.CHECK_IN || punch.punchType === 'check_in') {
      openIn = punch.punchedAt;
      continue;
    }
    if (
      (punch.punchType === PunchType.CHECK_OUT || punch.punchType === 'check_out') &&
      openIn
    ) {
      totalMs += punch.punchedAt.getTime() - openIn.getTime();
      openIn = null;
    }
  }
  return Math.floor(totalMs / 60_000);
}

export function groupPunchesByWorkerAndDate(
  punches: PunchLike[],
  timezoneByWorkerId: Map<string, string>,
): Map<string, PunchLike[]> {
  const map = new Map<string, PunchLike[]>();
  for (const punch of punches) {
    const tz = timezoneByWorkerId.get(punch.workerId)?.trim() || 'UTC';
    const date = workDateInTimezone(punch.punchedAt, tz);
    const key = `${punch.workerId}:${date}`;
    const list = map.get(key) ?? [];
    list.push(punch);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.punchedAt.getTime() - b.punchedAt.getTime());
  }
  return map;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pnpm exec jest src/modules/time-leave/__tests__/calendar-punch.util.spec.ts --no-cache`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/time-leave/calendar-punch.util.ts \
  backend/src/modules/time-leave/__tests__/calendar-punch.util.spec.ts
git commit -m "feat(time-leave): add calendar punch pairing and grouping util"
```

---

### Task 2: Enrich CalendarService day cells

**Files:**
- Modify: `backend/src/modules/time-leave/calendar.types.ts`
- Modify: `backend/src/modules/time-leave/calendar.service.ts`
- Modify: `backend/src/modules/time-leave/__tests__/calendar.service.spec.ts`

**Interfaces:**
- Consumes: `computeWorkedMinutes`, `groupPunchesByWorkerAndDate` from Task 1; `AttendancePunchEntity`
- Produces: every `CalendarDayCell` includes:
  - `punches: Array<{ id: string; punchType: 'check_in' | 'check_out'; punchedAt: string }>`
  - `workedMinutes: number`

- [ ] **Step 1: Extend types**

```typescript
// backend/src/modules/time-leave/calendar.types.ts — add:
export type CalendarDayPunch = {
  id: string;
  punchType: 'check_in' | 'check_out';
  punchedAt: string;
};

export type CalendarDayCell = {
  date: string;
  status: CalendarCellStatus;
  leaveTypeName?: string | null;
  holidayName?: string | null;
  firstIn?: string | null;
  lastOut?: string | null;
  punches: CalendarDayPunch[];
  workedMinutes: number;
};
```

- [ ] **Step 2: Write the failing service test**

In `calendar.service.spec.ts`:

1. Add `punchRepository: { createQueryBuilder: jest.Mock }` and provide `getRepositoryToken(AttendancePunchEntity)`.
2. Default `punchRepository.createQueryBuilder` to `createQbMock([])`.
3. Add test:

```typescript
it('attaches punches and workedMinutes to staff calendar days', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));

  punchRepository.createQueryBuilder.mockReturnValue(
    createQbMock([
      {
        id: 'punch-in',
        workerId,
        punchType: 'check_in',
        punchedAt: new Date('2026-08-04T09:00:00.000Z'),
      },
      {
        id: 'punch-out',
        workerId,
        punchType: 'check_out',
        punchedAt: new Date('2026-08-04T17:00:00.000Z'),
      },
    ]),
  );

  const result = await service.getMyCalendar(
    { from: '2026-08-03', to: '2026-08-09' },
    userId,
  );

  const day = result.days.find((d) => d.date === '2026-08-04');
  expect(day?.punches).toEqual([
    {
      id: 'punch-in',
      punchType: 'check_in',
      punchedAt: '2026-08-04T09:00:00.000Z',
    },
    {
      id: 'punch-out',
      punchType: 'check_out',
      punchedAt: '2026-08-04T17:00:00.000Z',
    },
  ]);
  expect(day?.workedMinutes).toBe(480);
  expect(result.days.every((d) => Array.isArray(d.punches))).toBe(true);

  jest.useRealTimers();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && pnpm exec jest src/modules/time-leave/__tests__/calendar.service.spec.ts --no-cache`

Expected: FAIL (missing provider and/or missing fields)

- [ ] **Step 4: Implement service enrichment**

In `calendar.service.ts`:

1. Inject `@InjectRepository(AttendancePunchEntity) private readonly punchRepository`.
2. Add private `loadPunches(tenantId, workerIds, from, to)`:

```typescript
private async loadPunches(
  tenantId: string,
  workerIds: string[],
  from: string,
  to: string,
): Promise<AttendancePunchEntity[]> {
  if (workerIds.length === 0) {
    return [];
  }
  // Inclusive day bounds in UTC wall — punches are timestamptz; use
  // from 00:00 UTC of `from` through end of `to` day (+1 day exclusive)
  // then rely on workDateInTimezone for final bucketing.
  const fromAt = new Date(`${from}T00:00:00.000Z`);
  const toExclusive = new Date(`${to}T00:00:00.000Z`);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  // Widen by ±1 day so timezone shifts near range edges still load.
  fromAt.setUTCDate(fromAt.getUTCDate() - 1);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

  return this.punchRepository
    .createQueryBuilder('punch')
    .where('punch.tenantId = :tenantId', { tenantId })
    .andWhere('punch.workerId IN (:...workerIds)', { workerIds })
    .andWhere('punch.punchedAt >= :fromAt', { fromAt })
    .andWhere('punch.punchedAt < :toExclusive', { toExclusive })
    .orderBy('punch.punchedAt', 'ASC')
    .getMany();
}
```

3. Add helper to map day punches:

```typescript
private dayPunchFields(
  workerId: string,
  date: string,
  grouped: Map<string, PunchLike[]>,
): { punches: CalendarDayPunch[]; workedMinutes: number } {
  const list = grouped.get(`${workerId}:${date}`) ?? [];
  return {
    punches: list.map((p) => ({
      id: p.id,
      punchType: p.punchType as 'check_in' | 'check_out',
      punchedAt: p.punchedAt.toISOString(),
    })),
    workedMinutes: computeWorkedMinutes(list),
  };
}
```

4. In `buildStaffCalendar` and `getTeamCalendar`, load punches in the existing `Promise.all` (or after worker list is known for team), build `timezoneByWorkerId`, call `groupPunchesByWorkerAndDate`, and spread `...this.dayPunchFields(...)` into every cell return object.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && pnpm exec jest src/modules/time-leave/__tests__/calendar.service.spec.ts src/modules/time-leave/__tests__/calendar-punch.util.spec.ts --no-cache`

Expected: PASS (update any existing assertions that construct cells if they break on missing fields — cells always include punches/minutes now)

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/time-leave/calendar.types.ts \
  backend/src/modules/time-leave/calendar.service.ts \
  backend/src/modules/time-leave/__tests__/calendar.service.spec.ts
git commit -m "feat(time-leave): attach punches and worked minutes to calendar cells"
```

---

### Task 3: Frontend types, format helper, i18n

**Files:**
- Modify: `frontend/src/libs/api/calendars.ts`
- Create: `frontend/src/libs/datetime/format-worked-minutes.ts`
- Create: `frontend/src/libs/datetime/format-worked-minutes.test.ts`
- Modify: `frontend/src/locales/en.json`

**Interfaces:**
- Produces:
  - `CalendarDayPunch` type on API client
  - `formatWorkedMinutes(minutes: number): string` → `"7h 30m"`
  - `isDayInProgress(args: { date: string; today: string; punches: Array<{ punchType: string }> }): boolean`
  - Locale keys listed below

- [ ] **Step 1: Write the failing Vitest**

```typescript
// frontend/src/libs/datetime/format-worked-minutes.test.ts
import { describe, expect, it } from 'vitest';
import {
  formatWorkedMinutes,
  isDayInProgress,
} from './format-worked-minutes';

describe('formatWorkedMinutes', () => {
  it('formats hours and minutes', () => {
    expect(formatWorkedMinutes(450)).toBe('7h 30m');
    expect(formatWorkedMinutes(0)).toBe('0h 0m');
    expect(formatWorkedMinutes(59)).toBe('0h 59m');
  });
});

describe('isDayInProgress', () => {
  it('is true when today and last punch is unpaired check_in', () => {
    expect(
      isDayInProgress({
        date: '2026-08-09',
        today: '2026-08-09',
        punches: [
          { punchType: 'check_in' },
          { punchType: 'check_out' },
          { punchType: 'check_in' },
        ],
      }),
    ).toBe(true);
  });

  it('is false when not today or day closed with check_out', () => {
    expect(
      isDayInProgress({
        date: '2026-08-08',
        today: '2026-08-09',
        punches: [{ punchType: 'check_in' }],
      }),
    ).toBe(false);
    expect(
      isDayInProgress({
        date: '2026-08-09',
        today: '2026-08-09',
        punches: [
          { punchType: 'check_in' },
          { punchType: 'check_out' },
        ],
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/libs/datetime/format-worked-minutes.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement helper + types + strings**

```typescript
// frontend/src/libs/datetime/format-worked-minutes.ts
export function formatWorkedMinutes(minutes: number): string {
  const safe = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}h ${m}m`;
}

export function isDayInProgress(args: {
  date: string;
  today: string;
  punches: Array<{ punchType: string }>;
}): boolean {
  if (args.date !== args.today || args.punches.length === 0) {
    return false;
  }
  return args.punches[args.punches.length - 1]?.punchType === 'check_in';
}
```

In `calendars.ts`, extend day objects:

```typescript
export type CalendarDayPunch = {
  id: string;
  punchType: 'check_in' | 'check_out';
  punchedAt: string;
};

// On each day / cell:
punches: CalendarDayPunch[];
workedMinutes: number;
```

Add to **both** `EmployeeCalendar` and `ManagerCalendar` in `en.json`:

```json
"detail_check_in": "Check-in",
"detail_check_out": "Check-out",
"detail_total": "Total · {duration}",
"detail_in_progress": "In progress",
"detail_no_punches": "No punches this day",
"detail_punch_line": "{label} · {time}"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/libs/datetime/format-worked-minutes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/libs/api/calendars.ts \
  frontend/src/libs/datetime/format-worked-minutes.ts \
  frontend/src/libs/datetime/format-worked-minutes.test.ts \
  frontend/src/locales/en.json
git commit -m "feat(frontend): add calendar punch detail types and duration helpers"
```

---

### Task 4: CalendarDayDetailPopover component

**Files:**
- Create: `frontend/src/components/calendar/CalendarDayDetailPopover.tsx`
- Create: `frontend/src/components/calendar/CalendarDayDetailPopover.test.tsx`

**Interfaces:**
- Consumes: `CalendarDayPunch`, `CalendarCellStatus` from `@/libs/api/calendars`; `formatInTimezone` from `@/libs/datetime/format-in-timezone`; `formatWorkedMinutes`, `isDayInProgress` from Task 3
- Produces:
  - `CalendarDayDetailContent` — presentational body (testable)
  - `CalendarDayDetailTrigger` — wraps children; hover (desktop) / tap (touch); Esc + outside click close; single open via optional shared close callback

Props for content:

```typescript
type CalendarDayDetailContentProps = {
  date: string;
  today: string;
  timezone: string;
  status: CalendarCellStatus;
  statusLabel: string;
  workerName?: string;
  holidayName?: string | null;
  leaveTypeName?: string | null;
  punches: CalendarDayPunch[];
  workedMinutes: number;
  labels: {
    checkIn: string;
    checkOut: string;
    total: (duration: string) => string;
    inProgress: string;
    noPunches: string;
    punchLine: (label: string, time: string) => string;
  };
};
```

- [ ] **Step 1: Write the failing component test**

```tsx
// frontend/src/components/calendar/CalendarDayDetailPopover.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalendarDayDetailContent } from './CalendarDayDetailPopover';

const labels = {
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  total: (d: string) => `Total · ${d}`,
  inProgress: 'In progress',
  noPunches: 'No punches this day',
  punchLine: (label: string, time: string) => `${label} · ${time}`,
};

describe('CalendarDayDetailContent', () => {
  it('lists punches and total hours', () => {
    render(
      <CalendarDayDetailContent
        date="2026-08-08"
        today="2026-08-09"
        timezone="UTC"
        status="out"
        statusLabel="Out"
        punches={[
          {
            id: '1',
            punchType: 'check_in',
            punchedAt: '2026-08-08T09:00:00.000Z',
          },
          {
            id: '2',
            punchType: 'check_out',
            punchedAt: '2026-08-08T17:00:00.000Z',
          },
        ]}
        workedMinutes={480}
        labels={labels}
      />,
    );
    expect(screen.getByText(/Check-in/)).toBeInTheDocument();
    expect(screen.getByText(/Check-out/)).toBeInTheDocument();
    expect(screen.getByText('Total · 8h 0m')).toBeInTheDocument();
  });

  it('shows empty copy when no punches', () => {
    render(
      <CalendarDayDetailContent
        date="2026-08-14"
        today="2026-08-09"
        timezone="UTC"
        status="holiday"
        statusLabel="Holiday"
        holidayName="Independence Day"
        punches={[]}
        workedMinutes={0}
        labels={labels}
      />,
    );
    expect(screen.getByText('No punches this day')).toBeInTheDocument();
    expect(screen.getByText(/Independence Day/)).toBeInTheDocument();
  });

  it('shows In progress for open check-in today', () => {
    render(
      <CalendarDayDetailContent
        date="2026-08-09"
        today="2026-08-09"
        timezone="UTC"
        status="in"
        statusLabel="In"
        punches={[
          {
            id: '1',
            punchType: 'check_in',
            punchedAt: '2026-08-09T09:00:00.000Z',
          },
        ]}
        workedMinutes={0}
        labels={labels}
      />,
    );
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm exec vitest run src/components/calendar/CalendarDayDetailPopover.test.tsx`

Expected: FAIL

- [ ] **Step 3: Implement component**

Implement `CalendarDayDetailContent` + `CalendarDayDetailTrigger` in one file:

- Content: header (date + optional workerName), statusLabel, optional holiday/leave lines, `<ul>` of punches with times via `formatInTimezone(iso, timezone, { hour: '2-digit', minute: '2-digit' })`, footer total or in-progress.
- Trigger: 
  - `onMouseEnter` / `onMouseLeave` with ~150ms close delay (clear on re-enter panel or trigger)
  - `onClick` toggles on coarse pointer (`window.matchMedia('(hover: none)')` or `pointerType === 'touch'`)
  - `tabIndex={0}`, `onKeyDown` Enter/Space toggles
  - `role="button"` on the trigger wrapper when interactive
  - Panel: absolutely positioned near trigger (`position: fixed` from `getBoundingClientRect`), `z-50`, white card with border/shadow matching existing calendar chrome; `onMouseEnter` keeps open
  - Document `keydown` Esc + `pointerdown` outside to close
  - Prefer a small self-contained panel over fighting PrimeReact `OverlayPanel` click-only API (spec allows “or equivalent”)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && pnpm exec vitest run src/components/calendar/CalendarDayDetailPopover.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/calendar/CalendarDayDetailPopover.tsx \
  frontend/src/components/calendar/CalendarDayDetailPopover.test.tsx
git commit -m "feat(frontend): add calendar day punch detail popover"
```

---

### Task 5: Wire StaffMonthHeatmap + employee page

**Files:**
- Modify: `frontend/src/components/calendar/StaffMonthHeatmap.tsx`
- Modify: `frontend/src/app/[locale]/(auth)/employee/calendar/page.tsx`

**Interfaces:**
- Consumes: `CalendarDayDetailTrigger` / content labels from Task 4; `data.timezone` from page
- Produces: hovering/tapping a day cell opens punch detail

- [ ] **Step 1: Extend heatmap props**

```typescript
type StaffMonthHeatmapProps = {
  days: StaffCalendarResponse['days'];
  year: number;
  monthIndex: number;
  timezone: string;
  today?: string; // default: local YYYY-MM-DD via format in timezone of `timezone`
};
```

Compute `today` with existing `formatInTimezone` / `Intl` `en-CA` in the worker timezone if not passed.

- [ ] **Step 2: Wrap each day cell**

Replace the bare day `<div title=…>` with `CalendarDayDetailTrigger` wrapping the coloured cell. Build labels from `useTranslations('EmployeeCalendar')`:

```typescript
labels={{
  checkIn: t('detail_check_in'),
  checkOut: t('detail_check_out'),
  total: (duration) => t('detail_total', { duration }),
  inProgress: t('detail_in_progress'),
  noPunches: t('detail_no_punches'),
  punchLine: (label, time) => t('detail_punch_line', { label, time }),
}}
```

Pass `punches: cell?.punches ?? []`, `workedMinutes: cell?.workedMinutes ?? 0`, `status`, status label via existing `status_*` keys, holiday/leave names. Remove native `title` attribute (detail replaces it).

- [ ] **Step 3: Update employee page**

```tsx
<StaffMonthHeatmap
  days={data.days}
  year={cursor.getFullYear()}
  monthIndex={cursor.getMonth()}
  timezone={data.timezone}
/>
```

- [ ] **Step 4: Smoke — open detail from cell (optional Vitest)**

If practical, add a short test in `StaffMonthHeatmap` or extend popover tests: render one day with punches, fire `mouseEnter`, expect total text. Skip if Trigger needs complex matchMedia mocks — Task 4 coverage is enough; manually verify in browser.

- [ ] **Step 5: Manual check**

Run frontend + backend; open `/employee/calendar` month view; hover a day with punches (e.g. green “In”/“Out”); confirm list + total. Tap on narrow viewport.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/calendar/StaffMonthHeatmap.tsx \
  frontend/src/app/[locale]/\(auth\)/employee/calendar/page.tsx
git commit -m "feat(frontend): show punch detail on employee calendar days"
```

---

### Task 6: Wire TeamMonthHeatmap

**Files:**
- Modify: `frontend/src/components/calendar/TeamMonthHeatmap.tsx`

**Interfaces:**
- Consumes: same popover as Task 4; per-worker `timezone` from `TeamCalendarResponse.workers[]`
- Produces: manager team cells show the same punch detail (include `workerName`)

- [ ] **Step 1: Wrap team cells**

On each status swatch `<td>` / inner div:

- Make the interactive target fill the cell (`min-h` / full cell padding) so the 6×6 swatch is easier to hit.
- Wrap with `CalendarDayDetailTrigger`.
- Pass `workerName={worker.workerName}`, `timezone={worker.timezone}`, punches/minutes from the cell (default `[]` / `0`).
- Labels from `useTranslations('ManagerCalendar')` using the same key names as Task 3.
- Status label via `t(\`status_${status}\`)` pattern already used by legend.

- [ ] **Step 2: Manual check**

Open `/manager/calendar` month view; hover a report’s day with attendance; confirm worker name + punches + total.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/calendar/TeamMonthHeatmap.tsx
git commit -m "feat(frontend): show punch detail on team calendar cells"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| `punches[]` + `workedMinutes` on staff/team cells | 1–2 |
| Pairing hours rule + unpaired in = 0 | 1 |
| Batch load punches; group by worker timezone work date | 1–2 |
| Enrich existing calendar endpoints only | 2 |
| Shared day detail popover | 4 |
| Hover desktop / tap mobile / Esc / focus | 4–5 |
| Employee + manager heatmaps | 5–6 |
| In progress footer for open check-in today | 3–4 |
| Empty punches message + holiday/leave context | 4 |
| `en.json` only | 3 |
| Backend + frontend tests | 1, 2, 3, 4 |

## Self-review notes

- No lazy punch fetch; no correction UI; no People Ops-only surfaces.
- Type names aligned: `CalendarDayPunch`, `workedMinutes`, `punches`.
- OverlayPanel not mandatory — self-positioned panel allowed by spec “or equivalent”.
