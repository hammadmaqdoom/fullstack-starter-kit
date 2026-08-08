# Polaris — AI Prompts for Implementation

Copy-paste prompts for Cursor/Claude when building Polaris features.  
**Prerequisites:** specs exist in `docs/`; item is in current phase in `docs/generated/tasks.md`.

---

## How to use

1. Confirm the feature is in the **current phase** (`tasks.md`)
2. Start a **new chat** per bounded-context task (keeps context clean)
3. Paste the **context block** first, then the **task prompt**
4. Reference exact spec sections — do not paraphrase requirements
5. After completion, verify against user story acceptance criteria

**Build plan:** `docs/superpowers/plans/2026-07-03-polaris-build-plan.md`

---

## Context block (paste at top of every implementation chat)

```
Project: Polaris (Digitaro internal HRMS). Repo: hrms.
Stack: NestJS 10 + TypeORM + PostgreSQL + Next.js 16 + PrimeReact + Better Auth + Entra OIDC.
Rules: Read docs/AGENTS.md. Country rules via config tables only. Every mutation writes audit_log.
RBAC + row scope server-side. Phase-gated per docs/generated/tasks.md.
Do NOT use NextAuth. Do NOT hard-code PK/UAE/SG. Lucide icons only.
```

---

## Phase 0 prompts

### P0-1: Scaffold HR modules + API envelope

```
Implement Task 0.1 from docs/superpowers/plans/2026-07-03-polaris-build-plan.md:

1. Create backend/src/modules/ with empty modules: core-hr, country-config, compliance
2. Add ApiEnvelopeInterceptor wrapping all /api/v1/ responses as { data, meta, errors }
3. Register modules in app.module.ts
4. Write unit test for envelope interceptor (TDD)
5. Follow backend/AGENTS.md patterns

Do not implement business logic yet. Run tests before finishing.
```

### P0-2: Tenant + audit_log

```
Implement Task 0.2 from the build plan.

Specs:
- docs/project-requirements/database-design.md (audit_log, tenants)
- docs/compliance/feature-flows.md FLW-SEC-001

Create:
- tenants + audit_log entities and migration
- AuditLogService.append() — immutable entries
- AuditLogInterceptor on all mutation endpoints
- Seed single Digitaro tenant
- Unit tests for AuditLogService

Append-only: no updated_at on audit_log. Every create/update/delete on business entities must log actor, action, entity, diff.
```

### P0-3: RBAC + row scope

```
Implement Task 0.3 from the build plan.

Specs: PRD §5 roles, docs/compliance/iso-soc-framework.md §3

Create:
- roles + user_role_assignments entities, seed PRD roles
- RbacGuard + @Roles() decorator
- RowScopeService (own / team / division / all)
- Tests: employee cannot list all workers; manager sees team only

Wire guard globally on /api/v1/* except health and auth callbacks.
```

### P0-4: Entra OIDC dual auth

```
Implement Task 0.4 from the build plan.

Specs: docs/project-requirements/api-specification.md §2

Backend:
- GET /api/v1/auth/entra/login + callback
- Keep contractor POST /api/v1/auth/contractor/login

Frontend:
- Sign-in page: "Sign in with Microsoft" + contractor email tab
- Use existing Better Auth client patterns in frontend/src/libs/BetterAuth.ts

E2E test with mocked Entra callback. Do not use NextAuth.
```

### P0-5: Country config + FX seed

```
Implement Task 0.5 from the build plan.

Specs: PRD §6.1.1, §7, database-design.md §3.2

Entities: countries, employment_types, employment_type_country_configs,
currency_codes, exchange_rates, country_currency_configs

Seed: PK/UAE/SG, currencies PKR/AED/SGD/USD, employment types FULL_TIME/PART_TIME/CONTRACTOR/etc.
BullMQ job: daily Frankfurter FX fetch into exchange_rates.

API: GET /api/v1/config/countries, GET /api/v1/config/employment-types
No if (country === 'PK') branches anywhere.
```

### P0-6: Worker CRUD

```
Implement Task 0.6 from the build plan.

Specs:
- PRD §6.1
- docs/compliance/feature-flows.md FLW-HR-001
- docs/project-requirements/api-specification.md /workers
- docs/design-specs/ui-specifications/people-ops.md

Backend:
- workers, departments, divisions, legal_entities, contractor_profiles, manager_relationships
- POST/GET/PATCH /api/v1/workers with RBAC + audit_log + field redaction
- Country-conditional statutory fields via employment_type_country_configs

Tests: create PK full-time worker; audit entry exists; employee role gets 403 on list.

Then frontend People Ops worker list + form (PrimeReact DataTable, country-conditional fields).
```

### P0-7: Setup wizard

```
Implement Task 0.9 from the build plan.

Specs: docs/design-specs/ux-design-specs.md §7, ui-specifications/admin-setup.md

Guided Stepper UI seeding holidays, leave types, benefit packs, document templates for PK/UAE/SG.
Progress tracking with skip logic for completed steps.
```

---

## Phase 1 prompts (use when Phase 0 gate passed)

### P1-ATT: Attendance check-in

```
Implement attendance check-in per Phase 1 Epic 1B in the build plan.

Specs: PRD §6.6, UX §6.1.3, FLW-TIME-003

Backend: attendance_punches, attendance_day_summaries, POST /api/v1/attendance/punch
Frontend: one-tap check-in on employee Home; optional geolocation (non-blocking)
PWA: offline queue for punches when navigator.onLine is false
Status tracker on punch correction requests.
```

### P1-LEAVE: Leave request flow

```
Implement leave management per Phase 1 Epic 1C.

Specs: PRD §6.5, UX §6.1.5, FLW-TIME-001

Entities: leave_types, leave_balances, leave_requests
3-field max leave request form. Accrual rules from config. Approval workflow with delegation.
Staff calendar auto-built from holidays + leave. Team toggle for managers.
```

### P1-HUB: Unified inbox

```
Implement the Hub per UX §5.1.

Backend: GET /api/v1/hub aggregating pending items (leave approvals, profile changes,
policy acks, e-sign, onboarding tasks) scoped to current user.

Frontend: Hub page with Mine + For me tabs. NOT separate per-module request lists.
Mobile: swipe-to-approve for managers.
```

### P1-POLICY: Policy acknowledgements

```
Implement policy distribution per PRD §6.7, FLW-DOC-001.

Entities: policies, policy_versions, policy_acknowledgements
Block login until current mandatory policies acknowledged.
People Ops compliance dashboard showing % acknowledged per policy version.
```

### P1-ESIGN: E-sign envelope (bounded context)

```
Implement esign module per PRD §6.13, FLW-DOC-003.

Isolated backend/src/modules/esign/ — do not leak into documents module.
Envelope lifecycle: draft → sent → in_progress → completed/voided
Append-only esign_audit_events. Manual PDF upload fallback path.
Contractor signing via email-verified token (no Entra).
Defer PAdES sealing to background job if cert not ready.
```

### P1-ONBOARD: Onboarding pipeline

```
Implement onboarding per PRD §6.3, FLW-TAL-002, FLW-TAL-006, FLW-SEC-006.

Pre-boarding passport/visa capture for AE/SG. Onboarding kanban for People Ops.
entra_provisioning_jobs + Graph API integration. Auto-generate docs on start.
New-hire welcome screen UX §10.4.
```

---

## Full-stack feature prompt (generic template)

Replace `{MODULE}`, `{PRD_SECTION}`, `{FLW_ID}`, `{API_PATH}`, `{UI_SPEC}`:

```
Implement {MODULE} for Polaris.

Read before coding:
- docs/project-requirements/prd.md {PRD_SECTION}
- docs/compliance/feature-flows.md {FLW_ID}
- docs/project-requirements/database-design.md (relevant tables)
- docs/project-requirements/api-specification.md {API_PATH}
- docs/design-specs/ui-specifications/{UI_SPEC}
- docs/project-requirements/user-stories.md (acceptance criteria)

Backend (TDD):
1. Entity + migration with tenant_id
2. DTOs with class-validator
3. Service with RBAC, row scope, audit_log on mutations
4. Controller at /api/v1/...
5. Unit + e2e tests

Frontend:
1. Page under app/[locale]/(auth)/...
2. PrimeReact components per component-mapping.md
3. Status tracker on workflows
4. Five UI states (skeleton, empty, error, offline, success)
5. i18n keys in `locales/en.json` only (English — no ar/fr/RTL)

Verify every acceptance criterion. Check off item in docs/generated/tasks.md.
Do not implement anything outside current phase.
```

---

## Bug fix prompt

```
Bug in Polaris {AREA}.

1. Read the matching FLW-* flow and PRD section — confirm expected behaviour
2. Reproduce with a failing test (regression test required)
3. Fix minimal diff — no scope creep
4. Verify RBAC, audit_log, and field redaction still correct
5. Run: cd backend && pnpm test && cd frontend && pnpm check:types
```

---

## Code review prompt

```
Review this Polaris change against:
- docs/compliance/feature-flows.md (controls implemented?)
- docs/project-requirements/user-stories.md (acceptance criteria met?)
- Country config layer used (no hard-coded PK/UAE/SG)?
- audit_log on all mutations?
- RBAC + row scope on queries?
- Field redaction for sensitive data?
- Status tracker on workflow UIs?
- Current phase in tasks.md respected?

List blockers vs suggestions. Cite file:line for issues.
```

---

## Refinement prompt (UI)

```
Adjust {SCREEN} to match docs/design-specs/ui-specifications/{SPEC}.md and wireframe {WIREFRAME}.md.

Specific change: {DESCRIBE WITH MEASUREMENTS}

Keep: PrimeReact components, Lucide icons, five UI states, responsive at 375/768/1280px.
If the change establishes a new pattern, update docs/design-specs/design-system.md changelog.
```

---

## Anti-patterns (do not prompt for these)

- "Build a generic user CRUD" — use worker CRUD with Polaris entities
- "Add NextAuth for Entra" — use Better Auth OIDC plugin
- "Integrate Xero API" — export packs only, Phase 2
- "Hard-code Pakistan leave rules" — use employment_type_country_configs
- "Build payroll now" — Phase 2 gate not reached

---

## Quick reference

| Need | Prompt ID |
|---|---|
| Module scaffold | P0-1 |
| Audit log | P0-2 |
| RBAC | P0-3 |
| Entra auth | P0-4 |
| Country config | P0-5 |
| Worker CRUD | P0-6 |
| Setup wizard | P0-7 |
| Check-in | P1-ATT |
| Leave | P1-LEAVE |
| Hub | P1-HUB |
| Policies | P1-POLICY |
| E-sign | P1-ESIGN |
| Onboarding | P1-ONBOARD |
| Any feature | Generic template |
| Bug | Bug fix prompt |
| Review | Code review prompt |
