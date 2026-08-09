# People-Domain Evidence Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Polaris Wave 1 people-domain GRC-lite: restore `docs/compliance/*`, control catalogue with framework crosswalk, scheduled adapter tests + history, Control Evidence API/export, Hub alerts on fail, and awareness-training evidence — per [2026-08-10-people-domain-evidence-layer-design.md](../specs/2026-08-10-people-domain-evidence-layer-design.md).

**Architecture:** Thin evidence plane in `compliance` module, **fully tenant-scoped** (`tenant_id` on all tables; `resolveTenantId(session)`; jobs foreach tenant; `ensureSeeded(tenantId)`). Canonical `compliance_controls` + `control_framework_maps` + append-only `control_test_runs`. Adapters query existing producers within one tenant. Daily BullMQ job runs adapters per tenant; fails open Hub via `compliance_alerts`. `GET /compliance/evidence/status` is the future GRC sync contract.

**Tech Stack:** NestJS 10, TypeORM, Jest, BullMQ worker; Next.js 16, PrimeReact, Vitest; English-only `en.json`.

## Global Constraints

- API `/api/v1/`, envelope `{ data, meta, errors }`
- Every mutation → `audit_log` via `AuditLogService.append` **with `tenantId`**
- **Tenancy (mandatory):** see design §2.1 — every table/query/adapter/job/export scoped by `tenant_id`; no client-supplied tenant; `resolveTenantId(session)` single seam; services take **required** `tenantId`; scheduled job iterates **all** rows in `tenants`; `ensureSeeded(tenantId)` per tenant; cross-tenant isolation test required
- RBAC: People Ops / IT Admin / Super Admin per design §8; always within resolved tenant
- English only — `frontend/src/locales/en.json` only (do not edit `ar.json`/`fr.json`)
- Lucide icons only; no country hard-coding (`if country === 'PK'`)
- No Approach 2 tree UI, risk register, TPRM, Trust Center, CSPM
- Conventional Commits: `feat(compliance): …`, `docs(compliance): …`, `feat(frontend): …`
- TDD: failing test before production code for adapters/services
- Spec is canonical — if plan and spec disagree, follow spec and update plan

## File map

| File | Responsibility |
|---|---|
| `docs/compliance/README.md` | Index |
| `docs/compliance/iso-soc-framework.md` | Frameworks, retention, §6 control catalogue |
| `docs/compliance/feature-flows.md` | FLW-* index incl. new evidence flows |
| `docs/compliance/deferred-compliance-work.md` | SOC2 Type II / DSAR / access-review runbooks |
| `docs/compliance/tax-compliance-boundary.md` | Stub pointing statutory filing out of scope |
| `backend/src/modules/compliance/enums/control.enum.ts` | Domain, frequency, result, trigger enums |
| `backend/src/modules/compliance/tenant-context.util.ts` | `resolveTenantId(session)` seam (v1 → Digitaro) |
| `backend/src/modules/compliance/entities/compliance-programme.entity.ts` | Programme row |
| `backend/src/modules/compliance/entities/compliance-control.entity.ts` | Controls |
| `backend/src/modules/compliance/entities/control-framework-map.entity.ts` | Crosswalk |
| `backend/src/modules/compliance/entities/control-test-run.entity.ts` | Run history |
| `backend/src/modules/compliance/entities/control-evidence-link.entity.ts` | Pinned evidence |
| `backend/src/database/migrations/1783041600000-PeopleDomainEvidenceLayer.ts` | Tables + training flag + alert enum |
| `backend/src/modules/compliance/constants/compliance-controls.seed.ts` | Seed catalogue (≥12 Wave-1 codes) |
| `backend/src/modules/compliance/compliance-control-seed.service.ts` | `ensureSeeded(tenantId)` idempotent |
| `backend/src/modules/compliance/adapters/control-test-adapter.types.ts` | Adapter interface |
| `backend/src/modules/compliance/adapters/*.adapter.ts` | One file per adapter key |
| `backend/src/modules/compliance/__tests__/*-adapter.spec.ts` | Unit tests |
| `backend/src/modules/compliance/__tests__/control-tenant-isolation.spec.ts` | Cross-tenant isolation |
| `backend/src/modules/compliance/control-test-runner.service.ts` | Run one/all, persist runs, alerts |
| `backend/src/modules/compliance/compliance-control.service.ts` | CRUD list/detail/programme/links |
| `backend/src/modules/compliance/compliance-evidence.service.ts` | status + export |
| `backend/src/modules/compliance/compliance-control.controller.ts` | REST |
| `backend/src/modules/compliance/dto/compliance-control.dto.ts` | DTOs |
| `backend/src/modules/compliance/compliance.module.ts` | Wire providers |
| `backend/src/worker/...` or automation queue | Daily schedule: foreach tenant |
| `backend/src/modules/talent/entities/training-course.entity.ts` | `countsTowardAwarenessControl` |
| `frontend/src/libs/api/compliance-controls.ts` | API client |
| `frontend/src/app/[locale]/(auth)/people-ops/compliance/page.tsx` | Catalogue |
| `frontend/src/app/[locale]/(auth)/people-ops/compliance/[code]/page.tsx` | Detail |
| `frontend/src/app/[locale]/(auth)/people-ops/compliance/programme/page.tsx` | Programme |
| `frontend/src/components/AppSidebar.tsx` + `en.json` | Nav + copy |
| `docs/project-requirements/database-design.md` | New tables section |
| `docs/generated/tasks.md` | Tick / add evidence-layer item |

---

### Task 1: Restore `docs/compliance/*`

**Files:** Create the five docs listed above.  
**Interfaces:** Produces human SoT that Task 3 seed codes must match §6 of `iso-soc-framework.md`.

- [ ] **Step 1: Create** `docs/compliance/README.md` — index linking the four siblings; one paragraph on “Polaris = people evidence plane; buy GRC for cloud.”

- [ ] **Step 2: Create** `docs/compliance/iso-soc-framework.md` with:
  - §1 Purpose / Digitaro posture
  - §2 Frameworks in scope (9001, 30400, 27001, 27701, SOC2, PDPA/PDPL/GDPR overlays)
  - §3 Domains: people / access / policy / privacy / process
  - §5 Retention (5-year default; point to DB design)
  - §6 Evidence catalogue table: every Wave-1 control `code`, title, domain, owner, adapter key, example framework refs

  Minimum §6 rows (exact codes — seed must match):

  | code | adapter |
  |---|---|
  | `POL-ACK-CURRENT` | `policy_ack_current` |
  | `POL-VERSION-MANDATORY` | `null` (manual) |
  | `ACC-REVIEW-QUARTERLY` | `access_review_quarterly` |
  | `ACC-RBAC-SNAPSHOT` | `rbac_assignment_reviewable` |
  | `ACC-OFFBOARD-ENTRA` | `offboarding_entra_disable` |
  | `PEO-TRAIN-AWARENESS` | `training_awareness_overdue` |
  | `PEO-ONBOARD-GATE` | `null` |
  | `PEO-SEPARATION-CLEARANCE` | `null` |
  | `PRIV-DSAR-EXPORT` | `dsar_export_ready` |
  | `PRIV-RETENTION-5Y` | `null` |
  | `PROC-AUDIT-LOG` | `audit_log_immutable` |
  | `PROC-ESIGN-COC` | `null` |

- [ ] **Step 3: Create** `feature-flows.md` — index including `FLW-SEC-004` DSAR, `FLW-SEC-005` access review, new `FLW-SEC-010` control test run / evidence catalogue (brief steps: schedule → adapter → persist run → alert on fail → export).

- [ ] **Step 4: Create** `deferred-compliance-work.md` — SOC2 Type II 6–12 mo window; set `evidence_window_start`; DSAR/access-review ops; cloud evidence = buy later.

- [ ] **Step 5: Create** `tax-compliance-boundary.md` — one-pager: Polaris calculates inputs; filing portals out of scope.

- [ ] **Step 6: Commit** `docs(compliance): restore iso-soc framework and evidence catalogue docs`

---

### Task 2: Enums, entities, migration

**Files:** Create enums + 5 entities; migration `1783041600000-PeopleDomainEvidenceLayer.ts`; extend training course + `ComplianceAlertType`.

**Produces:**
- Enums: `ControlDomain`, `ControlFrequency`, `ControlOwnerRole`, `ControlTestResult`, `ControlTestTrigger`
- Tables: `compliance_programme`, `compliance_controls`, `control_framework_maps`, `control_test_runs`, `control_evidence_links`
- Column `training_courses.counts_toward_awareness_control boolean NOT NULL DEFAULT false`
- Enum value `control_test_fail` on `compliance_alert_type_enum`

- [ ] **Step 1: Write failing entity/shape test** (optional light) or proceed to migration-first — prefer: create enum file + entity files matching design §3 column-for-column.

- [ ] **Step 2: Migration** — create enums/tables/FKs/indexes from design §3 + §2.1; `UNIQUE (tenant_id)` on programme; `UNIQUE (tenant_id, code)` on controls; `UNIQUE (tenant_id, control_id, framework, external_ref)` on maps; index `(tenant_id, control_id, ran_at DESC)` on runs; all `tenant_id` NOT NULL FK → `tenants`.

- [ ] **Step 3: Add** `countsTowardAwarenessControl` to `TrainingCourseEntity` + migration column (column is tenant-scoped via existing `training_courses.tenant_id`).

- [ ] **Step 4: Extend** `ComplianceAlertType` with `CONTROL_TEST_FAIL = 'control_test_fail'` + `ALTER TYPE ... ADD VALUE`.

- [ ] **Step 5: Create** `tenant-context.util.ts` with `resolveTenantId(_session): string` — v1 returns `DIGITARO_TENANT_ID`; JSDoc that this is the only place Digitaro is defaulted for HTTP.

- [ ] **Step 6: Register** entities in `compliance.module.ts` `TypeOrmModule.forFeature([...])`.

- [ ] **Step 7: Commit** `feat(compliance): add evidence-layer tables and awareness course flag`

---

### Task 3: Seed controls + framework maps

**Files:** `constants/compliance-controls.seed.ts`; `compliance-control-seed.service.ts` with idempotent `ensureSeeded(tenantId: string): Promise<void>`.

**Consumes:** Task 1 codes.  
**Produces:** Seed constant + per-tenant insert of programme + controls + maps. **Never** insert without `tenantId`.

- [ ] **Step 1: Write** seed constant with all 12 codes; each automated control has ≥2 framework maps (e.g. SOC2 + ISO27001).

- [ ] **Step 2: Write test** `compliance-controls.seed.spec.ts` — asserts exact code set, unique codes, adapter keys only from known set.

- [ ] **Step 3: Implement** `ensureSeeded(tenantId)` — if programme exists for tenant, no-op (or fill missing codes only); else insert programme + all controls/maps for that `tenantId`.

- [ ] **Step 4: Test** `ensureSeeded` twice for same tenant → no duplicate key error; call for tenant A and tenant B → each has own rows (`tenant_id` differs).

- [ ] **Step 5: Bootstrap** Digitaro via migration end / seed call `ensureSeeded(DIGITARO_TENANT_ID)`. Document in setup-wizard / tenant provision: call `ensureSeeded(newTenantId)` when multi-tenant lands.

- [ ] **Step 6: Commit** `feat(compliance): seed people-domain control catalogue per tenant`

---

### Task 4: Adapter types + `policy_ack_current`

**Files:**
- Create: `adapters/control-test-adapter.types.ts`
- Create: `adapters/policy-ack-current.adapter.ts`
- Test: `__tests__/policy-ack-current.adapter.spec.ts`

**Interfaces:**

```ts
export type AdapterEvidenceRef = {
  kind: string;
  id?: string;
  path?: string;
  label?: string;
};

export type AdapterRunResult = {
  result: 'pass' | 'fail' | 'manual' | 'error' | 'skipped';
  summary: Record<string, unknown>;
  evidenceRefs: AdapterEvidenceRef[];
};

export interface ControlTestAdapter {
  readonly key: string;
  run(tenantId: string): Promise<AdapterRunResult>;
}
```

**Pass rule:** Among active workers in scope (not soft-deleted, employment active), 100% have all current mandatory published policy versions acknowledged. Use existing policy compliance queries (`PolicyService` compliance-dashboard logic — extract shared query or call service method).

- [ ] **Step 1: Failing test** — mock policy stats `{ pendingCount: 0 }` → pass; `{ pendingCount: 3 }` → fail with summary.pendingCount === 3

- [ ] **Step 2: Run** — expect FAIL (adapter missing)

- [ ] **Step 3: Implement adapter**

- [ ] **Step 4: Run** — expect PASS

- [ ] **Step 5: Commit** `feat(compliance): add policy_ack_current control adapter`

---

### Task 5: Remaining adapters

**Files:** one adapter + spec each:

| Key | Pass sketch |
|---|---|
| `access_review_quarterly` | Exists completed cycle whose period covers current quarter (or completed within last 92 days if cycles lack period fields — match entity shape) |
| `rbac_assignment_reviewable` | Can load active `user_role_assignments` count ≥ 0 and last open-or-completed cycle exists OR assignments query succeeds (health); prefer: at least one cycle in last 180 days OR zero assignments edge documented as pass with summary |
| `offboarding_entra_disable` | Separated workers past LWD: `entra_status` disabled/not_required within SLA days (config const `OFFBOARD_ENTRA_SLA_DAYS = 1`). Fail list in summary |
| `training_awareness_overdue` | No `training_assignments` with status overdue (or dueDate &lt; today and not completed) for courses where `countsTowardAwarenessControl = true` and worker active |
| `dsar_export_ready` | Prefer: last successful DSAR audit_log / export meta within 365 days OR programme notes attested — start with: `DsarExportService` dry capability check / last export if tracked; if none, result `manual` with summary.reason |
| `audit_log_immutable` | Append a probe row with `SYSTEM_ACTOR_ID` action `compliance.control_test.probe` then result `pass` + evidenceRef; document no UPDATE in summary |

- [ ] **Step 1: Failing tests** for each adapter (table-driven where helpful)

- [ ] **Step 2: Implement adapters**; register in `CONTROL_TEST_ADAPTERS` map keyed by `key`

- [ ] **Step 3: All specs PASS**

- [ ] **Step 4: Commit** `feat(compliance): add remaining people-domain control adapters`

---

### Task 6: Control test runner + schedule

**Files:**
- Create: `control-test-runner.service.ts`
- Test: `__tests__/control-test-runner.service.spec.ts`
- Wire BullMQ: daily job loads `SELECT id FROM tenants` (active) and calls `runAll(tenantId, 'schedule')` **for each** — never hardcode Digitaro-only in the job loop.

**Produces:**
- `runOne(code, tenantId, trigger, actorUserId?)` — `tenantId` **required**
- `runAll(tenantId, trigger, actorUserId?)` — `tenantId` **required**
- Persists `control_test_runs` with that `tenantId`
- On `fail`: upsert/open `compliance_alerts` with `tenantId`, `alertType=CONTROL_TEST_FAIL`, title `Control failed: {code}`, severity WARNING, dedupe by **tenant**+code+dueDate=today
- Manual run: `audit_log` action `compliance.control.run` with `tenantId`

- [ ] **Step 1: Failing test** — mock adapter fail → run row result fail + alert created for that tenant only

- [ ] **Step 2: Implement runner** (skip null adapters on schedule; manual run of manual control → `manual` result). Load control by `(tenantId, code)` only.

- [ ] **Step 3: Schedule** daily on worker — **foreach tenant id**; document UTC time (~02:00)

- [ ] **Step 4: Pass tests + Commit** `feat(compliance): run control adapters per tenant on schedule`

---

### Task 7: Programme + controls API

**Files:**
- `compliance-control.service.ts`
- `compliance-control.controller.ts` (or extend `evidence.controller` — prefer **new** `ComplianceControlController` path `compliance`)
- `dto/compliance-control.dto.ts`
- `__tests__/compliance-control.service.spec.ts`

**Endpoints:**

| Method | Path | Roles |
|---|---|---|
| GET | `/compliance/programme` | PO, IT, SA |
| PATCH | `/compliance/programme` | SA |
| GET | `/compliance/controls` | PO, IT, SA — query: domain, result, inScope |
| GET | `/compliance/controls/:code` | PO, IT, SA |
| GET | `/compliance/controls/:code/runs` | PO, IT, SA — paginated |
| POST | `/compliance/controls/:code/run` | PO, IT, SA |
| POST | `/compliance/controls/run` | SA, IT (optional PO) |
| POST | `/compliance/controls/:code/evidence-links` | PO, IT, SA |

Envelope all responses. PATCH programme audits `compliance.programme.update`.  
Controllers: `const tenantId = resolveTenantId(session)` then pass into services — **never** accept `tenantId` from query/body.

- [ ] **Step 1: Failing service tests** for list joins latest run **for tenant**; patch programme scoped

- [ ] **Step 2: Implement service + controller**; register in module; all repo queries include `tenantId`

- [ ] **Step 3: Pass + Commit** `feat(compliance): add control catalogue and programme API`

---

### Task 8: Evidence status + export

**Files:** `compliance-evidence.service.ts`; wire into controller; tests.

**Produces:**

```ts
// GET /compliance/evidence/status
type ControlEvidenceStatus = {
  controlCode: string;
  title: string;
  domain: string;
  inScope: boolean;
  frameworks: { framework: string; externalRef: string }[];
  result: 'pass' | 'fail' | 'manual' | 'error' | 'skipped' | 'never_run';
  lastTestedAt: string | null;
  summary?: Record<string, unknown>;
  evidenceUrls: string[];
};
```

`GET /compliance/evidence/export?framework=SOC2` — JSON pack (v1) of matching controls + latest runs + maps **for resolved tenant only**; set `Content-Disposition` filename `polaris-evidence-{tenantId}-{framework}-{date}.json`. ZIP optional later.

Keep existing DSAR + access-review evidence routes (already tenant-aware — verify they filter `tenantId`).

- [ ] **Step 1: Failing test** — never_run when no runs; pass maps through; **tenant B status empty/unaffected when only A has runs**

- [ ] **Step 2: Implement** with required `tenantId`

- [ ] **Step 3: Commit** `feat(compliance): add evidence status and export API`

---

### Task 8b: Cross-tenant isolation test

**Files:** `__tests__/control-tenant-isolation.spec.ts`

- [ ] **Step 1: Arrange** tenants `A` and `B` (uuids); `ensureSeeded(A)` + `ensureSeeded(B)`.

- [ ] **Step 2: Act** — insert a failing `control_test_runs` row (or run mock adapter) **only** for A / `POL-ACK-CURRENT`.

- [ ] **Step 3: Assert**
  - `listControls(A)` shows fail for that code; `listControls(B)` still never_run/pass default
  - `evidenceStatus(B)` contains no A evidence refs / run ids
  - `getControl(A, code)` by id from B’s row → NotFound when queried under A (or wrong tenant id on entity)
  - No API path accepts body `{ tenantId: B }` to read A’s data

- [ ] **Step 4: Commit** `test(compliance): enforce evidence-layer tenant isolation`

---

### Task 9: Training DTO + admin flag

**Files:** Modify training DTOs/service/controller to allow People Ops set `countsTowardAwarenessControl` on create/update course; list returns field.

- [ ] **Step 1: Failing test** — create course with flag true persists

- [ ] **Step 2: Implement**

- [ ] **Step 3: Commit** `feat(talent): flag courses for awareness control evidence`

---

### Task 10: Frontend API + People Ops UI

**Files:**
- `frontend/src/libs/api/compliance-controls.ts`
- `frontend/src/app/[locale]/(auth)/people-ops/compliance/page.tsx`
- `frontend/src/app/[locale]/(auth)/people-ops/compliance/[code]/page.tsx`
- `frontend/src/app/[locale]/(auth)/people-ops/compliance/programme/page.tsx`
- `frontend/src/locales/en.json` — `PeopleOpsCompliance` namespace
- `AppSidebar` — link under People Ops (Compliance / Evidence)
- Route protection if required (`route-protection.ts`)

**UI requirements:**
- Catalogue DataTable: code, title, domain, owner, result pill, last run, frameworks
- Five states; empty when no seed
- Detail: maps, run history, Run now button, deep links from evidenceRefs paths
- Programme: date picker for `evidence_window_start`, target frameworks multi-select, save (SA only — hide save otherwise)

- [ ] **Step 1: Client helpers** + Vitest parse for status enum if non-trivial

- [ ] **Step 2: Catalogue page**

- [ ] **Step 3: Detail + programme pages**

- [ ] **Step 4: Nav + en.json only**

- [ ] **Step 5: Commit** `feat(frontend): add people-ops compliance evidence catalogue`

---

### Task 11: Spec cross-links + tasks.md + database-design

**Files:**
- `docs/project-requirements/database-design.md` — add § tables for evidence layer
- `docs/generated/tasks.md` — add checked/unchecked items for evidence layer / note SOC2 readiness still needs human programme start
- Design spec already points at this plan

- [ ] **Step 1: Document tables** matching entities

- [ ] **Step 2: Update tasks.md**

- [ ] **Step 3: Commit** `docs: document people-domain evidence layer schema and tasks`

---

## Spec coverage self-review

| Spec section | Task(s) |
|---|---|
| Docs restore §2 | Task 1 |
| **Tenancy §2.1** | Tasks 2–3, 6–8, **8b** |
| Data model §3 | Task 2 |
| Control library §4 | Task 3 |
| Adapters §5 | Tasks 4–5 |
| Runner + schedule + Hub §5.1 | Task 6 |
| Training hardening §5.3 | Tasks 2, 5, 9 |
| API §6 | Tasks 7–8 |
| UI §7 | Task 10 |
| Programme / ownership §8 | Tasks 7, 10 |
| Future GRC seam §10 | Task 8 `evidence/status` |
| Approach 2/3 | Out of scope (documented in spec only) |
| database-design / tasks | Task 11 |

Placeholder scan: none intentional. Adapter `rbac_assignment_reviewable` / `dsar_export_ready` have explicit pass/manual rules to avoid vague “handle later.”

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-10-people-domain-evidence-layer.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
