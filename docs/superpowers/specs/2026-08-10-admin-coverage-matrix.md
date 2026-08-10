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
| `divisions` | §6.2, US-HR-003 | Y | Y | Full CRUD | `/people-ops/org` | PO/SA | `ok` | W1 Task 1–2 |
| `departments` | §6.2 | Y | Y | Full CRUD | `/people-ops/org` | PO/SA | `ok` | W1 Task 1–2 |
| `legal_entities` | §6.2 | Y | Y | Full CRUD + children | `/people-ops/org` + manage dialog | PO/SA | `ok` | W1 Task 1–2 / 11 |
| `legal_entity_statutory_ids` | DB | Y | Y | Seed / merge | Register merge | — | `partial` | Seed path; deep editor deferred |
| `legal_entity_division_mappings` | Schema gap | Y | Y | Nested under LE | Org LE manage dialog | PO/SA | `ok` | W1 Task 11 |
| `legal_entity_currencies` | Schema gap | Y | Y | Nested under LE | Org LE manage dialog | PO/SA | `ok` | W1 Task 11 |
| `legal_entity_signatories` | Schema gap | Y | Y | Nested under LE | Org LE manage dialog | PO/SA | `ok` | W1 Task 11 |
| `office_locations` | Schema gap | Y | Y | Full CRUD | `/people-ops/org` | PO/SA | `ok` | W1 Task 1–2 |
| `letterhead_configs` | §6.8 | Y | Y | Y | `/people-ops/letterheads` | PO | `ok` | Verify tenant filter W0b |
| `signing_certificates` | Schema gap | Y | Y | N | N | — | `orphan` | Defer — esign admin / later wave |

## Core HR

| Table / entity | PRD / story | Entity | tenant_id | API (tenant filter) | UI | RBAC | Status | Notes / wave |
|---|---|---|---|---|---|---|---|---|
| `workers` | US-HR-001 | Y | Y | Full CRUD + archive — session tenant | List/create/edit/archive + CSV import | PO mutate; Mgr/Fin read | `ok` | W1 Task 3–4; nested bank/skills/records still open |
| `employment_types` | §6.1.1 | Y | Y | GET | WorkerForm + setup | Read | `seed-only` | |
| `employment_type_country_configs` | US-CFG-001 | Y | Y | GET | Setup countries step matrix | Read | `seed-only` | Review in setup; mutate API not required for Digitaro v1 |
| `contractor_profiles` | US-HR-001 | Y | Y | Nested worker | WorkerForm | PO | `ok` | W1 Task 3 |
| `worker_statutory_ids` | US-HR-001 | Y | Y | Via worker DTO | Statutory section | PO | `partial` | Expiry UX still thin |
| `worker_bank_accounts` | Schema gap | Y | Y | N | N | Finance redact | `orphan` | Residual — needs encryption before API |
| `employee_skills` | Schema gap | Y | Y | N | N | — | `orphan` | Residual nested profile API |
| `employment_records` | Schema gap | Y | Y | N | N | — | `orphan` | Residual nested profile API |
| `profile_change_requests` | US-HR-002 | Y | Y | Y | Employee + worker detail | Emp / PO / Mgr | `partial` | Hub deep-link W2 |
| `manager_relationships` | §6.2 | Y | Y | Full CRUD | Worker detail tabs | PO/SA | `ok` | W1 Task 4 |
| `project_assignments` | §6.2 | Y | Y | Full CRUD | Worker detail tabs | PO/SA | `ok` | W1 Task 4 |
| `approval_delegations` | §6.5 | Y | Y | Full CRUD | `/people-ops/approvals-config` | Controllers | `ok` | W1 Task 4 |
| `approval_routing_configs` | DB | Y | Y | Full CRUD | `/people-ops/approvals-config` | PO/SA | `ok` | W1 Task 4 |
| `worker_import_batches` | US-HR-001 | Y | Y | Import APIs | Workers list CSV dialog | PO/SA | `ok` | W1 Task 4 |

**Worker nested residual (post-W1):** bank accounts (encryption), skills, employment_records APIs/UI. Core profile columns + archive shipped in Task 3.

## Country config

| Table / entity | PRD / story | Entity | tenant_id | API | UI | RBAC | Status | Notes / wave |
|---|---|---|---|---|---|---|---|---|
| `country_configs` | US-CFG-001 | Y | Y | GET | Country select | Read | `seed-only` | |
| `currency_codes` | US-CFG-002 | Y | N | Via FX | Finance FX | — | `global-exempt` | ISO |
| `tenant_currencies` | Schema gap | Y | Y | N | Setup currencies step (prefs) | — | `partial` | Full tenant_currencies CRUD → finance wave |
| `exchange_rates` | US-CFG-002 | Y | Y | FX APIs | `/finance/fx` | Finance | `ok` | W0b verify |
| `holiday_calendars` / `holidays` | §6.6.1 | Y | Y | Admin CRUD | Leave admin + setup | PO/SA | `ok` | W1 Task 5 / 10 |
| `leave_types` | §6.5 | Y | Y | Admin CRUD | Leave admin + setup | PO/SA | `ok` | W1 Task 5 / 10 |
| `setup_wizard_progress` | tasks 0.5 | Y | Y | Wizard APIs | `/admin/setup` editors | SA/PO | `ok` | W1 Task 10 |

## RBAC & audit

| Table / entity | PRD / story | Entity | tenant_id | API | UI | RBAC | Status | Notes / wave |
|---|---|---|---|---|---|---|---|---|
| `roles` | US-AUTH-003 | Y | Y | Seed + list | Roles admin | — | `seed-only` | Codes seeded; assignments CRUD separate |
| `user_role_assignments` | US-AUTH-003 | Y | Y | List/create/revoke | `/people-ops/roles` | SA mutate; PO read | `ok` | W1 Task 9 |
| `audit_log` | US-COMP-001 | Y | Y | GET list + CSV export — session tenant | `/people-ops/audit` | PO/SA | `ok` | W1 Task 8 |
| `access_review_cycles` / items | Compliance | Y | Y | Evidence CSV | N | — | `orphan` | Evidence plan — not W1 blocker |
| DSAR export | PRIV | Service | Session | POST export | N | — | `orphan` | Evidence / privacy wave — not W1 blocker |

## People ops workflows (Phase 1)

| Surface | Story | API | UI | Status | Notes / wave |
|---|---|---|---|---|---|
| Pre-boarding | US-TAL-005 | Y | List + create packet CTA | `ok` | W1 Task 7 |
| Onboarding | US-TAL-001 | Y | Kanban + cases | `ok` | Verify five states |
| Separations | US-TAL-002 | Y | Board + initiate CTA | `ok` | W1 Task 7 |
| Policies | US-DOC-001 | Y | Create/publish + compliance tab | `ok` | W1 Task 6 |
| Leave admin | §6.5 | Full admin CRUD | `/people-ops/leave` | `ok` | W1 Task 5 |
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

- [x] `tenant_id` column / exemption filled  
- [x] API filter verified (or seed-only) — W1 controllers use `resolveTenantId(session)`  
- [x] UI meets screen contract — PageHeader / EmptyState / five states on new screens  
- [x] RBAC mutate CTAs match server  
- [x] Cross-tenant negative test for new writes (org-admin LE children + prior W0b/W1 suites)  
- [x] Status updated to `ok` or justified exemption  

### W1 gate (2026-08-10)

**Closed for People Ops / Super Admin primary surfaces.** Residual orphans justified:

- Nested worker bank / skills / employment_records (encryption + nested APIs)
- `signing_certificates`, DSAR / access-review entry (later waves)
- Hub / manager deep UX (W2); Phase 2 shell polish (W3); CMS remove (W5)
