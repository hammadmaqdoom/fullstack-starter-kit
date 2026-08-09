# Design: Employee Home (Today) Redesign

**Date:** 2026-08-10  
**Status:** Implemented — see `docs/superpowers/plans/2026-08-10-employee-home-today.md`  
**Product:** Polaris (Digitaro HRMS)  
**Related:** `EmployeeHome`, shell check-in CTA → `/employee/home#check-in`, Hub, leave balances, calendars/me, workers/me  
**Stories:** Human moments (birthday / anniversary) — `user-stories.md` birthday acknowledgement; Home / Today dashboard

## Problem

Employee Home (`/employee/home`) feels empty and awkward:

- A permanent header **Try again** button appears even when nothing failed.
- No greeting or employee name.
- Only a thin check-in card and a placeholder leave-balances block; large unused whitespace.
- Celebrations (birthday / anniversary) are in product stories but not on Home; `dateOfBirth` is not stored on `workers` yet.

## Goals

1. Personal greeting with the employee’s first name and today’s date.
2. Remove the always-visible page-level retry; retry only inside failed sections.
3. Fill Today with useful, real data: leave balances, Hub “needs you”, upcoming week, shortcuts.
4. Show birthday and work-anniversary celebration cards when applicable.
5. Persist optional `dateOfBirth` on workers and expose it on `GET /api/v1/workers/me` so birthday can render.

## Non-goals

- Punching from the shell top bar (unchanged — CTA still navigates to `#check-in`).
- Social notification opt-out / birthday push notifications.
- Colleague birthdays on Home (self only this pass).
- Desktop multi-column dashboard grid.
- New Hub/leave/calendar APIs beyond existing contracts.
- Editing DOB on the employee profile UI (People Ops / worker update path only if already present; optional field on existing update DTO is enough).

## Decisions (confirmed)

| Topic | Choice |
|---|---|
| Layout | Single vertical stack (`max-w-2xl`), Approach 1 |
| Content depth | Fuller home (option C): leave + Hub + calendar week + celebrations + shortcuts |
| Retry | Per-section error only — no permanent header Try again |
| Name source | Session `user.name`; first token for greeting; fallback “there” |
| Birthday data | Backend nullable `date_of_birth` on `workers` + me profile (option B) |
| Anniversary | From existing `startDate`; years ≥ 1 |
| Both same day | Show both cards; birthday first |
| Timezone for match | Worker timezone if set, else browser local |

---

## 1. Layout & composition

Vertical order:

1. **Greeting** — time-of-day + first name; subtitle = formatted today date. Replaces “Today” + “Check in” header pair.
2. **Check-in hero** — status + Check in / Check out; keep `#check-in` id for shell deep-link. Offline / punch errors stay local to this section.
3. **Leave balances** — chips for each balance (remaining + type name + unit). Empty: configured empty copy + link to request leave.
4. **Needs you** — up to 3 Hub `forMe` items (title + status); empty: “Nothing needs you” + link to Hub. Link “View Hub” when items exist.
5. **Coming up** — next 7 days from `getMyCalendar`: leave spans, holidays, company closures. Empty: “Nothing upcoming this week.”
6. **Celebrations** — birthday and/or anniversary cards; omit section entirely when neither matches.
7. **Shortcuts** — compact links: Leave · Calendar · Hub · Documents · Payslips.

No page-level Refresh / Try again control in the header.

---

## 2. Frontend structure

- Page remains a client component: `frontend/src/app/[locale]/(auth)/employee/home/page.tsx`.
- Presentational sections under `frontend/src/components/employee/home/`:
  - `HomeGreeting`
  - `HomeCheckInCard` (extract from current punch UI)
  - `HomeLeaveBalances`
  - `HomeNeedsYou`
  - `HomeComingUp`
  - `HomeCelebration`
  - `HomeShortcuts`
- Pure helpers (unit-tested), e.g. `frontend/src/libs/employee/home-today.util.ts`:
  - `firstNameFromDisplayName(name)`
  - `greetingPeriod(date, timeZone?)` → morning | afternoon | evening
  - `isMonthDayMatch(isoDate, today, timeZone?)`
  - `anniversaryYears(startDate, today, timeZone?)`
  - `upcomingFromCalendar(calendar, from, to)` → list items for Coming up
- Strings in `frontend/src/locales/en.json` under `EmployeeHome` (and reuse `HumanMoments` where copy already exists). English only.

### Data loading

Independent loads so one failure does not blank the page:

| Section | Source |
|---|---|
| Greeting | `authClient.useSession()` |
| Check-in | `getTodayAttendance` / `checkIn` / `checkOut` (existing) |
| Leave | `listLeaveBalances()` |
| Needs you | `getHubInbox()` → `forMe.slice(0, 3)` |
| Coming up | `getMyCalendar({ from, to })` for today → today+6 |
| Celebrations | `getMyWorker()` → `dateOfBirth`, `startDate` |

### States

- Per section: skeleton → content | empty | error (+ inline Try again) | respect top `OfflineBanner`.
- Greeting always renders.
- Check-in keeps existing offline queue messaging.

---

## 3. Backend — `dateOfBirth`

### Schema

- Table `workers`: nullable column `date_of_birth` type `date`.
- TypeORM entity field `dateOfBirth: string | null`.
- Migration only (do not edit old migrations).

### API

- Include `dateOfBirth` on worker responses used by me/detail (at minimum `GET /api/v1/workers/me`).
- Accept optional `dateOfBirth` on create/update worker DTOs when those paths already update profile fields.
- Envelope unchanged: `{ data, meta, errors }`.
- Mutations that set/clear DOB write `audit_log` (same pattern as other worker field updates). Do not log the DOB value in application logs.

### RBAC / privacy

- Self can read own DOB via `/workers/me`.
- People Ops (existing worker update permissions) can set/clear DOB.
- Field is PII; no broader directory exposure in this pass.

### Seed / demo

- Set `dateOfBirth` on at least one demo employee so month/day matches a predictable demo scenario (document in demo-accounts note if needed), so the birthday card is visible in local demos.

### Docs touch (implementation plan)

- Align `database-design.md` / API notes if those files list worker columns; keep this design as the feature source of truth for the home redesign.

---

## 4. Celebration rules

```
if dateOfBirth month/day == today → show birthday card (HumanMoments birthday copy)
if startDate month/day == today AND years >= 1 → show anniversary card
if both → birthday card then anniversary card
else → render nothing (no empty Celebrations heading)
```

Timezone: worker `timezone` when present; otherwise browser.

---

## 5. Testing

- Unit: greeting period, first-name parse, month/day match, anniversary years, upcoming calendar filter.
- Component/page: no header Try again when healthy; retry appears only on section error; greeting with name; celebration visibility matrix (none / birthday / anniversary / both).
- Backend: migration applies; me payload includes `dateOfBirth`; update with DOB audits.

---

## 6. Acceptance checklist

- [x] Greeting shows time-of-day + first name + date; no permanent header Try again.
- [x] Check-in still works; `#check-in` still targets the punch section; shell CTA unchanged.
- [x] Leave balances render from API or clear empty state.
- [x] Up to 3 Hub `forMe` items with link to Hub.
- [x] Coming up shows leave/holidays for next 7 days or empty copy.
- [x] Shortcuts navigate to Leave, Calendar, Hub, Documents, Payslips.
- [x] Birthday card when DOB month/day is today; anniversary when startDate month/day is today and years ≥ 1.
- [x] `workers.date_of_birth` exists; `/workers/me` returns it; demo seed has a matchable DOB.
- [x] English strings only in `en.json`.

---

## Out of scope (explicit)

- Colleague birthday feed, push/email alerts, opt-out preferences.
- Birthday in directory search results.
- Redesign of leave request or Hub pages themselves.
