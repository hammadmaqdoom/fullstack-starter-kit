# Design: People-Domain Evidence Layer (GRC-lite)

**Date:** 2026-08-10  
**Status:** Approved  
**Product:** Polaris (Digitaro HRMS)  
**Plan:** [../plans/2026-08-10-people-domain-evidence-layer.md](../plans/2026-08-10-people-domain-evidence-layer.md)  
**Related:** PRD §8 (privacy/auditability), SRS NFR-COMP / NFR-PRIV, `docs/generated/tasks.md` (SOC 2 readiness open), Vanta research canvas `vanta-vs-polaris-grc`

## Problem

Digitaro needs ISO 9001 / ISO 30400-series / ISO 27001 / ISO 27701 / SOC 2 evidence from HR, access, policy, and privacy workflows already in Polaris. Vanta-class tools sell ~35 frameworks and 1,400+ automated tests; most of that is cloud/device/TPRM/Trust Center — not HRMS work. Polaris already produces much of the **people-domain** evidence but lacks:

- A live **control catalogue** mapped to framework IDs
- **Scheduled** people-domain control tests with history (Type II “over time”)
- A **Control Evidence API** / auditor export contract
- Restored written `docs/compliance/*` source of truth (referenced everywhere, missing on disk)
- Hardened **training/awareness** as compliance evidence

## Goals

1. **Goal C (locked):** Evidence-ready now **and** formal ISO/SOC Type II programme readiness (evidence window + ownership) from day one.
2. **Wave 1 = full people CCM (locked):** Docs + control catalogue UI + Control Evidence API + scheduled tests + Hub alerts + training completion evidence.
3. Ship a **thin evidence plane** over existing Polaris producers — not a Vanta clone.
4. Leave a clean seam if Digitaro later **buys** a GRC tool or **builds** a full control-graph product (Approach 2).

## Non-goals (Wave 1)

- Full framework tree browser / importing all SOC2+ISO leaves as UI (Approach 2)
- Risk register product (heatmaps, treatment workflows)
- TPRM, Trust Center, customer questionnaire AI, Customer Commitments
- Cloud CSPM, MDM/device encryption tests, vulnerability SLA tracking
- Auditor guest portal (ZIP/JSON export packs only)
- Wiring a paid GRC vendor in this wave (API must remain sync-friendly)

## Decisions (confirmed)

| Topic | Choice |
|---|---|
| Near-term compliance goal | **C** — evidence-ready + Type II window/ownership |
| Wave 1 shippable | **C** — full people CCM slice |
| Architecture approach | **Approach 1** — docs-first catalogue + thin adapters |
| Frameworks in scope | ISO 9001, ISO 30400-series, ISO 27001, ISO 27701, SOC 2 TSC + PDPA / PDPL / GDPR-principle overlays |
| Catalogue size | ~80–150 Digitaro-relevant controls with crosswalk IDs (not 1,400 tests) |
| Full GRC later | Documented in appendix; do not build now |
| Commit of this spec | User reviews file before implementation plan |

---

## Approaches considered

### Approach 1 — Docs-first catalogue + thin adapters (**SELECTED**)

Canonical Digitaro control library; framework crosswalk; adapter functions over live Polaris data; People Ops catalogue UI; scheduled runs; Hub alerts; evidence export API.

**Why selected:** Matches Digitaro JTBD, reuses existing modules, supports Type II history, stays complementary to a future GRC buy, avoids fake cloud-control breadth.

### Approach 2 — Mirror full GRC control graph in-app (**DEFERRED**)

See [Appendix A](#appendix-a--approach-2-full-grc-control-graph-deferred).

### Approach 3 — Export-only packs, no live catalogue (**REJECTED** for goal C)

See [Appendix B](#appendix-b--approach-3-export-only-rejected).

---

## 1. System overview

```text
┌─────────────────────────────────────────────────────────────┐
│  docs/compliance/* (written SoT)                            │
│  iso-soc-framework · feature-flows · deferred SOC runbook   │
└───────────────────────────┬─────────────────────────────────┘
                            │ seeds / maps
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  compliance_controls + control_framework_maps               │
│  + compliance_programme (evidence window)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ test_adapter_key
                            ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ policy ack   │   │ access review│   │ entra / sep. │
│ training     │   │ audit_log    │   │ DSAR export  │
│ (existing)   │   │ (existing)   │   │ (existing)   │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       └──────────────────┼──────────────────┘
                          ▼
              control_test_runs (history)
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   People Ops UI    Evidence API     Hub / alerts
   catalogue        status+export    on fail
```

**Rule:** If evidence is a people/HR process artifact, Polaris produces it. If evidence is cloud/device/vendor-trust, buy or defer — do not fake it in adapters.

---

## 2. Documentation restore (`docs/compliance/*`)

Create (recreate) the missing folder referenced by PRD/SRS/tasks:

| File | Contents |
|---|---|
| `docs/compliance/README.md` | Index, how Polaris evidence maps to audits |
| `docs/compliance/iso-soc-framework.md` | Framework posture, domains, retention (§5), **§6 evidence catalogue** listing every seed control code |
| `docs/compliance/feature-flows.md` | FLW-* index; stubs allowed where full narrative not yet rewritten; link existing module flows |
| `docs/compliance/deferred-compliance-work.md` | SOC 2 Type II readiness checklist, DSAR runbook notes, access-review ops, evidence window guidance |
| `docs/compliance/tax-compliance-boundary.md` | Stub or pointer if still referenced — statutory filing remains out of Polaris |

These docs are the **human** source of truth; DB seed must not drift without a docs update in the same change set.

---

## 2.1 Tenancy (mandatory)

Polaris is **single-tenant operationally in v1** (Digitaro) but **tenant-shaped** for later productization ([system-architecture.md](../../project-requirements/system-architecture.md)). The evidence layer must not be Digitaro-hardcoded in query paths.

### Rules

1. **Every** evidence-layer table has non-null `tenant_id` FK → `tenants(id)` (same as other business tables).
2. **Every** read/write/query/adapter/export filters by `tenant_id`. No unscoped `find()` / raw SQL without `WHERE tenant_id = $1`.
3. **Never trust client-supplied `tenantId`.** Resolve tenant server-side:
   - HTTP: from authenticated session context (v1 may resolve to `DIGITARO_TENANT_ID` via a single helper e.g. `resolveTenantId(session)` — one seam, not scattered defaults).
   - Jobs: load active tenants from `tenants` and call `runAll(tenant.id)` **per tenant**.
4. **Service signatures** for this feature take **required** `tenantId: string` (no optional default to Digitaro on new public methods). Tests pass explicit ids; second fake tenant proves isolation.
5. **Uniqueness is per tenant:** `(tenant_id, code)` on controls; programme **one row per tenant** (`UNIQUE (tenant_id)`); framework maps unique per `(tenant_id, control_id, framework, external_ref)`.
6. **Seed is per tenant:** `ComplianceControlSeedService.ensureSeeded(tenantId)` is idempotent. Migration/bootstrap seeds Digitaro; **any future tenant create** must call the same ensure (document hook in setup wizard / tenant provision path).
7. **Adapters** only see data for the passed `tenantId` (workers, policies, assignments, access reviews, DSAR, audit_log, Entra jobs).
8. **Hub alerts / audit_log** for control failures include that `tenant_id`.
9. **Evidence status/export** never mixes tenants; export filename may include tenant slug/id.
10. **Cross-tenant isolation test (required):** two tenants; seed both; fail a control only in A; assert B’s catalogue/status/export unchanged and A’s APIs never return B’s rows.

### v1 vs later

| v1 | Later multi-tenant |
|---|---|
| One real tenant = Digitaro (`DIGITARO_TENANT_ID`) | N tenants; same schema |
| Session helper returns Digitaro | Session carries / resolves membership tenant |
| Daily job loops tenants table (usually 1 row) | Same loop, N rows |
| Seed Digitaro in migration | `ensureSeeded` on tenant provision |

### Explicit non-goals for tenancy in Wave 1

- Tenant switcher UI / Super Admin cross-tenant view
- Shared “global” control library table without `tenant_id` (reject — always copy seed per tenant so programme/in_scope can diverge)

---

## 3. Data model

All business tables: **`tenant_id` NOT NULL**, soft-delete only where applicable. `control_test_runs` is append-oriented (no destructive edit of historical results; corrections = new run).

### 3.1 `compliance_programme` (1 row per tenant)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | FK tenants; **UNIQUE** |
| evidence_window_start | date nullable | When Type II / ISO observation period starts |
| target_frameworks | text[] or jsonb | e.g. `['ISO27001','ISO27701','SOC2']` |
| next_audit_target_date | date nullable | Planning only |
| notes | text nullable | |
| created_at / updated_at | timestamptz | |

### 3.2 `compliance_controls`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | FK tenants; codes unique **within** tenant |
| code | varchar | Stable slug e.g. `POL-ACK-CURRENT` |
| title | varchar | |
| description | text | |
| domain | enum | `people` \| `access` \| `policy` \| `privacy` \| `process` |
| owner_role | enum/varchar | `people_ops` \| `it_admin` \| `super_admin` \| `shared` |
| frequency | enum | `continuous` \| `daily` \| `weekly` \| `quarterly` \| `manual` |
| in_scope | boolean | Default true for Wave 1 seed |
| test_adapter_key | varchar nullable | Null = manual-only control |
| sort_order | int | |
| created_at / updated_at | timestamptz | |

Unique `(tenant_id, code)`.

### 3.3 `control_framework_maps`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | |
| control_id | uuid | FK compliance_controls |
| framework | varchar | `ISO9001` \| `ISO30400` \| `ISO27001` \| `ISO27701` \| `SOC2` \| `PDPA` \| `PDPL` \| `GDPR` |
| external_ref | varchar | e.g. `A.5.15`, `CC6.1`, `Protection Obligation` |
| notes | text nullable | |

Unique `(tenant_id, control_id, framework, external_ref)`.

### 3.4 `control_test_runs`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | |
| control_id | uuid | |
| ran_at | timestamptz | |
| triggered_by | enum | `schedule` \| `manual` \| `api` |
| actor_user_id | uuid nullable | |
| result | enum | `pass` \| `fail` \| `manual` \| `error` \| `skipped` |
| summary | jsonb | Human + machine fields: counts, thresholds, messages |
| evidence_refs | jsonb | Deep links / entity ids / export tokens |
| created_at | timestamptz | Append-only; no updated_at |

Index `(tenant_id, control_id, ran_at DESC)`.

### 3.5 `control_evidence_links` (optional pinned evidence)

For manual/hybrid controls or auditor bookmarks:

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | |
| control_id | uuid | |
| label | varchar | |
| url_or_path | text | In-app path or blob reference |
| collected_at | timestamptz | |
| collected_by | uuid | |
| created_at | timestamptz | |

### 3.6 Out of scope tables (later / Approach 2)

`risk_register`, `framework_pack_imports`, `auditor_sessions`, `vendor_risk_*` — not in Wave 1.

---

## 4. Control library (seed sketch)

Exact list lives in `iso-soc-framework.md` §6 and `compliance-controls.seed.ts`. Wave 1 **must** include at least:

| Code | Domain | Adapter | Owner |
|---|---|---|---|
| `POL-ACK-CURRENT` | policy | `policy_ack_current` | people_ops |
| `POL-VERSION-MANDATORY` | policy | (subset / related) | people_ops |
| `ACC-REVIEW-QUARTERLY` | access | `access_review_quarterly` | it_admin |
| `ACC-RBAC-SNAPSHOT` | access | `rbac_assignment_reviewable` | it_admin |
| `ACC-OFFBOARD-ENTRA` | access | `offboarding_entra_disable` | it_admin |
| `PEO-TRAIN-AWARENESS` | people | `training_awareness_overdue` | people_ops |
| `PEO-ONBOARD-GATE` | people | manual or light adapter | people_ops |
| `PEO-SEPARATION-CLEARANCE` | people | light adapter / manual | people_ops |
| `PRIV-DSAR-EXPORT` | privacy | `dsar_export_ready` | people_ops |
| `PRIV-RETENTION-5Y` | privacy | manual + runbook | people_ops |
| `PROC-AUDIT-LOG` | process | `audit_log_immutable` | super_admin |
| `PROC-ESIGN-COC` | process | light adapter / manual | people_ops |

Each row carries multiple `control_framework_maps` (SOC2 + ISO27001 + ISO27701 + privacy overlays as applicable). Prefer **one Digitaro control → many external refs** over duplicating leaves.

Target catalogue size after expansion: **80–150** in-scope controls (still people/access/policy/privacy/process only).

---

## 5. Test adapters

### 5.1 Runtime

- Registry: `test_adapter_key` → injectable adapter in `compliance` module.
- Runner: `ComplianceControlTestService.runOne / runAll` — **`tenantId` required** on every call.
- Schedule: BullMQ daily on worker; **`for (const tenant of await tenantsRepo.find()) { await runAll(tenant.id, 'schedule') }`** — do not hardcode Digitaro in the loop (v1 usually one row).
- On `fail`: create Hub-visible compliance alert **for that tenant** (reuse `compliance_alerts` / automation channels where possible).
- Every run writes `control_test_runs` + `audit_log` entry for manual triggers, both with `tenantId`.
- HTTP entrypoints resolve tenant via `resolveTenantId(session)` only (§2.1).

### 5.2 Adapter contracts (Wave 1)

| Key | Pass rule | Primary evidence_refs |
|---|---|---|
| `policy_ack_current` | 100% of in-scope active workers have current mandatory policy set acknowledged | policy ids, pending count, dashboard snapshot |
| `access_review_quarterly` | Required cycle for current quarter exists and status = completed within window | cycleId, completedAt |
| `offboarding_entra_disable` | Workers with LWD/separation completed: Entra disabled (or `not_required`) within configured SLA (default 1 business day) | workerIds failing, entra job ids |
| `training_awareness_overdue` | Zero overdue assignments for courses tagged mandatory security/compliance awareness | assignment ids, worker ids |
| `audit_log_immutable` | Automated smoke: append succeeds; document that UPDATE/DELETE paths do not exist on entity (may be `manual`+CI assertion initially) | sample audit row id / CI note |
| `dsar_export_ready` | Export service returns successful package for a configured probe or last successful export within N days + runbook flag | export meta |
| `rbac_assignment_reviewable` | Open-cycle path can snapshot all active role assignments (health of access-review pipeline) | last open cycle stats |

Thresholds (SLA days, mandatory course tags) live in config/seed — **not** hard-coded country branches.

### 5.3 Training hardening

Training module already has courses/assignments/completions. Wave 1 requires:

- Course flag or tag: `mandatory_awareness` (or equivalent) for security/ISO policy suite courses
- Adapter counts overdue among active workers in scope
- People Ops can see overdue list from control detail deep-link
- Overdue continues to feed automation alerts (§6.10) where already implemented

---

## 6. API

Base: `/api/v1/compliance/…`  
Envelope: `{ data, meta, errors }`  
RBAC: People Ops, IT Admin, Super Admin (read); run/programme write per role matrix below.  
Mutations: `audit_log`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/compliance/programme` | Programme settings |
| PATCH | `/compliance/programme` | Super Admin: window start, targets |
| GET | `/compliance/controls` | List + latest run summary; filter domain/result/in_scope |
| GET | `/compliance/controls/:code` | Detail + framework maps + latest runs |
| GET | `/compliance/controls/:code/runs` | Paginated history |
| POST | `/compliance/controls/:code/run` | Manual run one adapter |
| POST | `/compliance/controls/run` | Run all scheduled adapters (or body filter) |
| GET | `/compliance/evidence/status` | **GRC sync contract** — see §6.1 |
| GET | `/compliance/evidence/export` | Auditor pack (`framework` query optional) |
| POST | `/compliance/controls/:code/evidence-links` | Pin manual evidence |
| GET | `/compliance/evidence/access-review` | Existing — keep |
| POST | `/compliance/dsar/export` | Existing — keep |

### 6.1 Evidence status contract (future GRC buy)

```ts
type ControlEvidenceStatus = {
  controlCode: string;
  title: string;
  domain: string;
  inScope: boolean;
  frameworks: { framework: string; externalRef: string }[];
  result: 'pass' | 'fail' | 'manual' | 'error' | 'skipped' | 'never_run';
  lastTestedAt: string | null; // ISO
  summary?: Record<string, unknown>;
  evidenceUrls: string[]; // app-relative or signed
};
```

`GET /compliance/evidence/status` returns `ControlEvidenceStatus[]` for in-scope controls. This is the primary integration point if Digitaro later connects Vanta/Drata/Sprinto or builds Approach 2.

---

## 7. UI

| Route | Audience | Content |
|---|---|---|
| `/people-ops/compliance` | People Ops, IT, Super Admin | Catalogue table: code, title, domain, owner, latest result, last run, frameworks |
| `/people-ops/compliance/[code]` | same | Description, maps, run history, Run now, Open evidence deep-links, pinned links |
| `/people-ops/compliance/programme` | Super Admin (+ read for others) | Evidence window start, target frameworks, next audit date |
| Hub | Managers / owners | Failing-control alerts with link to control detail |

Five UI states (loading/empty/error/offline/success). English only (`en.json`). Lucide icons. PrimeReact data table for catalogue.

Reuse patterns from `/people-ops/policies` compliance dashboard and People Ops dashboard widgets.

---

## 8. Programme & ownership (Goal C)

| Role | Responsibilities |
|---|---|
| Super Admin | Programme dates; in_scope toggles; audit_log integrity controls |
| People Ops | Policy, training, DSAR, onboarding/separation process controls |
| IT Admin | Access reviews, Entra offboarding SLA, RBAC snapshot health |
| Manager | Existing access-review certify/revoke — unchanged |

**Evidence window:** When Digitaro starts ISO/SOC observation, set `evidence_window_start`. Auditor narrative uses `control_test_runs` where `ran_at >= evidence_window_start`. Do not delete older runs (trend/debug).

**SOC 2 Type II readiness:** Tracked in `deferred-compliance-work.md` — start window 6–12 months before external audit; Polaris supplies people-domain continuous evidence; cloud/device still external.

---

## 9. Implementation slices (for later plan)

1. Restore `docs/compliance/*` + seed control list + crosswalk  
2. Migration: programme, controls, maps, test_runs, evidence_links  
3. Adapter registry + runner + daily job  
4. REST API + audit_log on mutations  
5. People Ops UI catalogue + detail + programme  
6. Hub alert on fail  
7. Training `mandatory_awareness` tag + adapter  
8. Evidence status + export pack  
9. Tests: unit adapters, API e2e for status/export, seed integrity  

---

## 10. Future full-GRC seam

If Digitaro later needs full GRC:

| Path | How Approach 1 helps |
|---|---|
| **Buy** Vanta/Drata/Sprinto | Point vendor HRIS/evidence connectors at Polaris or poll `GET /compliance/evidence/status`; do not re-implement personnel modules in the vendor |
| **Build Approach 2** | Add framework pack import + tree UI **on top of** the same `compliance_controls` / adapters; mark non-people controls `in_scope=false` or `test_adapter_key=null` |
| **Risk register** | New module FK → `compliance_controls`; out of Wave 1 |

Do **not** expand adapters into CSPM. That expansion is an explicit product decision to become a GRC vendor competitor — rejected for Digitaro internal HRMS.

---

## Errors, RBAC, compliance

- Pipeline: Authenticate → Authorise (RBAC + row scope) → **Resolve tenant** → Validate → Persist + `audit_log` → scoped response  
- **Tenant isolation:** all evidence-layer queries include `tenant_id` from `resolveTenantId(session)` or job loop — never from client input (§2.1)  
- Field redaction: DSAR and audit exports already sensitive — no new PII in Hub alert titles beyond counts  
- FLW alignment: document new flows as `FLW-SEC-*` evidence catalogue / control test in `feature-flows.md` during implementation plan  
- Country rules: SLA calendars via country-config / business-day helpers — never `if (country === 'PK')`

---

## Success metrics

- ≥80% of people-domain auditor asks answered from Polaris catalogue/export without spreadsheet archaeology  
- Daily adapter suite green or explicitly failing with Hub owner alert  
- `evidence_window_start` set before any external Type II kickoff  
- `GET /compliance/evidence/status` stable enough to hand to a GRC vendor RFP  

---

## Appendix A — Approach 2: Full GRC control graph (deferred)

### Intent

Treat Polaris as a mini-GRC: import full framework trees (SOC 2 TSC, ISO 27001 Annex A, ISO 27701, ISO 9001, privacy obligation packs) as separate hierarchies. Auditors browse by framework like Vanta/Drata.

### What you would build

| Layer | Detail |
|---|---|
| Framework packs | Seed/import full trees; version packs when standards update |
| Control instances | Often 400–1,000+ rows; many N/A or manual forever |
| Evidence locker | Per-control uploads + tasks, not only live adapters |
| UI | Framework picker → tree → control detail (owner, frequency, evidence, comments, N/A justification) |
| Automation | Minority auto from Polaris; remainder yellow without cloud/IdP/MDM integrations |
| Gravity features | Auditor portal, IRL mapping, multi-framework % complete dashboards |

### Overlap problem

The same Polaris fact (e.g. policy acknowledgement) maps to many external leaves. Without a crosswalk you duplicate; with a crosswalk you have rebuilt Approach 1 **plus** unused tree UI/ops.

### Effort (order of magnitude)

| Work | Estimate |
|---|---|
| Import/clean full trees + N/A policy | 6–12+ eng weeks |
| GRC-style UI + evidence locker | Large ongoing |
| Ops | Weekly compliance owner time for N/A and manual evidence |

### When to revisit

Revisit Approach 2 only if **all** are true:

1. Digitaro will not buy a GRC tool for 2–3+ years  
2. Leadership wants all GRC (including non-HR) inside Polaris  
3. A named compliance owner will maintain the full tree weekly  
4. Org accepts permanently yellow cloud/device controls in-product  

### Risks

- False confidence (“SOC 2 40%”) while people controls are fine  
- Scope creep into MDM/CSPM  
- Auditor confusion (incomplete GRC vs clear HR evidence plane)  
- Product identity drift away from HRMS  

### Relationship to Approach 1

Prefer: Approach 1 now + rich `control_framework_maps`. If full tree UI is ever required, add it as a **viewer over maps + imported pack metadata**, not a rewrite of adapters.

---

## Appendix B — Approach 3: Export-only (rejected)

### Intent

Scheduled jobs dump CSV/ZIP evidence packs; no live control catalogue or status UI.

### Pros

Fastest path to “something for auditors.”

### Cons (why rejected for Goal C)

- No continuous control status  
- No ownership model in-product  
- Weak Type II “over time” narrative UX  
- No stable GRC sync contract  
- Fails Wave 1 = full people CCM decision  

### Residual use

Export packs **remain** as a feature inside Approach 1 (`GET /compliance/evidence/export`), not as the whole product.

---

## Appendix C — Framework scope (what we need vs Vanta “35+”)

### In scope for Digitaro evidence plane

| Framework / overlay | Role |
|---|---|
| ISO 9001 | Process / workflow evidence |
| ISO 30400-series | HR management evidence |
| ISO 27001 | InfoSec controls (people/access/policy subset in Polaris) |
| ISO 27701 | Privacy extension |
| SOC 2 TSC | Trust Services Criteria evidence for future Type II |
| Singapore PDPA | Legal overlay → privacy controls |
| UAE PDPL | Legal overlay → privacy controls |
| GDPR principles | Spec alignment overlay |
| Pakistan DP direction | Config-ready privacy controls as law hardens |

### Explicitly out of Polaris framework automation

HIPAA, PCI-DSS, FedRAMP, CMMC, HITRUST, full NIST 800-53, ISO 42001 / EU AI Act (unless product strategy changes), cloud CSPM packs, Trust Center badge frameworks.

**Extensive compliance ≠ more frameworks.** It means deep evidence (definition → live link → scheduled result → export) for every in-scope Digitaro control.

---

## Spec self-review

- [x] No unresolved placeholders (TBD/TODO) in normative sections  
- [x] Approach 1 selected; 2 deferred; 3 rejected — consistent with conversation  
- [x] Goal C + Wave 1 CCM reflected in goals, data model, adapters, UI  
- [x] **Tenancy §2.1** — tenant_id everywhere; resolveTenantId seam; per-tenant seed; job foreach tenant; isolation test  
- [x] Future GRC buy/build seam via `evidence/status`  
- [x] Non-goals exclude Vanta clone surfaces  
- [x] Missing `docs/compliance/*` restore included  
- [x] User approved design; plan written  
- [ ] Execution start

---

## Next step

User reviews this spec. On approval, create implementation plan via writing-plans skill at  
`docs/superpowers/plans/2026-08-10-people-domain-evidence-layer.md` (filename may adjust to plan date).
