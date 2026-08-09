# Calendar day punch detail — design

**Date:** 2026-08-09  
**Status:** Approved for planning  
**Extends:** [2026-08-09-staff-team-calendars-design.md](./2026-08-09-staff-team-calendars-design.md)  
**Stories:** FR-TIME-003 / FR-TIME-005 (attendance visibility on calendars)  
**Flow:** FLW-TIME-002 (where applicable)

## Problem

Employee and manager month calendars show colour-coded attendance status per day, but hovering a day does not reveal that day’s check-ins, check-outs, or hours worked. Native `title` tooltips only echo status / holiday / leave names.

## Goals

- On hover (desktop) or tap (mobile), show that day’s **full chronological punch list** and **total hours worked**.
- Same behaviour on **employee** month heatmap and **manager team** heatmap.
- Data available immediately from the calendar payload (no per-day fetch).

## Non-goals

- Editing punches or opening correction flows from the popover.
- People Ops–only calendar surfaces beyond existing staff/team heatmaps.
- Changing check-in / check-out APIs or Hub flows.
- Capacitor / native wrapper; non-English UI.

## Approach

**Enrich calendar day cells** on existing `GET /api/v1/calendars/{me,staff/:id,team}` responses with `punches[]` and `workedMinutes`. Frontend shares one day-detail popover used by `StaffMonthHeatmap` and `TeamMonthHeatmap`.

---

## Backend

### Response additions

Extend each day cell (staff `days[]` and team `workers[].cells[]`):

```ts
punches: Array<{
  id: string;
  punchType: 'check_in' | 'check_out';
  punchedAt: string; // ISO timestamptz
}>;
workedMinutes: number; // non-negative integer
```

Retain existing `firstIn` / `lastOut` / status / leave / holiday fields.

### Hours rule

1. Sort punches for the day by `punchedAt` ascending.
2. Walk chronologically; pair each `check_in` with the next later `check_out`.
3. Sum completed pair durations into `workedMinutes` (floor to whole minutes).
4. Unpaired open `check_in` contributes **0** minutes but remains in `punches`.
5. Days with no punches: `punches: []`, `workedMinutes: 0`.

### Loading punches

- One batched query of `attendance_punches` for the calendar `from`/`to` window.
- Staff endpoints: filter to that worker.
- Team endpoint: filter to workers included in the payload.
- Group by `workerId` + local work date using the worker timezone already used for calendar cells (fallback only via existing worker timezone resolution — no country hard-coding).
- Empty arrays for days with no punches; do not omit the fields (stable client contract).

### Endpoints

No new routes. Enrich only:

| Method | Path |
|---|---|
| GET | `/api/v1/calendars/me` |
| GET | `/api/v1/calendars/staff/:workerId` |
| GET | `/api/v1/calendars/team` |

RBAC and row scope unchanged.

---

## Frontend

### Shared component

`CalendarDayDetailPopover` (under `frontend/src/components/calendar/`):

| Section | Content |
|---|---|
| Header | Date; worker name on team grid |
| Status | Existing status label (+ holiday / leave name when present) |
| List | Chronological punches: `Check-in · HH:mm` / `Check-out · HH:mm` in worker timezone (`format-in-timezone`) |
| Footer | `Total · Xh Ym` from `workedMinutes` |
| Empty | `No punches this day` when `punches.length === 0` |

Use PrimeReact `OverlayPanel` (or equivalent already in the stack), anchored to the cell — replace native `title` for punch detail (status colour remains on the cell).

### Interaction

| Context | Behaviour |
|---|---|
| Desktop | Hover opens; leave closes after a short delay so pointer can enter the panel |
| Mobile / touch | Tap toggles; tap outside or Esc closes |
| Focus | Cell is focusable; Enter / Space opens |
| Concurrency | At most one open popover |

Wire into:

- `StaffMonthHeatmap` (employee calendar month view; pass calendar `timezone`)
- `TeamMonthHeatmap` (manager calendar; pass per-worker `timezone`; enlarge hit area to the cell)

### i18n

Add English strings only under `EmployeeCalendar` and `ManagerCalendar` in `frontend/src/locales/en.json` (punch labels, total, empty, in-progress copy if used).

---

## Edge cases

| Case | Behaviour |
|---|---|
| Holiday / leave / non-working, no punches | Popover opens; status + holiday/leave label; empty punch message; total 0 |
| Incomplete (check-in only) | List the check-in; `workedMinutes` 0. If the day is **today** and the last punch is an unpaired `check_in`, footer shows “In progress” instead of `0h 0m` |
| Future / planned | Empty punches; no special total emphasis |
| Team 6×6 swatch | Popover anchors to swatch; hover/tap target is the table cell |

---

## Testing

**Backend (Jest)**

- Group punches by worker + local work date across timezone boundaries.
- `workedMinutes`: multi-pair day, unpaired check-in, empty day, check-out without prior check-in ignored for pairing.

**Frontend (Vitest)**

- Popover renders punch list + formatted total.
- Empty state when no punches.
- Staff heatmap opens detail from cell interaction (smoke).

---

## Out of scope

- Punch correction from the popover.
- Lazy per-day punch fetching.
- Changing attendance write paths.
