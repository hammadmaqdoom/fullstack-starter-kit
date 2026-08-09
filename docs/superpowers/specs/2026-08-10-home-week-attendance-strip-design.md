# Design: Home Week Attendance Strip (Role-Aware)

**Date:** 2026-08-10  
**Status:** Draft — awaiting user review before plan  
**Product:** Polaris (Digitaro HRMS)  
**Related:** `EmployeeHome`, `TeamAttendanceStrip`, `GET /api/v1/calendars/me`, `GET /api/v1/attendance/punches/today`, staff/team calendars design (`2026-08-09-staff-team-calendars-design.md`)

## Problem

Employee Home (`/employee/home`) shows only check-in/out and a leave-balances placeholder. Weekly attendance progress exists on `/employee/calendar` (week list / month heatmap) but not on Home. Managers land on the same Home for personal punch but do not see team attendance there (team today lives only on `/manager/cockpit`).

## Goals

1. Show a **mini Mon–Sun attendance strip** on Home under Check-in for anyone using `/employee/home` (employees and managers).
2. For **managers** (`primaryLayout === 'manager'`), also show **compact team attendance** on Home by reusing `TeamAttendanceStrip`.
3. Keep **Cockpit** team strip + approvals unchanged.
4. Drive data from existing APIs — no new backend endpoints.

## Non-goals

- People Ops / Admin / Finance / Contractor org-level Home summaries.
- Changing Cockpit layout or approval queue.
- Leave balances implementation.
- New calendar APIs or `work_week_patterns` entity swap (keep Mon–Sun via `weekRange` + existing calendar cell statuses).
- Punching from the week strip itself.

## Decisions (confirmed)

| Topic | Choice |
|---|---|
| Approach | Shared presentational `WeekAttendanceStrip` wired on Home |
| Manager team strip placement | **Both** Home (under personal week) and Cockpit (unchanged) |
| Role gate | `usePolarisShell().shell.primaryLayout === 'manager'` for team block only |
| Personal strip audience | All users on `/employee/home` |
| People Ops | Skip — no strip on People Ops home |
| Day interaction | Reuse `CalendarDayDetailPopover` when tapped; “View calendar” → `/employee/calendar` |

---

## 1. Placement & role matrix

| Layout | Surface | Content |
|---|---|---|
| `employee` | `/employee/home` | Check-in → personal Mon–Sun strip → leave balances |
| `manager` | `/employee/home` | Check-in → personal Mon–Sun strip → Team today (`TeamAttendanceStrip`) → leave balances |
| `manager` | `/manager/cockpit` | Unchanged (existing team strip + approvals) |
| `people_ops` / `admin` / `finance` / `contractor` | Their homes | No week strip (out of scope) |

---

## 2. Components & data

### New: `WeekAttendanceStrip` (presentational)

**Path:** `frontend/src/components/calendar/WeekAttendanceStrip.tsx` (or `components/home/` if Home-specific chrome grows; prefer `calendar/` to share status tokens).

**Props (conceptual):**

- `days` — up to 7 cells from `StaffCalendarResponse['days']` (or a slim mapped type)
- `timezone`, `today` (ISO date in worker TZ)
- `loading`, `error`, `onRetry`
- Optional header actions: link to `/employee/calendar`

**Behaviour:**

- Render Mon–Sun day chips with weekday label + date number.
- Colour via existing `CALENDAR_STATUS_CLASS`.
- Highlight **today**.
- Tap day → existing `CalendarDayDetailPopover` / day detail content (punches, leave, holiday).
- Independent error/retry from check-in section (check-in can succeed while week fails).

### Home wiring (`employee/home/page.tsx`)

1. Load in parallel:
   - `getTodayAttendance()` (existing)
   - `getMyCalendar(weekRange(new Date()))` (omit params also defaults to current week server-side; client still sends `weekRange` for explicitness)
2. If `primaryLayout === 'manager'`: also `getTodayPunches({ scope: 'team' })` → `TeamAttendanceStrip`.
3. Page Refresh reloads all mounted sections.
4. After successful check-in/out, refresh week strip so today’s cell updates.

### APIs (unchanged)

| Call | Use |
|---|---|
| `GET /api/v1/calendars/me?from&to` | Personal week cells |
| `GET /api/v1/attendance/punches/today?scope=team` | Manager team strip |

No backend changes.

---

## 3. States, i18n, tests

### UI states (week strip)

| State | Behaviour |
|---|---|
| Loading | Skeleton of 7 cells |
| Empty | Soft empty copy + link to calendar (if API returns no days) |
| Error | Message + retry (does not block check-in) |
| Success | 7 chips + optional legend link |
| Offline | Keep last loaded strip; punch still gated by existing OfflineBanner rules |

Team strip on Home reuses `TeamAttendanceStrip` loading / error / empty behaviour.

### i18n

English only — extend `EmployeeHome` in `frontend/src/locales/en.json` (e.g. `week_title`, `week_view_calendar`, `week_error`, `week_empty`, `team_today_title`). Reuse `EmployeeCalendar` status label keys where practical. Do not edit `ar.json` / `fr.json`.

### Tests

1. Unit: `WeekAttendanceStrip` renders 7 weekday labels and applies status classes from a fixture.
2. Unit/component: Home shows `TeamAttendanceStrip` only when shell `primaryLayout === 'manager'` (mock `usePolarisShell`).
3. No new backend contract tests.

### Out of scope (explicit)

- People Ops org summary widget.
- Cockpit redesign.
- Leave balances data.
- New endpoints.
- Header/top-bar changes (separate spec: `2026-08-10-shell-topbar-checkin-design.md`).

---

## 4. Success criteria

| # | Criterion |
|---|---|
| 1 | Employee Home shows Mon–Sun strip under Check-in from `/calendars/me` current week. |
| 2 | Manager Home shows personal strip + team today strip; Cockpit team strip still works. |
| 3 | Non-manager Home does not call team punches API. |
| 4 | People Ops / other role homes unchanged (no strip). |
| 5 | Week strip has skeleton, error+retry, and does not block check-in on failure. |
| 6 | After punch, today’s week cell refreshes without full page reload. |

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| Dual fetch on Home (today + week) | Parallel `Promise.all`; independent error states |
| Manager Home slower with team punch | Team section skeleton; fail independently |
| Status colour drift vs calendar page | Import shared `CALENDAR_STATUS_CLASS` |
| Shell still loading | Defer team strip until shell resolved; personal strip can load immediately |
