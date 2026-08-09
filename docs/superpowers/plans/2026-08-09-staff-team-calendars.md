# Staff & Team Calendars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship working employee and manager calendars with composed `/api/v1/calendars` endpoints (holidays + leave + attendance), default week ranges, and full-month heatmaps.

**Architecture:** Add a dedicated `CalendarService` that composes `attendance_day_summaries`, leave requests, and holidays into UI-ready day cells (with status precedence and future-date `planned` rule). Extend `CalendarController` with `me`, `staff/:workerId`, and `team`. Frontends call these with shared `weekRange` / `monthRange` helpers — never send `month`.

**Tech Stack:** NestJS 10, TypeORM, class-validator, Jest; Next.js 16, PrimeReact, Vitest, next-intl (`en.json` only), Lucide.

**Spec:** `docs/superpowers/specs/2026-08-09-staff-team-calendars-design.md`

## Global Constraints

- API base `/api/v1/`, envelope `{ data, meta, errors }`
- Every mutation → `audit_log` (these endpoints are read-only GETs — no audit writes)
- RBAC + row scope server-side (own / team / division / all)
- No country hard-coding (`if country === 'PK'`)
- English only — edit `frontend/src/locales/en.json` only; do not edit `ar.json` / `fr.json`
- Lucide icons only; no emoji
- `forbidNonWhitelisted: true` — never accept `month` query param
- Conventional Commits: `feat(time-leave): …`, `feat(frontend): …`, `docs(time-leave): …`
- Max date span **62 days**; default range when both `from`/`to` omitted = **current week Mon–Sun** in acting worker timezone (fallback `UTC` if worker timezone null — not a country branch)

---

## File map

### Backend create

| File | Responsibility |
|---|---|
| `backend/src/modules/time-leave/calendar-range.util.ts` | Parse/default `from`/`to`, week/month helpers, span validation |
| `backend/src/modules/time-leave/calendar-cell.util.ts` | Pure status precedence + future-date rule |
| `backend/src/modules/time-leave/calendar.types.ts` | Shared response/cell TypeScript types |
| `backend/src/modules/time-leave/dto/calendar.dto.ts` | `QueryCalendarRangeDto` (`from?`, `to?`, `divisionId?`) |
| `backend/src/modules/time-leave/calendar.service.ts` | Compose staff/me/team calendar payloads |
| `backend/src/modules/time-leave/__tests__/calendar-range.util.spec.ts` | Range util unit tests |
| `backend/src/modules/time-leave/__tests__/calendar-cell.util.spec.ts` | Cell precedence unit tests |
| `backend/src/modules/time-leave/__tests__/calendar.service.spec.ts` | Service unit tests (RBAC, defaults, team scope) |

### Backend modify

| File | Change |
|---|---|
| `backend/src/modules/time-leave/calendar.controller.ts` | Add `me`, `staff/:workerId`, `team`; keep legacy `staff` |
| `backend/src/modules/time-leave/time-leave.module.ts` | Register `CalendarService` |
| `docs/project-requirements/api-specification.md` | Update §4.6 to match new paths |

### Frontend create

| File | Responsibility |
|---|---|
| `frontend/src/libs/datetime/calendar-range.ts` | `weekRange`, `monthRange` |
| `frontend/src/libs/datetime/calendar-range.test.ts` | Vitest for ranges |
| `frontend/src/libs/api/calendars.ts` | `getMyCalendar`, `getStaffCalendar`, `getTeamCalendar` |
| `frontend/src/components/calendar/CalendarHeatmapLegend.tsx` | Status colour legend |
| `frontend/src/components/calendar/StaffMonthHeatmap.tsx` | Personal month grid |
| `frontend/src/components/calendar/TeamMonthHeatmap.tsx` | Workers × days grid |

### Frontend modify

| File | Change |
|---|---|
| `frontend/src/app/[locale]/(auth)/employee/calendar/page.tsx` | Replace placeholder with real calendar |
| `frontend/src/app/[locale]/(auth)/manager/calendar/page.tsx` | Fix `from`/`to`; use team heatmap API |
| `frontend/src/libs/api/leave.ts` | Remove `month` from `getTeamLeaveCalendar` params |
| `frontend/src/locales/en.json` | Expand `EmployeeCalendar` / `ManagerCalendar` strings |

### Note on work weeks

`work_week_patterns` is in the DB design but **not implemented as an entity yet**. Use a pure helper `isDefaultWorkingDay(isoDate)` = Mon–Fri (ISO weekday 1–5). Do **not** add country `if`s. Document a one-line TODO in `calendar-cell.util.ts` to swap in pattern lookup when the entity exists.

---

### Task 1: Calendar range utilities (backend)

**Files:**
- Create: `backend/src/modules/time-leave/calendar-range.util.ts`
- Test: `backend/src/modules/time-leave/__tests__/calendar-range.util.spec.ts`

**Interfaces:**
- Produces: `resolveCalendarRange(from?, to?, now, timeZone) → { from: string; to: string }`, `assertCalendarRangeSpan(from, to)`, `enumerateDates(from, to) → string[]`, `MAX_CALENDAR_SPAN_DAYS = 62`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/src/modules/time-leave/__tests__/calendar-range.util.spec.ts
import { BadRequestException } from '@nestjs/common';
import {
  assertCalendarRangeSpan,
  enumerateDates,
  resolveCalendarRange,
} from '../calendar-range.util';

describe('calendar-range.util', () => {
  it('defaults to Mon–Sun week containing now in timezone', () => {
    // Wednesday 2026-08-05 12:00 UTC → week Mon 2026-08-03 .. Sun 2026-08-09 in UTC
    const now = new Date('2026-08-05T12:00:00.000Z');
    const range = resolveCalendarRange(undefined, undefined, now, 'UTC');
    expect(range).toEqual({ from: '2026-08-03', to: '2026-08-09' });
  });

  it('echoes explicit from/to', () => {
    expect(
      resolveCalendarRange('2026-08-01', '2026-08-31', new Date(), 'UTC'),
    ).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('rejects span over 62 days', () => {
    expect(() =>
      assertCalendarRangeSpan('2026-01-01', '2026-03-15'),
    ).toThrow(BadRequestException);
  });

  it('enumerates inclusive dates', () => {
    expect(enumerateDates('2026-08-01', '2026-08-03')).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pnpm exec jest src/modules/time-leave/__tests__/calendar-range.util.spec.ts -v`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement utilities**

```typescript
// backend/src/modules/time-leave/calendar-range.util.ts
import { BadRequestException } from '@nestjs/common';
import { workDateInTimezone } from './time-leave-scope.util';

export const MAX_CALENDAR_SPAN_DAYS = 62;

function parseIsoDate(value: string): Date {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException({
      code: 'INVALID_DATE',
      message: `Invalid date: ${value}`,
    });
  }
  return d;
}

/** Monday of the week containing `isoDate` (ISO week, Mon=start). */
function mondayOfWeek(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const offset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const d = parseIsoDate(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function resolveCalendarRange(
  from: string | undefined,
  to: string | undefined,
  now: Date,
  timeZone: string,
): { from: string; to: string } {
  if (!from && !to) {
    const today = workDateInTimezone(now, timeZone);
    const monday = mondayOfWeek(today);
    return { from: monday, to: addDays(monday, 6) };
  }
  if (!from || !to) {
    throw new BadRequestException({
      code: 'INVALID_RANGE',
      message: 'Both from and to are required when either is provided',
    });
  }
  if (from > to) {
    throw new BadRequestException({
      code: 'INVALID_RANGE',
      message: 'from must be on or before to',
    });
  }
  return { from, to };
}

export function assertCalendarRangeSpan(from: string, to: string): void {
  const start = parseIsoDate(from).getTime();
  const end = parseIsoDate(to).getTime();
  const days = Math.floor((end - start) / 86_400_000) + 1;
  if (days > MAX_CALENDAR_SPAN_DAYS) {
    throw new BadRequestException({
      code: 'RANGE_TOO_LARGE',
      message: `Calendar range cannot exceed ${MAX_CALENDAR_SPAN_DAYS} days`,
    });
  }
}

export function enumerateDates(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd backend && pnpm exec jest src/modules/time-leave/__tests__/calendar-range.util.spec.ts -v`

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/time-leave/calendar-range.util.ts \
  backend/src/modules/time-leave/__tests__/calendar-range.util.spec.ts
git commit -m "feat(time-leave): add calendar date-range helpers"
```

---

### Task 2: Calendar cell status resolver (backend)

**Files:**
- Create: `backend/src/modules/time-leave/calendar.types.ts`
- Create: `backend/src/modules/time-leave/calendar-cell.util.ts`
- Test: `backend/src/modules/time-leave/__tests__/calendar-cell.util.spec.ts`

**Interfaces:**
- Produces: type `CalendarCellStatus`; `resolveCellStatus(input) → CalendarCellStatus`; `isDefaultWorkingDay(isoDate) → boolean`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/src/modules/time-leave/__tests__/calendar-cell.util.spec.ts
import { resolveCellStatus, isDefaultWorkingDay } from '../calendar-cell.util';

describe('calendar-cell.util', () => {
  it('treats Sat/Sun as non-working by default', () => {
    expect(isDefaultWorkingDay('2026-08-08')).toBe(false); // Sat
    expect(isDefaultWorkingDay('2026-08-07')).toBe(true); // Fri
  });

  it('prefers holiday over leave and attendance', () => {
    expect(
      resolveCellStatus({
        date: '2026-08-03',
        today: '2026-08-09',
        isHoliday: true,
        hasApprovedLeave: true,
        attendanceStatus: 'in',
      }),
    ).toBe('holiday');
  });

  it('uses planned for future working days', () => {
    expect(
      resolveCellStatus({
        date: '2026-08-10',
        today: '2026-08-09',
        isHoliday: false,
        hasApprovedLeave: false,
        attendanceStatus: null,
      }),
    ).toBe('planned');
  });

  it('never marks future dates missing', () => {
    expect(
      resolveCellStatus({
        date: '2026-08-11',
        today: '2026-08-09',
        isHoliday: false,
        hasApprovedLeave: false,
        attendanceStatus: 'missing',
      }),
    ).toBe('planned');
  });

  it('uses attendance for past/today when present', () => {
    expect(
      resolveCellStatus({
        date: '2026-08-09',
        today: '2026-08-09',
        isHoliday: false,
        hasApprovedLeave: false,
        attendanceStatus: 'out',
      }),
    ).toBe('out');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd backend && pnpm exec jest src/modules/time-leave/__tests__/calendar-cell.util.spec.ts -v`

- [ ] **Step 3: Implement types + resolver**

```typescript
// backend/src/modules/time-leave/calendar.types.ts
export type CalendarCellStatus =
  | 'in'
  | 'out'
  | 'on_leave'
  | 'missing'
  | 'incomplete'
  | 'holiday'
  | 'non_working'
  | 'planned';

export type CalendarDayCell = {
  date: string;
  status: CalendarCellStatus;
  leaveTypeName?: string | null;
  holidayName?: string | null;
  firstIn?: string | null;
  lastOut?: string | null;
};
```

```typescript
// backend/src/modules/time-leave/calendar-cell.util.ts
import type { CalendarCellStatus } from './calendar.types';
import type { AttendanceDayStatus } from './enums/attendance.enum';

/** TODO: replace with work_week_patterns lookup when entity exists. */
export function isDefaultWorkingDay(isoDate: string): boolean {
  const dow = new Date(`${isoDate}T00:00:00.000Z`).getUTCDay(); // 0=Sun
  return dow >= 1 && dow <= 5;
}

export function resolveCellStatus(input: {
  date: string;
  today: string;
  isHoliday: boolean;
  hasApprovedLeave: boolean;
  attendanceStatus: AttendanceDayStatus | string | null;
}): CalendarCellStatus {
  const isFuture = input.date > input.today;

  if (input.isHoliday) {
    return 'holiday';
  }
  if (input.hasApprovedLeave) {
    return 'on_leave';
  }
  if (!isDefaultWorkingDay(input.date)) {
    return 'non_working';
  }
  if (isFuture) {
    return 'planned';
  }
  if (input.attendanceStatus) {
    return input.attendanceStatus as CalendarCellStatus;
  }
  return 'missing';
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/time-leave/calendar.types.ts \
  backend/src/modules/time-leave/calendar-cell.util.ts \
  backend/src/modules/time-leave/__tests__/calendar-cell.util.spec.ts
git commit -m "feat(time-leave): add calendar cell status precedence"
```

---

### Task 3: Calendar DTOs + CalendarService (staff / me)

**Files:**
- Create: `backend/src/modules/time-leave/dto/calendar.dto.ts`
- Create: `backend/src/modules/time-leave/calendar.service.ts`
- Modify: `backend/src/modules/time-leave/time-leave.module.ts`
- Test: `backend/src/modules/time-leave/__tests__/calendar.service.spec.ts`

**Interfaces:**
- Consumes: `resolveCalendarRange`, `assertCalendarRangeSpan`, `enumerateDates`, `resolveCellStatus`
- Produces: `CalendarService.getMyCalendar(query, actorUserId)`, `getStaffCalendar(workerId, query, actorUserId)` → staff response shape from spec

- [ ] **Step 1: Write failing service tests (subset)**

```typescript
// Key cases in calendar.service.spec.ts
it('getMyCalendar defaults to current week when from/to omitted', async () => { /* mock repos; expect from/to Mon–Sun */ });
it('getStaffCalendar forbids employee viewing another worker', async () => { /* expect ForbiddenException */ });
it('marks holiday days as holiday in cells', async () => { /* holiday fixture on date inside range */ });
```

Wire mocks like `leave.service.spec.ts`: `RbacService`, `WorkerEntity` repo, `LeaveRequestEntity` repo (with `createQueryBuilder` chain), `HolidayEntity` repo, `AttendanceDaySummaryEntity` repo, `LeaveTypeEntity` repo.

- [ ] **Step 2: Run — expect FAIL** (CalendarService missing)

- [ ] **Step 3: Add DTO**

```typescript
// backend/src/modules/time-leave/dto/calendar.dto.ts
import {
  StringFieldOptional,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';

export class QueryCalendarRangeDto {
  @StringFieldOptional()
  from?: string;

  @StringFieldOptional()
  to?: string;

  @UUIDFieldOptional()
  divisionId?: string;
}
```

- [ ] **Step 4: Implement CalendarService.getMyCalendar / getStaffCalendar**

Skeleton responsibilities:

1. Resolve acting worker + timezone (`worker.timezone ?? 'UTC'`).
2. `resolveCalendarRange` + `assertCalendarRangeSpan`.
3. Load holidays overlapping range for worker `countryCode` (same join pattern as `LeaveService.staffCalendar`).
4. Load leave requests overlapping range for worker (approved + submitted); resolve leave type names.
5. Load `attendance_day_summaries` for worker in range.
6. For each date in `enumerateDates`, call `resolveCellStatus` with today = `workDateInTimezone(new Date(), tz)`.
7. Return `{ from, to, timezone, days, leave, holidays }` per spec.

Inject repositories via constructor; register in `TimeLeaveModule.providers` + export if needed.

- [ ] **Step 5: Run tests — PASS**

Run: `cd backend && pnpm exec jest src/modules/time-leave/__tests__/calendar.service.spec.ts -v`

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/time-leave/dto/calendar.dto.ts \
  backend/src/modules/time-leave/calendar.service.ts \
  backend/src/modules/time-leave/time-leave.module.ts \
  backend/src/modules/time-leave/__tests__/calendar.service.spec.ts
git commit -m "feat(time-leave): add CalendarService staff and me calendar"
```

---

### Task 4: Team calendar composition + controller routes

**Files:**
- Modify: `backend/src/modules/time-leave/calendar.service.ts`
- Modify: `backend/src/modules/time-leave/calendar.controller.ts`
- Modify: `backend/src/modules/time-leave/__tests__/calendar.service.spec.ts`

**Interfaces:**
- Produces: `CalendarService.getTeamCalendar(query, actorUserId)` → `{ from, to, days, workers }`
- HTTP: `GET /api/v1/calendars/me`, `GET /api/v1/calendars/staff/:workerId`, `GET /api/v1/calendars/team`, keep `GET /api/v1/calendars/staff`

- [ ] **Step 1: Extend failing tests**

```typescript
it('getTeamCalendar returns only direct reports for manager', async () => { /* … */ });
it('getTeamCalendar includes attendance cell for past day', async () => { /* … */ });
```

- [ ] **Step 2: Implement getTeamCalendar**

1. Auth context; if not People Ops/admin, require acting worker and query workers where `managerId = actingWorkerId` (plus self optional — include self for consistency with leave team calendar).
2. Optional `divisionId` filter.
3. Bulk-load leave, holidays (by unique country codes), attendance summaries for all worker IDs in range.
4. Build `days[]` holiday flags (union of holidays across countries or per dominant — prefer per-worker cells for holiday; top-level `days[].isHoliday` true if any active holiday on that date for any included country).
5. Per worker, build `cells[]` with precedence.

- [ ] **Step 3: Update CalendarController**

```typescript
// Add to calendar.controller.ts — inject CalendarService
@Get('me')
@Roles(...CALENDAR_ROLES)
@ApiOperation({ summary: 'Own staff calendar with attendance heatmap cells' })
me(@Query() query: QueryCalendarRangeDto, @CurrentUserSession() session: CurrentUserSession) {
  return this.calendarService.getMyCalendar(query, session.user.id);
}

@Get('staff/:workerId')
@Roles(...CALENDAR_ROLES)
staffById(
  @Param('workerId') workerId: string,
  @Query() query: QueryCalendarRangeDto,
  @CurrentUserSession() session: CurrentUserSession,
) {
  return this.calendarService.getStaffCalendar(workerId, query, session.user.id);
}

@Get('team')
@Roles(
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.SUPER_ADMIN,
)
@ApiOperation({ summary: 'Team calendar heatmap (leave + attendance)' })
team(@Query() query: QueryCalendarRangeDto, @CurrentUserSession() session: CurrentUserSession) {
  return this.calendarService.getTeamCalendar(query, session.user.id);
}

// Keep existing GET staff → leaveService.staffCalendar (legacy)
```

Import `Param`, `QueryCalendarRangeDto`, `CalendarService`.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Manual smoke (optional)**

```bash
# With backend running + session cookie:
curl -s 'http://localhost:8000/api/v1/calendars/me' -H 'Cookie: …'
curl -s 'http://localhost:8000/api/v1/calendars/team?from=2026-08-01&to=2026-08-31' -H 'Cookie: …'
# Expect 400 if month= is sent to a strict DTO endpoint
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/time-leave/calendar.service.ts \
  backend/src/modules/time-leave/calendar.controller.ts \
  backend/src/modules/time-leave/__tests__/calendar.service.spec.ts
git commit -m "feat(time-leave): add team calendar heatmap API routes"
```

---

### Task 5: Update API specification doc

**Files:**
- Modify: `docs/project-requirements/api-specification.md` (§4.6)

- [ ] **Step 1: Replace §4.6 table with**

| Method | Path | Description |
|---|---|---|
| GET | `/calendars/me` | Own calendar: holidays, leave, attendance cells (`from`/`to` optional → current week) |
| GET | `/calendars/staff/{workerId}` | Staff calendar for worker (RBAC) |
| GET | `/calendars/team` | Team heatmap (`from`/`to`, optional `divisionId`) |
| GET | `/calendars/staff` | Legacy holidays + leave only (deprecated) |
| GET | `/holidays` | Holidays for country/year (unchanged if already listed) |

Note query rules: `from`/`to` ISO dates; max 62 days; unknown `month` rejected.

- [ ] **Step 2: Commit**

```bash
git add docs/project-requirements/api-specification.md
git commit -m "docs(time-leave): document calendars me/staff/team endpoints"
```

---

### Task 6: Frontend date-range helpers

**Files:**
- Create: `frontend/src/libs/datetime/calendar-range.ts`
- Create: `frontend/src/libs/datetime/calendar-range.test.ts`

**Interfaces:**
- Produces: `weekRange(anchor: Date) → { from: string; to: string }`, `monthRange(anchor: Date) → { from: string; to: string }`, `isoDate(d: Date) → string`

- [ ] **Step 1: Write failing Vitest**

```typescript
// frontend/src/libs/datetime/calendar-range.test.ts
import { describe, expect, it } from 'vitest';
import { monthRange, weekRange } from './calendar-range';

describe('calendar-range', () => {
  it('weekRange returns Mon–Sun for a Wednesday', () => {
    expect(weekRange(new Date(2026, 7, 5))).toEqual({
      from: '2026-08-03',
      to: '2026-08-09',
    });
  });

  it('monthRange returns first–last day of month', () => {
    expect(monthRange(new Date(2026, 7, 15))).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd frontend && pnpm exec vitest run src/libs/datetime/calendar-range.test.ts`

- [ ] **Step 3: Implement**

```typescript
// frontend/src/libs/datetime/calendar-range.ts
function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function weekRange(anchor: Date): { from: string; to: string } {
  const day = anchor.getDay(); // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + mondayOffset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { from: isoDate(monday), to: isoDate(sunday) };
}

export function monthRange(anchor: Date): { from: string; to: string } {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: isoDate(from), to: isoDate(to) };
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/libs/datetime/calendar-range.ts \
  frontend/src/libs/datetime/calendar-range.test.ts
git commit -m "feat(frontend): add week and month calendar range helpers"
```

---

### Task 7: Frontend calendars API client + leave.ts cleanup

**Files:**
- Create: `frontend/src/libs/api/calendars.ts`
- Modify: `frontend/src/libs/api/leave.ts` (remove `month` from `getTeamLeaveCalendar`)

**Interfaces:**
- Produces: types matching backend responses; `getMyCalendar`, `getStaffCalendar`, `getTeamCalendar`

- [ ] **Step 1: Implement `calendars.ts`**

```typescript
// frontend/src/libs/api/calendars.ts
import { apiRequest } from '@/libs/api/client';

export type CalendarCellStatus =
  | 'in'
  | 'out'
  | 'on_leave'
  | 'missing'
  | 'incomplete'
  | 'holiday'
  | 'non_working'
  | 'planned';

export type StaffCalendarResponse = {
  from: string;
  to: string;
  timezone: string;
  days: Array<{
    date: string;
    status: CalendarCellStatus;
    leaveTypeName?: string | null;
    holidayName?: string | null;
    firstIn?: string | null;
    lastOut?: string | null;
  }>;
  leave: Array<{
    leaveRequestId: string;
    leaveTypeId: string;
    leaveTypeName?: string | null;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  holidays: Array<{
    id: string;
    name: string;
    holidayDate: string;
    countryCode: string;
    isCompanyClosure: boolean;
  }>;
};

export type TeamCalendarResponse = {
  from: string;
  to: string;
  days: Array<{ date: string; isHoliday: boolean; holidayName?: string | null }>;
  workers: Array<{
    workerId: string;
    workerName: string;
    timezone: string;
    cells: Array<{
      date: string;
      status: CalendarCellStatus;
      leaveTypeName?: string | null;
      firstIn?: string | null;
      lastOut?: string | null;
    }>;
  }>;
};

const BASE = '/api/v1/calendars';

export async function getMyCalendar(params?: { from?: string; to?: string }) {
  return apiRequest<StaffCalendarResponse>(`${BASE}/me`, { params });
}

export async function getStaffCalendar(
  workerId: string,
  params?: { from?: string; to?: string },
) {
  return apiRequest<StaffCalendarResponse>(`${BASE}/staff/${workerId}`, { params });
}

export async function getTeamCalendar(params?: {
  from?: string;
  to?: string;
  divisionId?: string;
}) {
  return apiRequest<TeamCalendarResponse>(`${BASE}/team`, { params });
}
```

- [ ] **Step 2: Fix leave client**

In `getTeamLeaveCalendar`, change params type to `{ from?: string; to?: string }` only — **delete `month?: string`**.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/libs/api/calendars.ts frontend/src/libs/api/leave.ts
git commit -m "feat(frontend): add calendars API client; drop month query"
```

---

### Task 8: Shared heatmap components + i18n

**Files:**
- Create: `frontend/src/components/calendar/CalendarHeatmapLegend.tsx`
- Create: `frontend/src/components/calendar/StaffMonthHeatmap.tsx`
- Create: `frontend/src/components/calendar/TeamMonthHeatmap.tsx`
- Modify: `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: `StaffCalendarResponse['days']`, `TeamCalendarResponse`
- Produces: presentational heatmaps + legend

- [ ] **Step 1: Add en.json keys** (under `EmployeeCalendar` / `ManagerCalendar`)

Add at least: `view_list`, `view_month`, `view_toggle`, `refresh`, `retry`, `prev`, `next`, `error_load`, `empty_title`, `empty_body`, `legend_title`, `status_in`, `status_out`, `status_on_leave`, `status_missing`, `status_incomplete`, `status_holiday`, `status_non_working`, `status_planned`, `heatmap_label`, `request_leave`, replace `empty_title` / `empty_description` away from “coming soon”.

- [ ] **Step 2: Implement colour map**

```typescript
// Inside CalendarHeatmapLegend or shared map
export const CALENDAR_STATUS_CLASS: Record<CalendarCellStatus, string> = {
  in: 'bg-emerald-100 text-emerald-800',
  out: 'bg-sky-100 text-sky-800',
  on_leave: 'bg-amber-100 text-amber-800',
  missing: 'bg-red-100 text-red-800',
  incomplete: 'bg-orange-100 text-orange-800',
  holiday: 'bg-violet-100 text-violet-800',
  non_working: 'bg-gray-100 text-gray-500',
  planned: 'bg-white text-gray-400 border border-dashed border-gray-200',
};
```

- [ ] **Step 3: StaffMonthHeatmap** — Mon–Sun grid from `days[]` for the month cursor; show day number + coloured cell.

- [ ] **Step 4: TeamMonthHeatmap** — sticky worker name column + day columns; each cell uses `CALENDAR_STATUS_CLASS[status]`; `title` attribute with leave type / times.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/calendar frontend/src/locales/en.json
git commit -m "feat(frontend): add calendar heatmap components and copy"
```

---

### Task 9: Employee calendar page

**Files:**
- Modify: `frontend/src/app/[locale]/(auth)/employee/calendar/page.tsx`

**Interfaces:**
- Consumes: `getMyCalendar`, `weekRange`, `monthRange`, `StaffMonthHeatmap`

- [ ] **Step 1: Replace placeholder page**

Behaviour:

- State: `view: 'list' | 'month'`, `cursor: Date`, loading/error/data.
- On load / cursor change:
  - month view → `getMyCalendar(monthRange(cursor))`
  - list view → `getMyCalendar(weekRange(cursor))` (default first paint = list + current week)
- UI: title, SelectButton, Refresh, prev/next, legend, heatmap or leave/holiday list, Request leave button.
- Five states: skeleton, empty, error+retry, success.

Use existing patterns from `manager/calendar/page.tsx` (PrimeReact `SelectButton`, `Skeleton`, `Button`) and Lucide `CalendarDays` / `AlertCircle` / `RefreshCw`.

- [ ] **Step 2: Manual check** — open `/en/employee/calendar` as demo employee; confirm no “coming soon”; week list loads without query params if calling API with weekRange.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/[locale]/(auth)/employee/calendar/page.tsx
git commit -m "feat(frontend): implement employee staff calendar heatmap"
```

---

### Task 10: Manager team calendar page

**Files:**
- Modify: `frontend/src/app/[locale]/(auth)/manager/calendar/page.tsx`

**Interfaces:**
- Consumes: `getTeamCalendar`, `monthRange`, `TeamMonthHeatmap`; optional `getTodayPunches` + `TeamAttendanceStrip`

- [ ] **Step 1: Replace broken fetch**

Change:

```typescript
// BEFORE (broken)
await getTeamLeaveCalendar({ month: monthParam(cursor) });

// AFTER
const { from, to } = monthRange(cursor);
const { data } = await getTeamCalendar({ from, to });
```

- [ ] **Step 2: Wire heatmap**

- Month view → `TeamMonthHeatmap` with `data.workers` / `data.days`.
- List view → flatten cells with `on_leave` (or leave segments) into list rows; keep StatusChip.
- Optional: keep today strip via existing `getTodayPunches({ scope: 'team' })`.

- [ ] **Step 3: Verify bug gone**

Open `/en/manager/calendar` as demo manager — must **not** show `property month should not exist`. Heatmap cells render for August 2026.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/[locale]/(auth)/manager/calendar/page.tsx
git commit -m "feat(frontend): fix team calendar from/to and add heatmap"
```

---

### Task 11: Verification sweep

**Files:** none required (docs/tasks optional)

- [ ] **Step 1: Backend tests**

Run: `cd backend && pnpm exec jest src/modules/time-leave/__tests__/calendar -v`  
Expected: all PASS

- [ ] **Step 2: Frontend unit tests**

Run: `cd frontend && pnpm exec vitest run src/libs/datetime/calendar-range.test.ts`  
Expected: PASS

- [ ] **Step 3: Spec success criteria checklist**

| # | Check |
|---|---|
| 1 | Employee calendar not placeholder; uses `/calendars/me` |
| 2 | Manager calendar no `month` validation error; uses `/calendars/team` |
| 3 | Omitting `from`/`to` on API returns current week |
| 4 | `?month=2026-08` on new endpoints still 400 |
| 5 | Team month shows historical attendance colours |
| 6 | Leave + holidays visible with precedence |
| 7 | Employee cannot GET another worker’s staff calendar |

- [ ] **Step 4: Optional tasks.md note**

If verifying Phase 1 checklist, leave items checked; add a short note under calendar that heatmap APIs landed 2026-08-09 (only if editing `docs/generated/tasks.md` is desired — skip if no change needed).

- [ ] **Step 5: Final commit only if docs touched**

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Default week when `from`/`to` omitted | 1, 3, 4 |
| Max 62-day span | 1, 3 |
| Reject `month` | Global + DTO has no `month` field |
| `/calendars/me`, `staff/:id`, `team` | 3, 4, 5 |
| Status precedence + future `planned` | 2, 3, 4 |
| Employee heatmap UI | 8, 9 |
| Manager team heatmap + fix | 8, 10 |
| Shared `weekRange`/`monthRange` | 6, 7 |
| Remove frontend `month` param | 7, 10 |
| Legacy `/calendars/staff` kept | 4 |
| api-specification update | 5 |
| RBAC tests | 3, 4 |
| work_week_patterns interim Mon–Fri | 2 (documented TODO) |
| People Ops holiday CRUD out of scope | — (no task) |

## Placeholder scan

No TBD / “implement later” steps without code. Work-week entity deferred with an explicit TODO comment in Task 2 only.
