# Polaris — Build Checklist

**Product:** Polaris  
**Generated from:** [prd.md](../project-requirements/prd.md) · [srs.md](../project-requirements/srs.md) · [user-stories.md](../project-requirements/user-stories.md)  
**Last updated:** 10 July 2026 (Phase 0/1 gap closure)

> Phased implementation checklist. Check items as completed. Each phase has a go-live gate before proceeding.  
> **Enterprise scale:** [enterprise-readiness.md](../project-requirements/enterprise-readiness.md) — UX patterns and technical seams phased T1→T3.

---

## Pre-build setup

- [ ] Development environment running (`start-dev.sh` or backend + frontend separately) — verify locally
- [x] PostgreSQL + Redis via Docker Compose — `backend/docker-compose.dev.yml`
- [ ] Azure Key Vault access configured (staging) — env/ops
- [ ] Entra ID app registration (OIDC client ID/secret) — env/ops
- [ ] Review all docs in `docs/project-requirements/` and `docs/compliance/` — team sign-off
- [x] Design tokens — `polaris-theme.ts` + CSS vars in `global.css`; PrimeProvider wired

---

## Phase 0 — Foundations

**Go-live gate:** Entra SSO works; worker CRUD with audit log; country config seeded.

**Status (10 Jul 2026):** **Code complete** — ops items (Key Vault staging, Entra app) and setup-wizard full edit surfaces remain.

### 0.1 Infrastructure & auth

- [x] NestJS module structure scaffolded — `backend/src/modules/polaris.module.ts`
- [x] Better Auth + Entra OIDC (employees) — `auth/entra/`, `SignInForm` Microsoft tab
- [x] Better Auth email auth (contractors) — magic-link tab
- [x] RBAC guards + row-level scope — `RbacGuard` + `RowScopeService`
- [x] `ScopeContext` + `RowScopeService` — `shared/scope/scope-context.type.ts`, `ScopeContextFactory`
- [x] Append-only `audit_log` — table + `AuditLogService.append()` on mutations + `GET /api/v1/audit-log` list (People Ops); Nest interceptor not used (explicit append avoids duplicates)
- [x] `tenant_id` on core tables — `DIGITARO_TENANT_ID`
- [x] Azure Blob storage adapter — `services/azure/azure-blob.service.ts`; preferred over S3 when `AZURE_STORAGE_CONNECTION_STRING` set

### 0.2 Country configuration

- [x] `countries`, `employment_types`, `employment_type_country_configs` entities + migrations
- [x] `currencies`, `exchange_rates`, `country_currency_configs` entities
- [x] Frankfurter FX daily BullMQ job
- [x] Seed: PK/UAE/SG currencies + employment types + type×country matrix

### 0.3 Core HR

- [x] `workers`, `departments`, `divisions`, `legal_entities` entities
- [x] Worker CRUD with country-conditional statutory fields
- [x] Schema gap closure wave (2026-08-10) — entities + migrations per `docs/superpowers/specs/2026-08-10-schema-gap-closure-design.md`; API/UI wiring deferred
- [x] `contractor_profiles`
- [x] `manager_relationships`, `project_assignments` (effective-dated) — APIs + tests
- [x] `approval_delegations` entity
- [x] Org chart + directory APIs (lazy subtree, scoped search)
- [x] Server-side pagination + search — workers, directory, audit log
- [x] Effective-dated role assignments in APIs
- [x] `profile_change_requests` workflow
- [x] `entra_status` + Entra webhook — `POST /api/v1/webhooks/entra`
- [x] Soft-delete on separation — `separation.service.ts` archives worker after clearance + LWD

### 0.4 Frontend foundations

- [x] PWA shell — `public/manifest.json`, `sw.js`, metadata in root layout; offline punch queue
- [x] Design system tokens — `polaris-theme.ts` + global CSS vars
- [x] Login: Entra SSO + contractor email
- [x] Role-based routing — `RequireRole` + `useRequireRole` on role routes
- [x] Shared components — `StatusChip`, `StatusTracker`, `RequestCard`, `HubItemCard`, `PageSkeleton`
- [x] Mobile tab bar — `MobileTabBar` in `AuthenticatedShell`

### 0.5 Setup wizard

- [x] Guided setup wizard API — `setup-wizard.service.ts`
- [x] Setup wizard UI — country config, leave/holiday editors, LE + employment matrix review (`SetupWizard.tsx` W1 Task 10)
- [x] Reusable tenant seed engine
- [x] Seed: holidays, leave types, document templates — `benefit_types` seeded (not separate pack entities)
- [x] Progress tracking and skip logic

### 0.6 Admin UX + CRUD coverage (W0 / W0b)

- [x] Thin UI specs — `docs/design-specs/ui-specifications/{shared-components,people-ops,manager,admin-setup,finance}.md`
- [x] Coverage matrix — `docs/superpowers/specs/2026-08-10-admin-coverage-matrix.md`
- [x] Design — `docs/superpowers/specs/2026-08-10-admin-ux-crud-coverage-design.md`
- [x] Tenant seam — `resolveTenantId` / `assertSameTenant`; workers/org/audit/leave/policy/pre-boarding/separation controllers
- [x] `PageHeader` + people-ops `RequireRole` layout
- [x] Tenant query sweep notes — `docs/superpowers/specs/2026-08-10-tenant-query-sweep.md`
- [x] W1 People Ops CRUD/UX — see `docs/superpowers/plans/2026-08-10-admin-ux-crud-w1-people-ops.md` (gate closed; residual: bank/skills/employment_records nested APIs)

---

## Phase 1 — MVP (daily-value core)

**Go-live gate:** Employee daily flows work; e-sign complete; policy acknowledgement 100%; onboarding end-to-end.

**Status (10 Jul 2026):** **Implementation complete** — quality gate (WCAG, UAT, responsive review) requires human sign-off.

### 1.1 Employee portal

- [x] Home / Today dashboard
- [x] One-tap check-in/check-out
- [x] Offline check-in queue (PWA)
- [x] Staff calendar + team toggle
- [x] Leave request flow + balances
- [x] Unified Hub inbox — Mine + For me
- [x] Hub scope filters + saved views + bulk actions
- [x] Company directory
- [x] Me / Profile with change requests
- [x] Notification system: digests, quiet hours, channels
- [x] Timezone rendering
- [x] Human moments: birthdays, anniversaries, welcome

### 1.2 Leave & attendance

- [x] `leave_types`, `leave_balances`, `leave_requests`
- [x] Accrual rules engine
- [x] Leave approval + delegation
- [x] Comp-off credits — `comp_off_credits` API + manager grant
- [ ] Tenure-tier leave entitlements — employment-type overrides in config exist; dedicated tenure-tier UI/display on leave balances not built
- [x] `holiday_calendars`, `holidays`, `work_week_patterns`
- [x] `attendance_punches`, `attendance_day_summaries`
- [x] Geolocation + IP fallback
- [x] `punch_correction_requests`
- [x] `shift_rosters`, `shift_assignments`
- [x] Team calendar with live status

### 1.7 Performance management (IPMS)

- [x] OKRs, goals, feedback, 1:1s entities + API
- [x] Talent module RBAC + audit_log
- [x] Employee / manager / People Ops performance UI shells
- [x] Hub tasks for pending reviews, 1:1s, IDP actions
- [x] OKR admin UI — `people-ops/performance/okrs`
- [x] Worker picker — `WorkerPicker.tsx` on feedback forms

### 1.8 Manager experience

- [x] Me/Team toggle
- [x] Manager cockpit
- [x] Approvals queue + swipe + bulk approve
- [x] Teams adaptive card notifications

### 1.4 Documents & policies

- [x] Policies + population rules + mandatory ack + compliance dashboard
- [x] Document templates + rich-text editor + merge validation
- [x] `letterhead_configs` per legal entity — `people-ops/letterheads`
- [x] Document generation workflow
- [x] Draft → Issue + immutable `document_number`
- [x] Render profiles: `full_digital`, `print_on_letterhead`, `informational`
- [x] Per-entity stamp config — letterhead admin; wet-stamp export checklist on register export
- [x] Document register — `people-ops/documents/register`
- [x] Merge field validation

### 1.5 Native e-signature

- [x] Full e-sign platform — lifecycle, signing UI, PAdES/Key Vault, CoC PDF, reminders, contractor token + `/esign/sign` page

### 1.6 Onboarding & separation

- [x] Full onboarding + pre-boarding AE/SG + merge job + separation clearance + Entra provision/disable

### 1.7 Automation & reports

- [x] Compliance alerts (visa, probation, statutory) + custom `alert_rules`
- [x] Birthday/anniversary alerts
- [x] Standard reports + scheduled subscriptions
- [x] Report async export — BullMQ CSV + email delivery

### 1.8 People Ops admin

- [x] HR dashboard, workers, onboarding/separation boards, templates, letterheads, register, leave admin

### 1.9 Phase 1 quality gate

- [ ] All Phase 1 user stories acceptance criteria met
- [ ] WCAG 2.1 AA audit — `docs/compliance/wcag-phase1-audit-checklist.md`
- [ ] Responsive review at 375px, 768px, 1280px
- [ ] Security review: RBAC, audit log, field redaction
- [ ] Compliance flows FLW-* verified with evidence
- [ ] Performance: common pages < 1.5s
- [ ] Internal UAT — `docs/compliance/phase1-uat-signoff.md`

---

## Phase 2 — Full operations & talent

**Go-live gate:** Finance export packs; contractor invoices end-to-end; payroll calculation approved by Finance.

### 2.0 Enterprise governance (big org — T2)

- [x] HRBP / regional admin role — row scope = `country` or `legal_entity` (not just division) — `PolarisRoleCode.HRBP` + `ScopeType.COUNTRY`/`LEGAL_ENTITY` in `RowScopeService`
- [ ] Delegated admin surfaces — scoped People Ops / Finance admin per country or legal entity (row scope now supports it; dedicated admin UI not built)
- [x] Approval routing config — leave/expenses/travel: amount thresholds, parallel vs serial approvers, escalation after N days — `ApprovalRoutingConfigEntity` + API
- [x] Bulk worker import/update — CSV validation preview → async BullMQ job → audit per row — `POST /api/v1/workers/import` (+ preview), `CoreHr` queue
- [x] Access review module — quarterly certification workflow (FLW-SEC + [deferred-compliance-work.md](../compliance/deferred-compliance-work.md) §3) — `access_review_cycles`/`items`, certify/revoke API
- [x] Leadership analytics — headcount, attrition, leave liability, visa pipeline by division + legal entity + location — `GET /api/v1/analytics/leadership/*`
- [x] Onboarding template routing — A/B or variant selection by location (config tables) — `OnboardingTemplateEntity.countryCode` + `resolveDefaultTemplate` fallback (pre-existing)

### 2.1 Currency & FX (extended)

- [x] FX management UI: catalog, fetch status, override/approve — `finance/fx/page.tsx`
- [ ] Reporting currency dashboards
- [x] Variance threshold alerts — `FxVarianceAlertConfigEntity` + config UI

### 2.2 Benefits & payroll

- [x] `benefit_types`, `benefit_type_fields`, `employee_benefits` (dynamic fields)
- [ ] Benefit type seed packs PK/UAE/SG — BASIC_SALARY + draft statutory via PayrollSeedService; added AE EOSB gratuity + life/dental/wellness; full country packs still thin
- [x] `pay_components`, `compensation_records`
- [x] `statutory_rate_schedules`, `statutory_rate_entries`
- [x] `pay_runs`, `pay_run_line_items`, anomaly detection
- [x] Pay run approval gate (single)
- [x] `payslips` + employee self-service
- [x] `pay_run_export_batches` (PDF + Excel)
- [x] Finance export column mappings per country/entity
- [x] Payout rails (Aspire primary / Wise secondary / manual bank CSV) — funding accounts, Model C corridor resolver, payout batches, webhooks, remittance ref linkage
- [x] Expense settlement modes (`bundle_with_payroll` | `standalone_payout` | `export_only`) with double-pay guard
- [x] Aspire bank feed sync + match API + Finance UI
- [x] Corporate cards (Aspire/Wise) + allocate to draft `export_only` expense

### 2.3 Contractor portal

- [x] Contractor 4-tab portal (UX §6.5)
- [x] `contractor_invoices`, `contractor_invoice_line_items`
- [x] Invoice OCR pre-fill — `POST /contractor-invoices/ocr-prefill`; stub (no provider wired), same pattern as `expense_claims`
- [x] Invoice approval: Manager → Finance
- [x] `contractor_payment_batches` + export
- [x] `remittance_corridor_configs`, `remittance_packs`, `remittance_pack_documents` (FLW-PAY-005)
- [x] Payment advice PDF generation (employee + contractor) — `RemittanceService.generatePaymentAdvice` (employee/`PAY_RUN_LINE` packs); contractor `CONTRACTOR_PAYMENT_LINE` variant deferred
- [x] Finance SWIFT upload on pay run lines + contractor lines
- [x] Employee payslip remittance checklist + ZIP
- [x] Contractor invoice remittance checklist + ZIP
- [x] Payment status tracker to "Paid on {date}"

### 2.4 Operations

- [x] `expense_claims` with policy limits and OCR — backend + employee UI (`employee/expenses`); OCR is a stub (no provider wired)
- [x] `travel_requests`, `travel_itineraries` — backend + employee UI (`employee/travel`)
- [x] `help_desk_tickets`, `ticket_comments` (HR/IT/Admin/Finance queues) — backend + employee UI (`employee/help`)
- [x] SLA tracking on tickets — `slaTargetHours`/`slaDueAt`/`slaBreached` on ticket entity + detail UI badge

### 2.5 Talent modules

- [x] Recruitment: `job_requisitions`, `candidates`, `interview_scorecards` — backend + `people-ops/recruitment` UI
- [x] Performance (IPMS): cycles, goals, feedback, 1:1, OKRs, reviews, IDPs, pulse — `backend/src/modules/talent/`
- [x] Performance: probation auto-cycle BullMQ job (T-14 days) — `worker/queues/talent/`
- [x] Performance: calibration board UI (Division Head) — `people-ops/performance/calibration`
- [x] Performance: pulse survey respondent UI — `employee/performance/pulse`
- [x] Training: `training_courses`, `training_assignments`, `training_completions` — backend + `people-ops/training` UI
- [x] Manpower: `manpower_plans`, `manpower_positions` — backend + `people-ops/manpower` UI

### 2.6 Finance admin surfaces

- [x] Benefit type builder UI (UX §6.4)
- [x] Pay run review grid (UX §6.4)
- [x] Statutory rate UI with impact preview
- [x] Contractor payment batch UI
- [x] Payroll reports: register, deductions, variance — `GET /api/v1/reports/payroll-register`, `-deductions`, `-variance`

### 2.7 Phase 2 quality gate

- [ ] Finance UAT: pay run → export → manual Xero entry dry run
- [ ] Contractor portal UAT end-to-end
- [ ] All Phase 2 user stories acceptance criteria met
- [x] DSAR basic export API (runbook: [deferred-compliance-work.md](../compliance/deferred-compliance-work.md) §2) — `POST /api/v1/compliance/dsar/export`
- [x] Quarterly access review export ready (runbook §3) — `GET /api/v1/compliance/evidence/access-review`
- [x] People-domain evidence layer Wave 1 — control catalogue, adapters, scheduled tests, `GET /compliance/evidence/status|export`, People Ops UI ([plan](../superpowers/plans/2026-08-10-people-domain-evidence-layer.md))

---

## Phase 3 — Strategic & enterprise productization (backlog)

### 3.0 Enterprise customers (T3)

- [ ] Tenant control plane — provision tenant, seed country packs, assign super admin, isolate blob prefixes
- [ ] Identity flexibility — SAML/OIDC per customer; SCIM user provisioning (Entra remains Digitaro default)
- [ ] Deployment tiers ADR — shared multi-tenant (SME) vs dedicated instance (enterprise)
- [ ] Light workflow builder — configurable approval steps per employment type × country (config tables, not full BPM)
- [ ] SOC 2 Type II readiness assessment ([deferred-compliance-work.md](../compliance/deferred-compliance-work.md) §1) — start evidence 6–12 months pre-contract

### 3.1 Product & analytics

- [ ] Advanced People analytics dashboards (cross-tenant benchmarks — productization only)
- [ ] External job board API integrations (LinkedIn, etc.)
- [ ] Multi-tenant productization evaluation
- [ ] "Ask Polaris" conversational assistant (IA placeholder exists UX §6.1.9)

### 3.2 Deferred UX

- [ ] Dark mode (deferred: [deferred-compliance-work.md](../compliance/deferred-compliance-work.md) §4)
- [ ] Urdu/Arabic UI (out of scope v1)

---

## Compliance verification checklist

- [ ] All flows in [feature-flows.md](../compliance/feature-flows.md) implemented with controls
- [x] Evidence catalogue exportable — `GET /api/v1/compliance/evidence/export` + People Ops catalogue
- [ ] 5-year retention policy enforced
- [ ] Segregation of duties matrix verified
- [ ] Append-only tables have no UPDATE/DELETE grants at DB level
- [ ] Policy acknowledgement compliance report scheduled monthly

---

## Document control

| Version | Date | Changes |
|---|---|---|
| 1.3 | 10 Jul 2026 | Phase 0/1 gap closure: ScopeContext, audit list, manager/project APIs, Azure Blob, Entra webhook, separation archive, PWA, route guards, letterhead/issue/register, comp-off, alert_rules, hub perf, OKR admin, worker picker |
| 1.2 | 10 Jul 2026 | Phase 0 audit: checked completed items; refined partials |
| 1.1 | 9 Jul 2026 | Enterprise readiness phased T1–T3 |
| 1.0 | 26 Jun 2026 | Initial build checklist |
