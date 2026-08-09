# Design: Shell Top Bar — Context + Attendance-Aware Check-in

**Date:** 2026-08-10  
**Status:** Implemented — see `docs/superpowers/plans/2026-08-10-shell-topbar-checkin.md`  
**Product:** Polaris (Digitaro HRMS)  
**Related:** `AuthenticatedShell`, `EmployeeHome`, `GET /api/v1/attendance/punches/today`, UX one-tap check-in

## Problem

The authenticated top bar right-aligns Search and a static **Check in** link. That link never reflects today’s attendance (always “Check in”). The left side of the header has no day context (date, weekday, location).

## Goals

1. Left-align Search and the check-in CTA (not `ml-auto` on the right).
2. Show **day + date + live location** on the left by default.
3. Reflect today’s punch state on the CTA: when checked in, show **Checked in · {time}**.
4. Keep punch actions on Employee Home; header CTA only navigates there.

## Non-goals

- Punching check-in/out from the header itself.
- Persisting GPS coordinates to the backend from the header.
- Changing Employee Home punch UX beyond optional refresh coordination.
- People Ops / Finance / Admin layouts that do not show check-in today (keep `showCheckIn` gating).

## Decisions (confirmed)

| Topic | Choice |
|---|---|
| Location source | Browser **geolocation** when permitted |
| Checked-in CTA | **Checked in · {time}**; click → `/employee/home` |
| Structure | Extract **`ShellTopBar`** with dedicated hooks |

---

## 1. Layout (desktop)

Left → right inside the sticky header:

```
[menu (mobile)] [workspace (mobile)]
[ Day · Date · Location ]   [ Search ⌘K ]  [ Check-in CTA ]
```

- Remove `ml-auto` grouping that pushes actions to the far right.
- Context block sits first (after mobile chrome).
- Search and CTA follow immediately to the left of center / remaining space.
- No right-side action cluster unless we later add avatar/notifications (out of scope).

### Mobile

- Hamburger + workspace name remain.
- Compact context: one line under or beside (truncate location).
- CTA stays visible; Search may stay desktop-only (`lg:inline-flex`) as today, with palette still openable from sidebar / ⌘K.

---

## 2. Context block (date / day / location)

### Date & day

- Format with `Intl.DateTimeFormat` in the user’s locale (English product copy elsewhere; date format may follow browser locale).
- Example shape: **Mon, 10 Aug** (weekday short + day + month short).
- Updates at midnight (or on next mount / visibility) — no live clock required.

### Location

1. On mount (secure context), call `navigator.geolocation.getCurrentPosition` once per session (cache label in component/session state).
2. Reverse-geocode coordinates to a short human label (city / locality / area only — not full street address).
3. **Provider:** BigDataCloud free client reverse-geocode (`https://api.bigdatacloud.net/data/reverse-geocode-client`) — no API key for browser use; use `city` / `locality` / `principalSubdivision` fallbacks for the label.
4. Soft failures:
   - Permission denied → muted **Location unavailable** with a small retry control that re-requests permission.
   - Unavailable / geocode failure → same muted copy; do **not** show raw lat/lng.
5. Do **not** send coordinates to Polaris APIs from this header path. Display only.
6. Never log raw coordinates.

---

## 3. Check-in CTA states

Visible when `shell.primaryLayout` is `employee` or `manager` (existing `showCheckIn`).

| Today status (`daySummary.status`) | Label | Icon |
|---|---|---|
| no summary / `missing` / `incomplete` / null | `Check in` | `LogIn` |
| `in` | `Checked in · {time}` | `Check` |
| `out` | `Checked out` | `LogOut` |
| `on_leave` | **Hide** the CTA | — |

- `{time}` = local format of `daySummary.firstIn` (same style as Employee Home).
- Entire control is a **Link** to `/employee/home#check-in`.
- Styling: primary filled for actionable **Check in**; quieter outline / success-tinted for **Checked in · …** and **Checked out** so they read as status, not “punch again”.

### Data

- Hook `useTodayAttendance` (or equivalent) calls existing `getTodayAttendance()`.
- Refetch on: mount, `visibilitychange` → visible, and after returning to the app (focus) so punching on Home updates the bar.
- Loading: keep last known label or show **Check in** skeleton/placeholder without flashing wrong state if possible.
- Error: fall back to static **Check in** link (current behavior) — do not block the shell.

---

## 4. Component structure

```
AuthenticatedShell
  └── ShellTopBar
        ├── ShellContextStrip   // day, date, location
        ├── Search button       // opens CommandPalette
        └── ShellCheckInCta     // attendance-aware link
```

Hooks:

- `useGeolocationLabel` — permission + reverse geocode + cached label
- `useTodayAttendance` — wraps `getTodayAttendance` + refetch triggers

i18n: extend `AuthenticatedShell` keys in `frontend/src/locales/en.json` only (`checked_in_with_time`, `checked_out`, `location_unavailable`, `allow_location`, etc.).

---

## 5. Acceptance criteria

1. Desktop header shows Search and check-in CTA on the **left** (with context), not far right.
2. Left context shows weekday + date by default without user action.
3. When geolocation is granted, a locality label appears; when denied, soft fallback copy.
4. After a successful check-in for today, header shows **Checked in · {time}** (not “Check in”).
5. After check-out, header shows **Checked out**.
6. Clicking the CTA always lands on Employee Home; no header punch mutation.
7. People Ops / Finance / Admin without employee/manager primary layout still omit the CTA.
8. English-only strings; Lucide icons only.

## Out of scope / follow-ups

- One-tap punch from header (would need offline queue + geolocation on punch — already on Home path).
- Map pin / weather / office site from worker profile as alternate location source.
