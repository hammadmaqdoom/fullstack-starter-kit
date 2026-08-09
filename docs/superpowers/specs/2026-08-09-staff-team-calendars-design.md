# Staff & team calendars — design

**Date:** 2026-08-09  
**Status:** Approved for planning  
**Stories:** US-LEAVE-001 (team calendar), FR-TIME-003 / FR-TIME-005  
**Flow:** FLW-TIME-002 (where applicable)

## Problem

1. **Employee calendar** (`/employee/calendar`) is a placeholder (“Calendar coming soon”) despite backend `GET /api/v1/calendars/staff`.
2. **Manager team calendar** (`/manager/calendar`) sends `month=YYYY-MM`; backend `QueryTeamCalendarDto` requires `from` / `to` and forbids unknown properties → runtime error `property month should not exist`.
3. Specs require team leave colouring **and** live / historical attendance status (In / Out / On leave / Missing). Today’s punches API covers “today” only; there is no month heatmap API.
4. Date-range query params are inconsistent across clients; callers must not invent fields like `month`.

## Goals

- Working employee and manager calendar UIs with loading / empty / error / retry.
- New calendar endpoints that return holidays + leave + **day-level attendance** for a range.
- Full-month **attendance heatmap** (personal on employee; team grid on manager).
- Shared `from` / `to` helpers; **server default = current week** (Mon–Sun) when both omitted.
- Row-scope RBAC unchanged (own / team / division / all).

## Non-goals

- Capacitor / native wrapper, non-English UI, payroll calendars.
- New People Ops holiday CRUD UI (setup wizard seeding remains the admin path for v1).
- Changing punch check-in/out flows or Hub leave approval.
- Deprecating `GET /leave/team-calendar` in the same release (may remain as a thin leave-only alias; UIs migrate to `/calendars/*`).

---

## Approach

**Expand `/api/v1/calendars` + wire frontends.**

Keep existing attendance summaries (`attendance_day_summaries`) and leave/holiday tables as the source of truth. Add dedicated calendar read APIs that compose them into UI-ready month/week payloads. Frontends stop calling mismatched query shapes.

---

## Backend

### Endpoints

Base: `/api/v1/calendars` (versioned Nest controller already at `calendars`).

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/calendars/me` | Employee+ | Own calendar: holidays + leave + attendance cells |
| GET | `/calendars/staff/:workerId` | Per RBAC | Same shape for a single worker (assert access) |
| GET | `/calendars/team` | Manager+, People Ops, Division Head, Super Admin | Team heatmap payload (workers × days) |
| GET | `/calendars/staff` | Existing | Keep temporarily: holidays + leave only; document as legacy |

Align path names with `docs/project-requirements/api-specification.md` §4.6 (`/staff-calendar/me`, `/staff-calendar/{workerId}`). Prefer nested under `calendars`:

- `GET /calendars/me` ≡ “staff calendar me”
- `GET /calendars/staff/:workerId` ≡ “staff calendar by id”
- `GET /calendars/team` ≡ team availability + heatmap (extends leave-only team calendar)

Update api-specification §4.6 to match these paths when implementing.

### Query DTO

Shared query for all new endpoints:

| Field | Required | Rules |
|---|---|---|
| `from` | No | ISO date `YYYY-MM-DD`. If omitted with `to`, or both omitted → default range |
| `to` | No | ISO date `YYYY-MM-DD`, must be ≥ `from` |
| `divisionId` | No | Team endpoint only; filter workers |

**Default range:** when both `from` and `to` are omitted, use **current week Monday 00:00–Sunday** in the **acting worker’s timezone** (fallback `Asia/Karachi` only if worker has no timezone — resolve via existing worker timezone field; never hard-code country branches).

**Max span:** reject ranges longer than **62 days** (Bad Request) to protect heatmap queries.

**Validation:** `forbidNonWhitelisted: true` — do **not** accept `month`.

### Response shapes

#### Staff / me (`CalendarStaffResponse`)

```ts
{
  from: string; // echo effective range
  to: string;
  timezone: string;
  days: Array<{
    date: string;
    status:
      | 'in'
      | 'out'
      | 'on_leave'
      | 'missing'
      | 'incomplete'
      | 'holiday'
      | 'non_working'
      | 'planned';
    leaveTypeName?: string | null;
    holidayName?: string | null;
    firstIn?: string | null;  // ISO timestamptz
    lastOut?: string | null;
  }>;
  leave: Array<{
    leaveRequestId: string;
    leaveTypeId: string;
    leaveTypeName?: string | null;
    startDate: string;
    endDate: string;
    status: string; // approved | submitted
  }>;
  holidays: Array<{
    id: string;
    name: string;
    holidayDate: string;
    countryCode: string;
    isCompanyClosure: boolean;
  }>;
}
```

**Status precedence per day (highest first)** — for past and today only; see future-date rule below:

1. `holiday` (public holiday or company closure for worker’s country calendar)
2. `on_leave` (approved leave covering the date; submitted leave is listed in `leave[]` and may show as a secondary chip, not as cell `on_leave`)
3. Attendance day summary status (`in` | `out` | `incomplete` | `missing`)
4. `non_working` if work-week pattern says off and no leave/holiday
5. Else `missing` for working days with no summary row

#### Team (`CalendarTeamResponse`)

```ts
{
  from: string;
  to: string;
  days: Array<{
    date: string;
    isHoliday: boolean;
    holidayName?: string | null;
  }>;
  workers: Array<{
    workerId: string;
    workerName: string;
    timezone: string;
    cells: Array<{
      date: string;
      status:
        | 'in'
        | 'out'
        | 'on_leave'
        | 'missing'
        | 'incomplete'
        | 'holiday'
        | 'non_working'
        | 'planned';
      leaveTypeName?: string | null;
      firstIn?: string | null;
      lastOut?: string | null;
    }>;
  }>;
}
```

**Team membership:** same as today’s `teamCalendar` — direct reports for managers; division/all for People Ops / admin; optional `divisionId` filter.

### Composition sources

| Data | Source |
|---|---|
| Attendance | `attendance_day_summaries` for worker IDs in `[from, to]` |
| Leave | `leave_requests` approved (+ submitted listed on staff payload) overlapping range |
| Holidays | `holidays` + active `holiday_calendars` for worker country |
| Work week | `work_week_patterns` via country-config resolve (no inline country `if`) |
| Names / TZ | `workers` |

### Envelope & audit

- Read-only GETs → standard `{ data, meta, errors }`; no `audit_log` writes.
- Auth: `AuthGuard` + `@Roles` matching existing calendar / leave roles.

### Tests (backend)

- Default week when query empty.
- Reject unknown `month` query property.
- Reject span > 62 days.
- Staff: holiday / leave / attendance precedence for a fixture week.
- Team: manager sees only reports; People Ops sees broader set.
- RBAC deny when employee requests another worker’s staff calendar.

---

## Frontend

### Shared libs

1. **`libs/datetime/calendar-range.ts`**
   - `weekRange(anchor: Date, timeZone?: string) → { from, to }`
   - `monthRange(anchor: Date) → { from, to }` (first–last day of month)
   - Always ISO `YYYY-MM-DD` calendar dates (local or explicit TZ — match worker TZ when available via `useWorkerTimezone`)

2. **`libs/api/calendars.ts`**
   - `getMyCalendar(params?: { from?: string; to?: string })`
   - `getStaffCalendar(workerId, params?)`
   - `getTeamCalendar(params?: { from?: string; to?: string; divisionId?: string })`
   - Remove `month` from `getTeamLeaveCalendar` params (or stop using it from pages)

3. **Status colours** — map calendar cell statuses to existing StatusChip / Tailwind tokens (no emoji). Document legend on both pages.

### Employee `/employee/calendar`

- Replace EmptyState placeholder.
- Controls: List | Month; prev/next; Refresh.
- **Month:** personal heatmap grid (Mon–Sun); cell colour = day `status`; tooltip/label for holiday / leave type.
- **List:** agenda of leave + holidays (+ optional attendance anomalies) for the active range; **default load = current week**.
- Month navigation uses `monthRange(cursor)`.
- States: skeleton, empty, error+retry, success.
- CTA: Request leave → `/employee/leave`.

### Manager `/manager/calendar`

- Fix load to call `getTeamCalendar({ from, to })` with `monthRange(cursor)` (never `month`).
- **Month / Heatmap:** workers as rows, days as columns (scrollable on mobile); cell colour = status; leave type in title.
- **List:** leave-style list derived from cells or leave segments for the month.
- Optional compact “today” strip can remain (reuse `TeamAttendanceStrip` + today’s punches) above the heatmap — not required if today column is visible.
- Same five UI states.

### Elsewhere

- **Manager cockpit:** keep `TeamAttendanceStrip` on today’s punches; no change required.
- **People Ops:** no new holiday admin screen; if leave admin links to calendars, point to working manager/employee routes by role.
- **Nav:** existing Calendar tabs already point at `/employee/calendar` and manager calendar routes — leave hrefs as-is.

### i18n

- English only: extend `EmployeeCalendar` and `ManagerCalendar` keys in `locales/en.json` (legend, heatmaps, errors). Do not edit `ar.json` / `fr.json`.

### Tests (frontend)

- Unit: `weekRange` / `monthRange` boundaries; team calendar client never sends `month`.
- Component smoke: employee page renders heatmap cells from fixture; manager page recovers from API error with retry.

---

## Migration / compatibility

1. Ship new endpoints first (backward compatible).
2. Switch employee + manager pages to new clients.
3. Leave `GET /calendars/staff` (legacy holidays+leave) and `GET /leave/team-calendar` until no callers remain; mark deprecated in Swagger.
4. Update `docs/project-requirements/api-specification.md` §4.6 and note in `docs/generated/tasks.md` if calendar items need re-verification.

---

## Success criteria

| # | Criterion |
|---|---|
| 1 | Employee calendar shows month heatmap + week list using `/calendars/me` (no “coming soon”). |
| 2 | Manager calendar loads without validation error; uses `/calendars/team` with `from`/`to`. |
| 3 | Omitting `from`/`to` on API returns current week. |
| 4 | Sending `month` still fails validation (explicitly rejected). |
| 5 | Team month view shows historical attendance status per worker/day for the visible month. |
| 6 | Leave and holidays visible and precedence rules hold. |
| 7 | RBAC: employee cannot read arbitrary staff calendars; manager limited to team. |

## Risks

| Risk | Mitigation |
|---|---|
| Large teams × 31 days payload size | Cap range at 62 days; paginate workers later if needed (not in v1). |
| Missing summaries look like “missing” for future dates | Apply future-date cell rule: never emit `missing` / `in` / `out` / `incomplete` for dates after today in the worker’s timezone. |
| Timezone edge on week default | Use acting worker timezone consistently. |

### Future-date cell rule (normative)

- **Past & today:** full precedence including attendance.
- **Future:** `holiday` → approved `on_leave` → `non_working` (off pattern) → `planned`. Never `missing` / `in` / `out` / `incomplete` for future dates.

---

## Open decisions (locked)

| Decision | Choice |
|---|---|
| Scope | Full app calendar pass: employee + manager + new APIs + heatmap |
| Default range | Current week when `from`/`to` omitted |
| Month UI range | Client sends full calendar month via `monthRange` |
| Approach | New composed calendar endpoints; thin frontend wiring |
| People Ops holiday CRUD | Out of scope this pass |
