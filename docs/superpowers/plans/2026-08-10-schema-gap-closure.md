# Schema Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync `database-design.md` then land TypeORM entities + domain migrations so Postgres matches the audited schema (tables + columns), including statutory ID normalize/backfill and `worker_bank_accounts` — no API/UI feature wiring beyond compile shims.

**Architecture:** Spec-first edit of `database-design.md`, then five domain migrations under `backend/src/database/migrations/` (timestamps `1783041100000`–`1783041500000`). New entities live in existing bounded contexts (`core-hr`, `time-leave`, `country-config`, `esign`, `payroll`, `documents`, `talent`). Worker API continues to expose `statutoryFields` as a map via a persist/load shim over `worker_statutory_ids` so existing tests keep working.

**Tech Stack:** NestJS 10, TypeORM migrations, PostgreSQL, Jest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-10-schema-gap-closure-design.md`
- Canonical schema: `docs/project-requirements/database-design.md` (update first)
- No new REST endpoints or frontend screens this pass
- Column naming: TypeORM camelCase physical columns (match existing migrations, e.g. `"tenantId"`)
- English only; Conventional Commits: `docs(db): …`, `feat(core-hr): …`, `feat(time-leave): …`, etc.
- Never edit old migrations — only add new ones
- TDD for pure helpers (statutory backfill map ↔ rows)

## File map

| Area | Files |
|---|---|
| Spec / docs | `docs/project-requirements/database-design.md`, `docs/generated/tasks.md`, design status |
| Core HR entities | `office-location`, `worker-statutory-id`, `worker-bank-account`, `employee-skill`, `employment-record`, `legal-entity-division-mapping`, `legal-entity-currency`, `legal-entity-signatory`; alter `worker`, `legal-entity` |
| Time-leave | `work-week-pattern`, `company-closure`, `staff-calendar-day`; alter punch, day-summary, leave-request |
| Country-config | `tenant-currency` |
| E-sign | `signing-certificate`; alter envelope, field, audit-event |
| Documents / payroll / talent | alter document-template, policy-version, finance-export-profile, separation-case, clearance-item |
| Migrations | `1783041100000` … `1783041500000` |
| Shim | `backend/src/modules/core-hr/worker-statutory.util.ts` + spec; wire `worker.service.ts` / mapper |

---

### Task 1: Update `database-design.md` (canonical)

**Files:**
- Modify: `docs/project-requirements/database-design.md`
- Modify: `docs/superpowers/specs/2026-08-10-schema-gap-closure-design.md` (Status → Approved)

**Produces:** Complete column tables for every entity in the design; rename notes for `separation_cases` / `clearance_items` / `onboarding_cases`.

- [ ] **Step 1: Mark design Approved**

Set status line to `Approved`.

- [ ] **Step 2: Sync scoping matrix (§1.5)**

Ensure these rows exist with ✅ tenant_id (and notes): `office_locations`, `work_week_patterns`, `company_closures`, `staff_calendar_days`, `worker_statutory_ids`, `worker_bank_accounts`, `employee_skills`, `employment_records`, `legal_entity_division_mappings`, `legal_entity_currencies`, `legal_entity_signatories`, `signing_certificates`, `tenant_currencies`. Replace old names `separations` / `clearance_tasks` / `onboarding_instances` with implemented names.

- [ ] **Step 3: Expand `workers` column table**

Add after existing columns (before Indexes):

| Column | Type | Notes |
|---|---|---|
| office_location_id | UUID FK | nullable → office_locations |
| job_title | VARCHAR(150) | nullable |
| emergency_contact_name | VARCHAR(150) | nullable |
| emergency_contact_phone | VARCHAR(50) | nullable |
| emergency_contact_relation | VARCHAR(80) | nullable |
| address_line_1 | VARCHAR(255) | nullable |
| address_line_2 | VARCHAR(255) | nullable |
| city | VARCHAR(100) | nullable |
| state_province | VARCHAR(100) | nullable |
| postal_code | VARCHAR(20) | nullable |
| address_country_code | CHAR(2) | nullable |

Remove any doc that treats `statutoryFields` JSONB as the store; point to `worker_statutory_ids`.

- [ ] **Step 4: Add full `####` sections for all new tables**

Copy column lists from design § Data model. For `worker_bank_accounts` specify BYTEA encrypted columns. For `staff_calendar_days` unique `(tenant_id, worker_id, calendar_date)`.

- [ ] **Step 5: Patch existing `####` sections for alters**

- `attendance_punches`: add work_mode, accuracy_meters, office_match, device_info  
- `attendance_day_summaries`: total_hours, lop_days (keep summary_date synonym note → physical `workDate` / document both)  
- `leave_requests`: is_half_day  
- `legal_entities`: logo_blob_url, page_numbering_enabled, payroll_export_profile_id  
- `esign_*`, `document_templates`, `policy_versions`, `finance_export_profiles` per design  
- Replace brief `#### separations` / clearance / onboarding with full `separation_cases`, `clearance_items`, `onboarding_cases` column tables matching entities + new columns  

- [ ] **Step 6: Commit**

```bash
git add docs/project-requirements/database-design.md docs/superpowers/specs/2026-08-10-schema-gap-closure-design.md
git commit -m "$(cat <<'EOF'
docs(db): sync database-design for schema gap closure

EOF
)"
```

---

### Task 2: Statutory map util (TDD) — shim foundation

**Files:**
- Create: `backend/src/modules/core-hr/worker-statutory.util.ts`
- Create: `backend/src/modules/core-hr/__tests__/worker-statutory.util.spec.ts`

**Interfaces:**
- Produces:
  - `statutoryRowsFromMap(tenantId, workerId, countryCode, fields: Record<string,string>): Array<{tenantId,workerId,countryCode,fieldKey,fieldValue,expiryDate:null}>`
  - `statutoryMapFromRows(rows: Array<{fieldKey:string;fieldValue:string}>): Record<string,string>`

- [ ] **Step 1: Failing tests**

```typescript
import {
  statutoryMapFromRows,
  statutoryRowsFromMap,
} from '../worker-statutory.util';

describe('worker-statutory.util', () => {
  it('maps JSON fields to rows skipping empty values', () => {
    const rows = statutoryRowsFromMap('t1', 'w1', 'PK', {
      cnic: '35202-1',
      ntn: '',
      eobi_number: 'E1',
    });
    expect(rows).toEqual([
      {
        tenantId: 't1',
        workerId: 'w1',
        countryCode: 'PK',
        fieldKey: 'cnic',
        fieldValue: '35202-1',
        expiryDate: null,
      },
      {
        tenantId: 't1',
        workerId: 'w1',
        countryCode: 'PK',
        fieldKey: 'eobi_number',
        fieldValue: 'E1',
        expiryDate: null,
      },
    ]);
  });

  it('rebuilds map from rows', () => {
    expect(
      statutoryMapFromRows([
        { fieldKey: 'cnic', fieldValue: '1' },
        { fieldKey: 'ntn', fieldValue: '2' },
      ]),
    ).toEqual({ cnic: '1', ntn: '2' });
  });
});
```

- [ ] **Step 2: Run**

`cd backend && pnpm exec jest src/modules/core-hr/__tests__/worker-statutory.util.spec.ts --no-cache`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement util**

```typescript
export function statutoryRowsFromMap(
  tenantId: string,
  workerId: string,
  countryCode: string,
  fields: Record<string, string>,
) {
  return Object.entries(fields)
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([fieldKey, fieldValue]) => ({
      tenantId,
      workerId,
      countryCode,
      fieldKey,
      fieldValue: fieldValue.trim(),
      expiryDate: null as string | null,
    }));
}

export function statutoryMapFromRows(
  rows: Array<{ fieldKey: string; fieldValue: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) out[row.fieldKey] = row.fieldValue;
  return out;
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/core-hr/worker-statutory.util.ts backend/src/modules/core-hr/__tests__/worker-statutory.util.spec.ts
git commit -m "$(cat <<'EOF'
feat(core-hr): add statutory fields map/row helpers

EOF
)"
```

---

### Task 3: Wave 1 — currency + legal entity graph

**Files:**
- Create entities under `backend/src/modules/core-hr/entities/`:
  - `legal-entity-division-mapping.entity.ts`
  - `legal-entity-currency.entity.ts`
  - `legal-entity-signatory.entity.ts`
- Create: `backend/src/modules/country-config/entities/tenant-currency.entity.ts`
- Create: `backend/src/modules/esign/entities/signing-certificate.entity.ts`
- Modify: `backend/src/modules/core-hr/entities/legal-entity.entity.ts` — add `logoBlobUrl`, `pageNumberingEnabled`, `payrollExportProfileId`
- Create: `backend/src/database/migrations/1783041100000-SchemaGapLegalEntityCurrency.ts`
- Modify: `core-hr.module.ts`, `country-config.module.ts`, `esign.module.ts` — register entities

**Produces:** Tables + columns for wave 1.

- [ ] **Step 1: Add entity classes** matching `database-design.md` (camelCase columns, `tenantId` FK pattern like `LegalEntityStatutoryIdEntity`).

Enums:
- `signing_certificate_status_enum`: `active`, `expiring_soon`, `expired`, `revoked`

- [ ] **Step 2: Write migration `up`**

Create tables with `CREATE TABLE IF NOT EXISTS`, unique indexes per design, FK to `tenants` / `legal_entities` / `currency_codes` / `divisions` / `workers` as applicable.  
Alter `legal_entities`:

```sql
ALTER TABLE "legal_entities"
  ADD COLUMN IF NOT EXISTS "logoBlobUrl" character varying(500),
  ADD COLUMN IF NOT EXISTS "pageNumberingEnabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "payrollExportProfileId" uuid;
-- optional FK to finance_export_profiles if table exists
```

- [ ] **Step 3: Write migration `down`** — drop FKs/indexes/tables; drop new columns.

- [ ] **Step 4: Register entities in modules**

- [ ] **Step 5: Run migration**

`cd backend && pnpm migration:up`  
Expected: success

- [ ] **Step 6: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(core-hr): add legal-entity graph and tenant currency tables

EOF
)"
```

---

### Task 4: Wave 2 — core HR profile + statutory migrate

**Files:**
- Create: `office-location.entity.ts`, `worker-statutory-id.entity.ts`, `worker-bank-account.entity.ts`, `employee-skill.entity.ts`, `employment-record.entity.ts`
- Modify: `worker.entity.ts` — new profile columns; **remove** `statutoryFields`
- Create: `1783041200000-SchemaGapCoreHrProfile.ts`
- Modify: `worker.service.ts`, `worker.mapper.ts`, `dsar-export.service.ts` — use statutory util + repository
- Modify: `core-hr.module.ts`

**Interfaces:**
- Consumes: `statutoryRowsFromMap`, `statutoryMapFromRows`
- Worker create/update still accept DTO `statutoryFields: Record<string,string>` but persist via replace-all rows for that worker

- [ ] **Step 1: Entities + worker column additions** (`officeLocationId`, `jobTitle`, emergency*, address*)

- [ ] **Step 2: Migration creates tables + alters workers**

Include backfill before drop:

```sql
-- Pseudocode in queryRunner:
-- 1 CREATE worker_statutory_ids
-- 2 INSERT FROM workers where statutoryFields is not null:
--    SELECT id, tenantId, countryCode, jsonb_each_text("statutoryFields")
-- 3 ALTER workers ADD profile columns + officeLocationId FK
-- 4 CREATE office_locations, worker_bank_accounts, employee_skills, employment_records
-- 5 ALTER workers DROP COLUMN "statutoryFields"
```

Concrete insert pattern (Postgres):

```sql
INSERT INTO "worker_statutory_ids" ("id","tenantId","workerId","countryCode","fieldKey","fieldValue","expiryDate","createdAt","updatedAt")
SELECT uuid_generate_v4(), w."tenantId", w."id", w."countryCode", kv.key, kv.value, NULL, now(), now()
FROM "workers" w
CROSS JOIN LATERAL jsonb_each_text(COALESCE(w."statutoryFields", '{}'::jsonb)) AS kv(key, value)
WHERE trim(kv.value) <> '';
```

Partial unique for primary bank:

```sql
CREATE UNIQUE INDEX "IDX_worker_bank_accounts_one_primary"
  ON "worker_bank_accounts" ("tenantId", "workerId")
  WHERE "isPrimary" = true;
```

- [ ] **Step 3: Wire WorkerService**

On create/update: delete existing statutory rows for worker; insert `statutoryRowsFromMap(...)`.  
On read/mapper: load rows → `statutoryMapFromRows` into response `statutoryFields`.  
Remove assignment to `worker.statutoryFields`.

- [ ] **Step 4: Fix DSAR export** to join/select from `worker_statutory_ids` instead of column.

- [ ] **Step 5: Run**

`pnpm migration:up`  
`pnpm exec jest src/modules/core-hr/__tests__/worker.service.spec.ts src/modules/core-hr/__tests__/worker-statutory.util.spec.ts --no-cache`  
Expected: PASS (update mocks to provide statutory repo if needed)

- [ ] **Step 6: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(core-hr): normalize statutory IDs and add profile schema

EOF
)"
```

---

### Task 5: Wave 3 — time / leave / calendar

**Files:**
- Create: `backend/src/modules/time-leave/entities/work-week-pattern.entity.ts`
- Create: `company-closure.entity.ts`, `staff-calendar-day.entity.ts`
- Modify: `attendance-punch.entity.ts`, `attendance-day-summary.entity.ts`, `leave-request.entity.ts`
- Create: `1783041300000-SchemaGapTimeLeaveCalendar.ts`
- Modify: `time-leave.module.ts`
- Modify: `calendar-cell.util.ts` — keep default Mon–Fri fallback but add comment that patterns table now exists (no behavior change required this pass)

- [ ] **Step 1: Entities + enums**

- `work_week_scope_type_enum`: `global`, `country`, `division`, `worker`  
- `staff_calendar_day_type_enum`: `working`, `holiday`, `leave`, `closure`, `non_working`  
- `staff_calendar_source_enum`: `auto_generated`, `manual_override`  
- Punch: reuse `work_mode_enum` if exists on workers; else create punch-local enum  
- Add columns: `workMode`, `accuracyMeters`, `officeMatch`, `deviceInfo` on punches; `totalHours`, `lopDays` on summaries; `isHalfDay` on leave_requests

- [ ] **Step 2: Migration**

- [ ] **Step 3: Register + `pnpm migration:up`**

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(time-leave): add calendar pattern tables and attendance columns

EOF
)"
```

---

### Task 6: Wave 4 — documents / e-sign / policy / finance export

**Files:**
- Modify: `esign-envelope.entity.ts`, `esign-field.entity.ts`, `esign-audit-event.entity.ts`
- Modify: `document-template.entity.ts` (country-config)
- Modify: `policy-version.entity.ts` (documents)
- Modify: `finance-export-profile.entity.ts` — add `exportType` enum + `version` int
- Create: `1783041400000-SchemaGapDocsEsignFinance.ts`

- [ ] **Step 1: Entity column additions**

```typescript
// finance export
@Column({ type: 'varchar', length: 50, default: 'pay_run' })
exportType: string; // or enum pay_run | contractor_batch | expense_summary

@Column({ type: 'int', default: 1 })
version: number;
```

- [ ] **Step 2: Migration ALTERs**

- [ ] **Step 3: `pnpm migration:up` + commit**

```bash
git commit -m "$(cat <<'EOF'
feat(docs): add missing e-sign and export profile columns

EOF
)"
```

---

### Task 7: Wave 5 — separation / clearance

**Files:**
- Modify: `backend/src/modules/talent/entities/separation-case.entity.ts`
- Modify: `backend/src/modules/talent/entities/clearance-item.entity.ts`
- Create: `1783041500000-SchemaGapSeparationClearance.ts`
- Modify: `talent.module.ts` if needed

- [ ] **Step 1: Add columns**

Separation: `initiationType` (varchar/enum: resignation, termination, end_of_contract, other), `noticeDate`, `settlementNotes`, `exitInterviewId`, `letterDocumentId`  
Clearance: `tenantId` (backfill from parent case in migration), `ownerWorkerId`, `dueAt`, `isBlocking` default false

- [ ] **Step 2: Migration with clearance tenant backfill**

```sql
ALTER TABLE "clearance_items" ADD COLUMN IF NOT EXISTS "tenantId" uuid;
UPDATE "clearance_items" c
SET "tenantId" = s."tenantId"
FROM "separation_cases" s
WHERE c."separationCaseId" = s."id" AND c."tenantId" IS NULL;
ALTER TABLE "clearance_items" ALTER COLUMN "tenantId" SET NOT NULL;
-- then FK to tenants
```

- [ ] **Step 3: `pnpm migration:up` + commit**

```bash
git commit -m "$(cat <<'EOF'
feat(talent): deepen separation and clearance schema

EOF
)"
```

---

### Task 8: Checklist + re-audit

**Files:**
- Modify: `docs/generated/tasks.md` — add Phase 0/1 note or Phase 2 ops item checked for schema gap closure
- Run field-gap script (inline Python from audit) — expect 0 missing for in-scope tables

- [ ] **Step 1: Add tasks.md item under Phase 0 or a new “Schema hygiene” subsection**

```markdown
- [x] Schema gap closure wave (2026-08-10) — entities + migrations per `2026-08-10-schema-gap-closure-design.md`; API/UI wiring deferred
```

- [ ] **Step 2: Re-run column audit** against `database-design.md` vs entities; fix any leftover mismatches.

- [ ] **Step 3: Run broader backend tests**

`cd backend && pnpm exec jest src/modules/core-hr src/modules/time-leave src/modules/esign src/modules/talent/__tests__/separation.service.spec.ts --no-cache`  
Expected: PASS

- [ ] **Step 4: Final commit**

```bash
git commit -m "$(cat <<'EOF'
docs: mark schema gap closure complete in tasks.md

EOF
)"
```

---

## Spec coverage check

| Spec item | Task |
|---|---|
| Update database-design.md first | 1 |
| tenant_currencies + legal entity graph + signing_certificates | 3 |
| office_locations, worker profile cols, statutory normalize, bank, skills, employment_records | 4 |
| work_week_patterns, company_closures, staff_calendar_days, punch/summary/leave cols | 5 |
| esign/docs/policy/finance export cols | 6 |
| separation/clearance cols + tenant_id | 7 |
| Statutory util + shim | 2, 4 |
| tasks.md + re-audit | 8 |
| No API/UI | All tasks |

## Out of scope reminders

Do not implement geofence matching logic, bank encryption service, staff calendar materialization job, or profile UI in this plan.
