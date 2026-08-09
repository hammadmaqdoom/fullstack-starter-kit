# Design: Admin UX + CRUD Coverage (with Tenancy Gate)

**Date:** 2026-08-10  
**Status:** Approved — awaiting execution  
**Product:** Polaris (Digitaro HRMS)  
**Plans:** [../plans/2026-08-10-admin-ux-crud-w0-foundation-tenancy.md](../plans/2026-08-10-admin-ux-crud-w0-foundation-tenancy.md) · [../plans/2026-08-10-admin-ux-crud-w1-people-ops.md](../plans/2026-08-10-admin-ux-crud-w1-people-ops.md)  
**Coverage matrix:** [2026-08-10-admin-coverage-matrix.md](./2026-08-10-admin-coverage-matrix.md)  
**Related:** PRD §5–§8, §11; [user-stories.md](../../project-requirements/user-stories.md); [database-design.md §1.4](../../project-requirements/database-design.md); [2026-08-10-schema-gap-closure-design.md](./2026-08-10-schema-gap-closure-design.md); [2026-08-10-people-domain-evidence-layer-design.md](./2026-08-10-people-domain-evidence-layer-design.md)

## Problem

Internal Polaris dashboards feel unfinished and confusing: some screens are stubs or list-only, empty states lack primary actions, Hub cards do not act, and navigation hides real routes. In parallel, schema-gap tables and several Phase 0 APIs have no UI, WorkerForm omits profile columns, org pickers use hardcoded seed UUIDs, and tenancy is inconsistently applied (hardcoded `DIGITARO_TENANT_ID` fallbacks; starter-kit CMS entities have no `tenantId`).

## Goals

1. Make **every authenticated Polaris screen** intentional: purpose copy, primary action, five states, StatusTracker on workflows, English-only copy.
2. Close **DB → API → UI → RBAC → tenant** coverage so no Phase 0 / shipped Phase 1–2 business table is orphaned without usage or an explicit exemption.
3. Enforce **tenant-first** on every business table and query (v1 single Digitaro tenant; no client-supplied `tenantId`).
4. Deliver as **role waves** so each wave ships usable, complete surfaces — not a big-bang rewrite.

## Non-goals

- New Phase 2 product modules not already in the app (expenses, help desk, deeper payroll beyond existing finance screens).
- Polishing starter-kit CMS as a product (remove from Polaris product paths; no tenant retrofit).
- Multi-tenant productization UI (tenant switcher / provisioning).
- Full people CCM evidence catalogue (own design/plan) — this design only requires audit viewer, policy compliance dashboard, and DSAR export entry points.
- Non-English UI, Xero API, Capacitor, QES.

## Decisions (confirmed)

| Topic | Choice |
|---|---|
| Scope | **A + B + C** — Phase 0/1 People Ops & Super Admin; harden shipped Phase 2 shells; audit all authenticated internal dashboards |
| Delivery | **Coverage matrix + role-wave** (not big-bang rewrite) |
| CMS | **Remove** from Polaris shell/nav; do not retrofit tenancy |
| Tenancy v1 | Single Digitaro tenant runtime; every Polaris business path session-scoped; never trust client `tenantId` |
| Evidence CCM | Separate track; cross-link only |
| Spec → plan | User reviews this file before wave implementation plans are written |

## Approaches considered

### Approach 1 — Coverage matrix + role-wave (**SELECTED**)

Shared screen contract + living matrix, then W0 → W0b tenancy → W1 People Ops → W2 Hub/Manager → W3 Phase 2 shells → W4 portals → W5 shell/RBAC/CMS.

**Why:** Matches full scope without freezing the product for months; each wave is reviewable; tenancy gate prevents new orphans.

### Approach 2 — Spec-first full UI rewrite then fill CRUD (**REJECTED**)

Restore all missing `ux-design-specs.md` / ui-spec bodies before any code. Too slow; leaves known stubs and API orphans live.

### Approach 3 — Coverage-first APIs only, UX later (**REJECTED**)

Would worsen “title-only” UX while wiring fields. UX contract and CRUD must land together per wave.

---

## 1. Screen contract

Every authenticated Polaris page must provide:

| Element | Rule |
|---|---|
| Purpose | Title + one-line description of what the screen is for |
| Primary action | Visible when role can mutate; also on empty state when creatable |
| Five states | Skeleton loading, empty (+ CTA), error (+ retry), offline where applicable, success feedback |
| Workflows | `StatusTracker` on every request-bearing flow |
| Affordance | Row actions usable without hover-only |
| Copy | English only — `frontend/src/locales/en.json` |
| Tenancy | No tenant picker; no `tenantId` in request bodies |

Reuse existing primitives: `EmptyState`, `PageSkeleton`, `StatusTracker`, `StatusChip`, `RequireRole`, `AuthenticatedShell`. Do not invent a second pattern set.

---

## 2. Coverage matrix

Living file: [2026-08-10-admin-coverage-matrix.md](./2026-08-10-admin-coverage-matrix.md).

Columns:

`table/entity | PRD/story | backend entity | tenant_id | API (tenant filter) | UI surface | RBAC | status`

Status values: `ok` | `partial` | `orphan` | `seed-only` | `system-only` | `global-exempt` | `remove`.

A row cannot be `ok` unless tenant columns are filled and API filters by session tenant.

---

## 3. Tenancy gate (W0b)

Canonical rules from database-design §1.4:

1. `tenant_id` UUID NOT NULL FK → `tenants(id)` on every business table.
2. Exempt only global ISO reference tables (e.g. `currency_codes`) — marked `global-exempt`.
3. Child tables denormalise `tenant_id`.
4. Business unique constraints include `tenant_id`.
5. Every SELECT/UPDATE/DELETE filters `tenant_id = :currentTenantId` from session / `ScopeContext`.
6. DTOs never accept client-supplied `tenantId`; resolve via shared session util (extend pattern in `tenant-context.util.ts`).
7. Seeds, BullMQ jobs, demo accounts write Digitaro tenant explicitly.
8. Replace ad-hoc `actor.tenantId ?? DIGITARO_TENANT_ID` sprawl with one resolver; constant remains v1 seed/default only.
9. Starter-kit `backend/src/api/**` — no tenant retrofit; product removal in W5.
10. Better Auth tables stay auth-scoped; Polaris linkage via `user_role_assignments` / workers that carry `tenant_id`.

**Tests:** Second fixture tenant in tests; assert cross-tenant deny on read/update/delete; assert body `tenantId` ignored/rejected; matrix + test before marking new CRUD `ok`.

---

## 4. Wave design

```text
W0 Foundation → W0b Tenancy → W1 People Ops/SA → W2 Hub/Manager
  → W3 Phase2 shells → W4 Portals → W5 Shell/RBAC/CMS
```

### W0 — Foundation

- Screen contract documented and applied as the bar for later waves.
- Seed and maintain coverage matrix.
- Restore thin UI specs under `docs/design-specs/ui-specifications/` for: `shared-components.md`, `people-ops.md`, `manager.md`, `admin-setup.md`, `finance.md` (layout, components, five states, primary actions). Full `ux-design-specs.md` can land incrementally.

### W0b — Tenancy

- Schema + query sweeps; fix missing filters before W1 CRUD.
- Session tenant resolver; frontend org APIs replace `frontend/src/libs/constants/org.ts` hardcodes (implementation lands with W1 org admin; W0b defines the rule and fails matrix rows that still hardcode).

### W1 — People Ops / Super Admin (Phase 0/1)

| Surface | Required outcome |
|---|---|
| Leave admin | Full leave-type + calendar/holiday CRUD (end stub) — PRD §6.5 / §6.6.1 |
| Policies | Publish/version/assign + who-has/hasn’t compliance — US-DOC-001 |
| Pre-boarding / separations | Create from empty CTA — US-TAL-005 / US-TAL-002 |
| Worker form | DOB, job title, department, manager, address, emergency, probation, office, statutory expiry; bank / skills / employment history |
| Setup wizard | Per-step editors (holidays, leave types, employment×country) — US-CFG-001 |
| Org admin | Divisions, departments, legal entities, office locations CRUD APIs + UI |
| Audit | Search + CSV — US-COMP-001 |
| Roles | Assignment UI with effective dating (Super Admin) |
| Org APIs → UI | Manager relationships, project assignments, approval delegations/routing, worker import |
| Schema-gap APIs | `office_locations`, `worker_bank_accounts`, `employee_skills`, `employment_records`, LE mappings/currencies/signatories |
| Worker archive | Soft-delete/archive UI |

**Story gate:** US-HR-001/002/003, US-CFG-001, US-DOC-001/002/005, US-TAL-001/002/005, US-COMP-001, US-AUTH-003.

### W2 — Hub + Manager

- Hub cards clickable; approve/reject/open detail; bulk actions where API exists.
- Manager cockpit dual-mode IA; ApprovalsQueue deep-links to Hub.
- Team calendar five states + actions.
- Hub remains the single inbox — no new per-module approval lists.

### W3 — Harden shipped Phase 2 shells

- Nav entries for manpower / recruitment / training.
- Empty CTAs, complete creates, StatusTracker on workflows.
- Finance five-state + RBAC verify.
- Performance/OKRs/calibration/pulse: no hard-coded copy; cycle CRUD complete.
- Country pickers from config API only (never hard-coded PK/AE/SG lists).

### W4 — Employee + contractor portals

- Five states on Home, leave, calendar, profile, documents.
- Profile change requests via Hub.
- Contractor tabs loading/empty/error parity.
- Hub deep-links to correct portal screens.

### W5 — Shell / RBAC / CMS

- `RequireRole` on people-ops layout (people_ops / super_admin / hrbp as appropriate).
- Shell nav complete for intentional routes; CMS excluded.
- Hard-redirect or remove `/admin/cms/*` from product.
- Document role × screen × mutate/read matrix aligned to `@Roles` controllers.

---

## 5. Architecture notes

```text
Session (Better Auth)
    → ScopeContext.tenantId + roles + row scope
        → Controllers (@Roles + AuthGuard)
            → Services (always where tenantId = session)
                → Entities (tenantId NOT NULL)
                    → audit_log append on mutations
```

- Row scope (own/team/division/all) remains **in addition to** tenant filter — never instead of it.
- Field redaction (compensation, bank) stays server-side.
- Country rules via config tables only.

---

## 6. UX IA (People Ops)

Recommended People Ops groups (shell catalog):

1. **Operate** — Dashboard, Hub, Workers, Pre-boarding, Onboarding, Separations  
2. **Configure** — Policies, Leave admin, Templates, Letterheads, Document register  
3. **Org & access** — Org structure, Roles, Audit (Super Admin / People Ops as RBAC allows)  
4. **Talent (shipped)** — Performance, Manpower, Recruitment, Training (after W3 nav fix)  
5. **Setup** — Guided setup wizard  

Finance and CMS stay out of People Ops nav; CMS removed entirely in W5.

---

## 7. Success criteria

- No authenticated Polaris route that is title-only, stub-banner, or dead CTA (CMS gone).
- Matrix: every Phase 0 table and every shipped Phase 1–2 screen is `ok` or explicitly exempt.
- Every Polaris business table has `tenant_id`; every list/get/mutate filters by session tenant; DTOs reject client `tenantId`.
- Worker create/edit exposes all user-editable worker + schema-gap profile fields.
- Hub items actionable for the acting role.
- People Ops layout role-gated; nav matches real screens.
- Org pickers from tenant-scoped APIs (no hardcoded seed UUIDs).
- US-HR-*, US-CFG-001, US-DOC-001, US-TAL-001/002/005, US-COMP-001 pass on UI.

---

## 8. Implementation sequencing

1. User approves this design.  
2. Write wave implementation plans under `docs/superpowers/plans/` (start with W0+W0b, then W1).  
3. Execute waves with matrix updates and story checks.  
4. Evidence-layer CCM remains parallel; do not block W1 on CCM catalogue UI.

---

## Spec self-review

| Check | Result |
|---|---|
| Placeholders | None intentional; matrix seeded separately and updated per wave |
| Consistency | Waves match decisions; CMS remove vs retrofit consistent; tenancy before W1 CRUD |
| Scope | Full A+B+C via waves; non-goals explicit |
| Ambiguity | v1 single tenant + tenant-ready model locked; CMS remove locked |

## Open for user review

~~Confirm or amend~~ **Approved.** Execution starts with W0 plan; choose subagent-driven or inline execution.
