# IPMS End-to-End Completion — Design

**Date:** 2026-08-09  
**Status:** Approved  
**Product:** Polaris (Digitaro HRMS)  
**Related:** US-TAL-004, FR-TAL-005 (SRS), FLW-TAL-004 (calibration — cited in `talent.service.ts`), Hub performance item types in `operations/hub.service.ts`, demo accounts `2026-08-08-demo-accounts.md`  
**Plan:** [../plans/2026-08-09-ipms-end-to-end.md](../plans/2026-08-09-ipms-end-to-end.md)

## Problem

Performance (IPMS) entities and most `/api/v1/talent` endpoints already exist. Employee / manager / People Ops UIs are shells:

- Add goal accepts title only (API supports description, due date, weight, goal type, key result link).
- Give feedback uses a raw worker ID field instead of `WorkerPicker`.
- Goal check-in is a silent +10% button (no status/notes dialog).
- Summary cards misrepresent “reviews awaiting me” (recognition count used in places).
- Manager page reuses the employee dashboard (no team board).
- OKR admin strings exist (`OkrAdmin` in `en.json`) and tasks.md marks OKR admin done, but `/people-ops/performance/okrs` route is missing.
- Calibration and pulse pages exist but lack rich demo fixtures and polish.
- Development plans have API coverage without a first-class UI on performance surfaces.
- Hub already emits `performance_review`, `one_on_one`, and `development_plan_action` items with deep-links (`?reviewId=`), but pages do not reliably open the matching dialog from query params.
- Demo org seed has no performance fixtures — every section looks empty after login.

## Goals

1. Complete IPMS **end-to-end** across five ordered slices (docs mega-plan now; implement later 1→5).
2. Per slice: **backend gap audit + fixes**, frontend UX, **rich demo seeds**, Hub deep-link verification, tests.
3. Demo accounts (`employee.demo`, `employee2`, `manager.demo`, `divhead.demo`, `peopleops.demo`) can exercise every major flow without manual DB setup.
4. Preserve existing talent module boundaries — extend, do not rewrite.

## Non-goals

- QES e-signatures, payroll-tied rating exports, Teams bot for 1:1s
- Multi-tenant productization / Capacitor native apps
- Greenfield rewrite of `talent` module
- Non-English UI / RTL
- Changing Better Auth / Entra auth model

## Decisions (locked)

| Topic | Decision |
|---|---|
| Scope | Full IPMS (all five slices) |
| Delivery shape | One mega design; implement later in slice order 1→5 |
| Backend depth | Full gap audit per slice; add endpoints/DTO fields/tests where UI needs them |
| Demo data | Rich fixtures (goals, feedback, recognition, 1:1s, cycle/reviews, OKRs, pulse, calibration, IDPs) |
| Approach | Slice-sequenced completion (not backend-only first, not domain-epic-first) |
| Manager UI | Distinct team board — stop reusing `PerformanceDashboardView` alone |
| Summary card 4 | Count of reviews awaiting the acting user (e.g. `pending_self` / `pending_manager` as role-appropriate) |
| Feedback recipient | Always `WorkerPicker` (directory search) |
| Hub | Pages must honour existing Hub `href` query params |
| i18n | English only — `frontend/src/locales/en.json` |

## Slice map

| # | Slice | Primary roles | Done when |
|---|---|---|---|
| 1 | Employee dashboard | employee | Full goal/check-in/feedback/recognition UX; 1:1 + review sections; deep-link self-assessment; seeds for employee personas |
| 2 | Manager team | manager, division_head | Team board; manager assessment; 1:1 schedule/complete; Hub manager deep-link |
| 3 | Cycles + OKRs | people_ops | Cycle create/activate + flags; restore OKR admin route; active objectives on dashboards |
| 4 | Calibration + pulse | division_head, people_ops, employee | Calibration board usable; pulse admin + respondent; anonymity threshold; seeds |
| 5 | IDPs + Hub polish | all | IDP UI + action completion; Hub hrefs verified; demo-accounts smoke updated |

**Hard gate:** slice *n+1* starts only after slice *n* acceptance criteria pass.

---

## Architecture

```mermaid
flowchart LR
  subgraph FE[Frontend]
    EmpDash[PerformanceDashboardView]
    MgrBoard[ManagerPerformanceBoard]
    OpsCycles[PeopleOpsCyclesPanel]
    OkrAdmin[OkrAdminPage]
    Calib[CalibrationBoard]
    Pulse[PulseSurveyUI]
    Idp[DevelopmentPlanPanel]
    Hub[Hub inbox]
  end
  subgraph API["/api/v1/talent + /operations/hub"]
    Dash[GET performance/dashboard]
    Team[GET performance/team-dashboard]
    Goals[goals + check-ins]
    Fb[feedback + recognition]
    Ooo[one-on-ones]
    Rev[reviews + calibration]
    Obj[objectives + KRs]
    Cyc[performance-cycles]
    Plans[development-plans]
    HubAPI[Hub items]
  end
  subgraph DB[(Postgres)]
    PG[performance_* / feedback / OKR / IDP tables]
  end
  EmpDash --> Dash
  EmpDash --> Goals
  EmpDash --> Fb
  MgrBoard --> Team
  MgrBoard --> Rev
  OpsCycles --> Cyc
  OkrAdmin --> Obj
  Calib --> Rev
  Pulse --> API
  Idp --> Plans
  Hub --> HubAPI
  API --> DB
```

### Backend posture

- Inventory `talent.controller.ts` / `talent.service.ts` at the start of each slice.
- Add only what the slice needs (example: `GET /api/v1/talent/performance/team-dashboard` if scoped multi-worker aggregation is awkward).
- Keep `/api/v1/` envelope `{ data, meta, errors }`.
- Every mutation writes `audit_log`.
- Enforce row scope via existing talent-scope helpers (own / team / division / all).
- Never hard-code country logic.

### Frontend posture

- Employee: evolve `PerformanceDashboardView`.
- Manager: new `ManagerPerformanceBoard` (or equivalent); do not mount employee-only dashboard as the whole page.
- People Ops: keep cycles panel; restore `/people-ops/performance/okrs`; link from nav if missing.
- Reuse `WorkerPicker`, `EmptyState`, `PageSkeleton`, `StatusTracker` for review workflows.
- Read Hub query params (`reviewId`, and later plan/action ids) and open the correct dialog on load.

### Typical mutation flow

UI validate → `POST`/`PATCH` talent API → authorize + persist + audit → refetch dashboard or targeted list → update cards/sections.

---

## Slice 1 — Employee dashboard

### UI

- **Add goal:** title, description, optional due date, optional weight % (optional goal type / key-result link if cheap against existing DTO).
- **Check-in dialog:** progress %, `on_track` | `at_risk` | `off_track`, optional notes.
- **Feedback:** `WorkerPicker` + `FeedbackType` + message (+ private flag if API supports).
- **Recognition:** create with WorkerPicker + message (+ value tag if supported); feed lists recent entries.
- **Sections:** My goals, Reviews (self-assessment + StatusTracker), Upcoming 1:1s, Company & division OKRs (read-only), Team recognition, Development plans (read-only list until Slice 5).
- **Summary cards:** active goals, recent feedback, upcoming 1:1s, reviews awaiting me.
- **Deep-link:** `?reviewId=` opens self-assessment dialog when status is `pending_self`.

### Backend audit focus

- Confirm create goal / check-in / feedback / recognition DTOs match UI fields.
- Ensure recognition (and feedback) list payloads include enough display fields (author/recipient names) — extend response mapping if only UUIDs today.
- Confirm dashboard returns `actingWorkerId` and clear behaviour when null.

### Seeds (Slice 1 minimum; later slices extend)

For `employee.demo` and `employee2.demo`: active goals with varied progress, received feedback, recognition entries, scheduled 1:1, review in `pending_self`, active OKRs visible.

---

## Slice 2 — Manager team

### UI

- Team board: direct reports list with active goals and reviews needing manager input.
- Actions: submit manager assessment, schedule / complete 1:1, give feedback (WorkerPicker; prefer team-scoped directory where available).
- Hub `?reviewId=` opens manager review dialog for `pending_manager`.

### Backend

- Prefer a dedicated team dashboard aggregate with manager/division_head scope.
- Reuse existing review submit / 1:1 endpoints; fill gaps if manager assessment payload is incomplete for UI.

---

## Slice 3 — Cycles + OKRs

### UI

- People Ops cycles: create (name, type, period, peer feedback flag, calibration flag), list, activate (spawns reviews for eligible workers).
- Restore **OKR admin** at `/people-ops/performance/okrs`: create objective, add key results, activate/close.
- Employee/manager dashboards show active objectives.

### Backend

- Confirm activate-cycle side effects and RBAC.
- Confirm objective/KR CRUD matches `OkrAdmin` locale keys and frontend client in `libs/api/talent.ts`.

---

## Slice 4 — Calibration + pulse

### UI

- Calibration board (existing page polish): select calibration-enabled cycle → pending reviews → calibrated outcome + notes.
- Pulse: People Ops create/activate; employee respondent page submit; results UI respects anonymity threshold messaging.

### Seeds

- Active cycle with reviews in `pending_calibration` for division_head demo path.
- Active pulse survey assigned/available to employee demo.

---

## Slice 5 — IDPs + Hub polish

### UI

- Development plan panel: list plans, add actions, mark actions complete (employee) / add actions (manager / People Ops as scoped).
- Wire Hub `development_plan_action` hrefs to open the plan/action context.

### Docs

- Update `docs/superpowers/specs/2026-08-08-demo-accounts.md` Performance smoke checklist per role.

---

## Demo seeds (rich fixtures)

New idempotent seed (preferred) or extension of `DemoOrgSeed1783038400000`, running **after** demo workers exist:

| Fixture | Personas |
|---|---|
| Active goals (on_track / at_risk) | employee, employee2 |
| Feedback + recognition | employee ↔ manager |
| Scheduled 1:1 | manager ↔ employee |
| Annual cycle + reviews (`pending_self`, `pending_manager`, `pending_calibration`) | employee, employee2, manager, divhead |
| Active company/division OKRs + KRs | all readers |
| Active pulse survey | employee respondent |
| Development plan + open actions | employee (Hub-visible) |

Password and emails remain as in demo-accounts spec (`PolarisDemo!2026`).

---

## Errors, RBAC, compliance

### UI states

Skeleton, empty, error + retry, offline (shell banner), success (close dialog + refresh). No silent `console.error`-only failure paths on People Ops actions.

### Unlinked auth user

If `actingWorkerId` is null, show explicit empty state; block create mutations with the existing “link worker profile” message.

### RBAC

| Surface | Who |
|---|---|
| Own dashboard / goals / self-assessment | employee (own worker) |
| Team board / manager assessment | manager, division_head (scoped) |
| Cycles, OKR admin, pulse admin | people_ops, admin |
| Calibration | division_head (+ people_ops) |
| IDP write | scoped: employee own actions; manager/People Ops create/update per existing service rules |

### Compliance references

- User story: **US-TAL-004** (performance review cycle)
- SRS: **FR-TAL-005**
- Pipeline: Authenticate → Authorise (RBAC + row scope) → Validate → Persist + `audit_log` → scoped response
- Locate matching **FLW-*** in `docs/compliance/feature-flows.md` during implementation planning and cite in the plan; if no dedicated performance FLW exists, apply the standard talent/authz evidence pattern used by adjacent talent flows

---

## Testing & acceptance

### Automated

- Backend unit tests for new/changed service methods (team dashboard, response enrichment, IDP transitions).
- Frontend unit tests for query-param → dialog open and any pure helpers.
- Extend existing talent specs rather than inventing a parallel test stack.

### Per-slice acceptance gates

1. **Employee:** create goal → card → check-in → feedback via WorkerPicker → recognition; Hub self-review deep-link works; seed not empty.
2. **Manager:** sees team goals/reviews; completes manager assessment; Hub manager deep-link works.
3. **People Ops:** create/activate cycle; manage OKRs; employees see active objectives.
4. **Calibration + pulse:** div head calibrates seeded review; employee completes pulse; anonymity threshold behaviour correct.
5. **IDPs + Hub:** complete IDP action; Hub item opens correct UI; demo-accounts Performance smoke updated.

---

## Risks

| Risk | Mitigation |
|---|---|
| Manager multi-worker fetch awkward | Explicit team-dashboard endpoint in Slice 2 |
| OKR admin “done” in tasks but route missing | Treat as restore/finish in Slice 3, not optional |
| Seed ordering vs demo workers | Timestamp seed after demo-org; idempotent upserts |
| Scope creep into recruitment/training | Out of scope — performance IPMS only |
| Hub href drift | Slice 5 verification matrix against `hub.service.ts` hrefs |

## Out of order work

Do not start Slice 2+ UI until Slice 1 acceptance passes, except shared seed scaffolding that later slices extend (allowed in Slice 1 if clearly versioned/idempotent).
