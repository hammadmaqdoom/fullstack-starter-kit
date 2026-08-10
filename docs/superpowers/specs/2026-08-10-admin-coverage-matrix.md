# Admin Coverage Matrix — Polaris

**Date:** 2026-08-10  
**Status:** Living — update as waves close rows  
**Design:** [2026-08-10-admin-ux-crud-coverage-design.md](./2026-08-10-admin-ux-crud-coverage-design.md)  
**Rules:** A row cannot be `ok` unless `tenant_id` is present (or `global-exempt`) and APIs filter by session tenant.

### Status legend

| Status | Meaning |
|---|---|
| `ok` | Schema + tenant + API + UI + RBAC complete |
| `partial` | Some layers present; gaps listed in Notes |
| `orphan` | Schema and/or API without UI (or PRD without implementation) |
| `seed-only` | Seeded/read-only config; no admin CRUD by design for v1 |
| `system-only` | System-managed; no user CRUD |
| `global-exempt` | No tenant_id by design (ISO reference) |
| `remove` | Out of Polaris product; do not wire |

---

## Organisation & tenancy

| Table / entity | PRD / story | Entity | tenant_id | API (tenant filter) | UI | RBAC | Status | Notes / wave |
|---|---|---|---|---|---|---|---|---|
| `tenants` | DB §3.1 | Y | PK | Seed | N | System | `system-only` | Digitaro v1 |
| `divisions` | §6.2, US-HR-003 | Y | Y | No CRUD | Hardcoded pickers | — | `orphan` | W1 org admin |
| `departments` | §6.2 | Y | Y | No CRUD | N | — | `orphan` | W1 |
| `legal_entities` | §6.2 | Y | Y | GET/PATCH partial | Letterheads partial | PO/SA | `partial` | W1 full CRUD |
| `legal_entity_statutory_ids` | DB | Y | Y | Seed / merge | Register merge | — | `partial` | W1 LE editor |
| `legal_entity_division_mappings` | Schema gap | Y | Y | N | N | — | `orphan` | W1 |
| `legal_entity_currencies` | Schema gap | Y | Y | N | N | — | `orphan` | W1 |
| `legal_entity_signatories` | Schema gap | Y | Y | N | N | — | `orphan` | W1 |
| `office_locations` | Schema gap | Y | Y | N | N | — | `orphan` | W1 |
| `letterhead_configs` | §6.8 | Y | Y | Y | `/people-ops/letterheads` | PO | `ok` | Verify tenant filter W0b |
| `signing_certificates` | Schema gap | Y | Y | N | N | — | `orphan` | Defer or W1 esign admin |

## Core HR

| Table / entity | PRD / story | Entity | tenant_id | API (tenant filter) | UI | RBAC | Status | Notes / wave |
|---|---|---|---|---|---|---|---|---|
| `workers` | US-HR-001 | Y | Y | Full CRUD — session `resolveTenantId` | List/create/edit; no archive UI | PO mutate; Mgr/Fin read | `partial` | W0b API tenant wired; W1 archive + full form |
| `employment_types` | §6.1.1 | Y | Y | GET | WorkerForm | Read | `seed-only` | Setup edit W1 |
| `employment_type_country_configs` | US-CFG-001 | Y | Y | GET | Statutory keys | Read | `seed-only` | Setup matrix editor W1 |
| `contractor_profiles` | US-HR-001 | Y | Y | Nested worker | WorkerForm partial | PO | `partial` | W1 |
| `worker_statutory_ids` | US-HR-001 | Y | Y | Via worker DTO | Statutory section; no expiry | PO | `partial` | W1 expiry |
| `worker_bank_accounts` | Schema gap | Y | Y | N | N | Finance redact | `orphan` | W1 |
| `employee_skills` | Schema gap | Y | Y | N | N | — | `orphan` | W1 |
| `employment_records` | Schema gap | Y | Y | N | N | — | `orphan` | W1 |
| `profile_change_requests` | US-HR-002 | Y | Y | Y | Employee + worker detail | Emp / PO / Mgr | `partial` | Hub deep-link W2 |
| `manager_relationships` | §6.2 | Y | Y | Full CRUD | Worker detail tabs | PO/SA | `ok` | W1 Task 4 |
| `project_assignments` | §6.2 | Y | Y | Full CRUD | Worker detail tabs | PO/SA | `ok` | W1 Task 4 |
| `approval_delegations` | §6.5 | Y | Y | Full CRUD | `/people-ops/approvals-config` | Controllers | `ok` | W1 Task 4 |
| `approval_routing_configs` | DB | Y | Y | Full CRUD | `/people-ops/approvals-config` | PO/SA | `ok` | W1 Task 4 |
| `worker_import_batches` | US-HR-001 | Y | Y | Import APIs | Workers list CSV dialog | PO/SA | `ok` | W1 Task 4 |

**Worker columns missing from WorkerForm (W1):** `dateOfBirth`, `departmentId`, `managerId`, `officeLocationId`, `jobTitle`, emergency contact fields, address fields, `probationEndDate`. System-only OK: `entraObjectId`, `entraStatus`.

## Country config

| Table / entity | PRD / story | Entity | tenant_id | API | UI | RBAC | Status | Notes / wave |
|---|---|---|---|---|---|---|---|---|
| `country_configs` | US-CFG-001 | Y | Y | GET | Country select | Read | `seed-only` | |
| `currency_codes` | US-CFG-002 | Y | N | Via FX | Finance FX | — | `global-exempt` | ISO |
| `tenant_currencies` | Schema gap | Y | Y | N | N | — | `orphan` | W1/setup or finance |
| `exchange_rates` | US-CFG-002 | Y | Y | FX APIs | `/finance/fx` | Finance | `ok` | W0b verify |
| `holiday_calendars` / `holidays` | §6.6.1 | Y | Y | Calendar APIs | Employee/mgr calendars; admin thin | — | `partial` | W1 leave admin |
| `leave_types` | §6.5 | Y | Y | List | Leave admin stub | PO | `partial` | W1 full CRUD |
| `setup_wizard_progress` | tasks 0.5 | Y | Y | Wizard APIs | `/admin/setup` thin | SA/PO | `partial` | W1 editors |

## RBAC & audit

| Table / entity | PRD / story | Entity | tenant_id | API | UI | RBAC | Status | Notes / wave |
|---|---|---|---|---|---|---|---|---|
| `roles` | US-AUTH-003 | Y | Y | Seed | N | — | `seed-only` | |
| `user_role_assignments` | US-AUTH-003 | Y | Y | No public CRUD | N | — | `orphan` | W1 role admin |
| `audit_log` | US-COMP-001 | Y | Y | GET list — session tenant | N | PO/SA | `orphan` | W0b API tenant wired; W1 audit UI + CSV |
| `access_review_cycles` / items | Compliance | Y | Y | Evidence CSV | N | — | `orphan` | Evidence plan / W1 DSAR entry |
| DSAR export | PRIV | Service | Session | POST export | N | — | `orphan` | W1 entry point |

## People ops workflows (Phase 1)

| Surface | Story | API | UI | Status | Notes / wave |
|---|---|---|---|---|---|
| Pre-boarding | US-TAL-005 | Y | List/invite; no create packet CTA | `partial` | W1 |
| Onboarding | US-TAL-001 | Y | Kanban + cases | `ok` | Verify five states |
| Separations | US-TAL-002 | Y | Board; no initiate CTA | `partial` | W1 |
| Policies | US-DOC-001 | Y | List-only | `partial` | W1 publish + compliance |
| Leave admin | §6.5 | Partial | Stub banner | `orphan` | W1 |
| Templates / register | US-DOC-002/005 | Y | Y | `ok` | |
| Hub | UX / US-EMP | Y | Cards non-actionable | `partial` | W2 |
| Manager cockpit | Manager | Y | Me-mode dead-end | `partial` | W2 |

## Phase 2 shells already shipped

| Surface | Story | UI | Nav | Status | Notes / wave |
|---|---|---|---|---|---|
| Manpower | US-TAL / §6.19 | CRUD present | Not in shell catalog | `partial` | W3 nav + polish |
| Recruitment | US-TAL-003 | CRUD present | Not in catalog | `partial` | W3; config countries |
| Training | §6.16 | CRUD present | Not in catalog | `partial` | W3 |
| Performance / OKRs / calibration / pulse | US-TAL-004 | CRUD present | Performance in nav; subpages linked | `partial` | W3 polish |
| Finance pay-runs / benefits / statutory / contractor / FX | Phase 2 | Present + RequireRole | Finance group | `partial` | W3 five-state verify |

## Evidence layer (separate plan)

| Table | Entity | tenant_id | API | UI | Status | Notes |
|---|---|---|---|---|---|---|
| `compliance_programme` | Y (migration present) | Y | Own plan | Own plan | Track separately | Do not block W1 |
| `compliance_controls` | Y | Y | Own plan | Own plan | Track separately | |
| `control_framework_maps` | Y | Y | Own plan | Own plan | Track separately | |
| `control_test_runs` | Y | Y | Own plan | Own plan | Track separately | |
| `control_evidence_links` | Y | Y | Own plan | Own plan | Track separately | |

## Starter-kit CMS (remove)

| Area | tenant_id | Status | Wave |
|---|---|---|---|
| `/admin/cms/*` + `backend/src/api/**` content/media/seo/analytics | N | `remove` | W5 — no tenant retrofit |

## Auth (system)

| Table | tenant_id | Status | Notes |
|---|---|---|---|
| Better Auth `user` / `session` / `account` / … | N (auth plane) | `system-only` | Link via tenant-scoped role assignments / workers |

---

## Wave closure checklist

When closing a wave, for each touched row:

- [ ] `tenant_id` column / exemption filled  
- [ ] API filter verified (or seed-only)  
- [ ] UI meets screen contract  
- [ ] RBAC mutate CTAs match server  
- [ ] Cross-tenant negative test for new writes  
- [ ] Status updated to `ok` or justified exemption  
