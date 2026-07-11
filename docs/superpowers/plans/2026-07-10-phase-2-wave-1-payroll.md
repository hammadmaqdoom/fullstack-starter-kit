# Phase 2 Wave 1 — Payroll Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finance can create a pay run, calculate (config-driven), approve, release payslips, and download PDF/Excel export packs.

**Architecture:** New NestJS module `backend/src/modules/payroll/` registered in `PolarisModule`. Entities match `docs/project-requirements/database-design.md` §3.5. APIs match `api-specification.md` §4.11. Frontend under `frontend/src/app/[locale]/(auth)/finance/` and employee payslips. Follow existing patterns from `time-leave/` and `core-hr/` (versioned controllers, `AuditLogService.append`, `DIGITARO_TENANT_ID`, RBAC via `RbacService` + `@Auth()`).

**Tech Stack:** NestJS 10, TypeORM, PostgreSQL, BullMQ (export PDF/Excel jobs), Next.js 16, PrimeReact, Jest.

**Design:** `docs/superpowers/specs/2026-07-10-phase-2-design.md`  
**FLW:** FLW-PAY-001, FLW-PAY-003  
**PRD:** §6.12

---

## File map (Wave 1)

### Backend create
- `backend/src/modules/payroll/payroll.module.ts`
- `backend/src/modules/payroll/enums/payroll.enum.ts`
- `backend/src/modules/payroll/entities/pay-component.entity.ts`
- `backend/src/modules/payroll/entities/compensation-record.entity.ts`
- `backend/src/modules/payroll/entities/benefit-type-field.entity.ts`
- `backend/src/modules/payroll/entities/employee-benefit.entity.ts`
- `backend/src/modules/payroll/entities/statutory-rate-schedule.entity.ts`
- `backend/src/modules/payroll/entities/statutory-rate-entry.entity.ts`
- `backend/src/modules/payroll/entities/pay-run.entity.ts`
- `backend/src/modules/payroll/entities/pay-run-line-item.entity.ts`
- `backend/src/modules/payroll/entities/payslip.entity.ts`
- `backend/src/modules/payroll/entities/pay-run-export-batch.entity.ts`
- `backend/src/modules/payroll/entities/finance-export-profile.entity.ts`
- `backend/src/modules/payroll/dto/*.dto.ts`
- `backend/src/modules/payroll/benefit.service.ts` + controller
- `backend/src/modules/payroll/compensation.service.ts` + controller
- `backend/src/modules/payroll/statutory-rate.service.ts` + controller
- `backend/src/modules/payroll/pay-run.service.ts` + controller
- `backend/src/modules/payroll/payslip.service.ts` + controller
- `backend/src/modules/payroll/pay-run-calculator.service.ts`
- `backend/src/modules/payroll/export.service.ts`
- `backend/src/modules/payroll/__tests__/*.spec.ts`
- `backend/src/database/migrations/1783038400000-CreatePayrollTables.ts`
- `backend/src/database/seeds/` benefit type packs PK/UAE/SG (extend setup wizard if present)

### Backend modify
- `backend/src/modules/polaris.module.ts` — import `PayrollModule`
- `backend/src/modules/country-config/entities/benefit-type.entity.ts` — either migrate ownership to payroll module (re-export) OR keep entity in country-config and import in payroll; **prefer move entity registration to PayrollModule** while keeping table name `benefit_types` (extend columns to match PRD §6.12.4 without breaking seed)
- Setup wizard seed: ensure benefit packs still seed

### Frontend create
- `frontend/src/app/[locale]/(auth)/finance/pay-runs/page.tsx`
- `frontend/src/app/[locale]/(auth)/finance/pay-runs/[id]/page.tsx`
- `frontend/src/app/[locale]/(auth)/finance/benefits/page.tsx`
- `frontend/src/app/[locale]/(auth)/finance/statutory-rates/page.tsx`
- `frontend/src/app/[locale]/(auth)/employee/payslips/page.tsx`
- Shared finance API client helpers under `frontend/src/lib/api/` or existing pattern
- `frontend/src/locales/en.json` keys for finance/payroll

---

### Task 1: Payroll module scaffold + enums + pay_components / compensation entities

**Files:**
- Create: `backend/src/modules/payroll/payroll.module.ts`
- Create: `backend/src/modules/payroll/enums/payroll.enum.ts`
- Create: `backend/src/modules/payroll/entities/pay-component.entity.ts`
- Create: `backend/src/modules/payroll/entities/compensation-record.entity.ts`
- Modify: `backend/src/modules/polaris.module.ts`
- Test: `backend/src/modules/payroll/__tests__/payroll.module.spec.ts` (smoke: module compiles)

- [ ] **Step 1: Write failing smoke test**

```typescript
// backend/src/modules/payroll/__tests__/payroll.module.spec.ts
import { Test } from '@nestjs/testing';
import { PayrollModule } from '../payroll.module';

describe('PayrollModule', () => {
  it('should compile', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PayrollModule],
    }).compile();
    expect(moduleRef).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

Run: `cd backend && pnpm exec jest src/modules/payroll/__tests__/payroll.module.spec.ts --no-cache 2>&1 | tail -30`  
Expected: cannot find module

- [ ] **Step 3: Implement enums + entities + empty module**

```typescript
// enums/payroll.enum.ts
export enum PayComponentType {
  EARNING = 'earning',
  DEDUCTION = 'deduction',
  EMPLOYER_CONTRIBUTION = 'employer_contribution',
}

export enum PayFrequency {
  MONTHLY = 'monthly',
  HOURLY = 'hourly',
  DAILY = 'daily',
}

export enum PayRunStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  EXPORTED = 'exported',
  LOCKED = 'locked',
}

export enum PayslipStatus {
  DRAFT = 'draft',
  RELEASED = 'released',
}

export enum StatutoryScheduleStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SUPERSEDED = 'superseded',
}

export enum StatutoryRateUnit {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

export enum EmployeeBenefitStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
  DRAFT = 'draft',
}

export enum ExportFileFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
  PDF = 'pdf',
}
```

Entities must include `tenantId`, UUID PKs, indexes per `database-design.md`. Match column names from design doc (`pay_components`, `compensation_records`).

`PayrollModule` registers TypeORM features for these two entities; empty providers OK. Wire into `PolarisModule` imports/exports.

- [ ] **Step 4: Run test — expect PASS** (may need to mock TypeORM — if full module import fails without DB, change smoke test to import enums/entities only, or use `TypeOrmModule.forRoot` test pattern used elsewhere in repo). Prefer matching existing module test style in `time-leave` or `compliance`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/payroll backend/src/modules/polaris.module.ts
git commit -m "feat(payroll): scaffold payroll module with pay components"
```

---

### Task 2: Extend benefit_types + benefit_type_fields + employee_benefits

**Files:**
- Modify/extend: `backend/src/modules/country-config/entities/benefit-type.entity.ts` OR move to payroll and update all imports
- Create: `benefit-type-field.entity.ts`, `employee-benefit.entity.ts`
- Create: `benefit.service.ts`, `benefit.controller.ts`, DTOs
- Test: `benefit.service.spec.ts`

- [ ] **Step 1: Write failing tests for BenefitService**

Cover:
1. `createBenefitType` writes audit_log
2. `assignEmployeeBenefit` rejects worker country mismatch
3. `listBenefitTypes` filters by country

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

API paths (version 1):
- `GET/POST/PATCH /api/v1/payroll/benefit-types`
- `GET/POST/PATCH /api/v1/payroll/employee-benefits`

RBAC: Finance + People Ops + Super Admin for mutations; row scope on employee benefits.

Extend `benefit_types` columns as needed for PRD (delivery_mode already exists; add `payroll_treatment`, `pay_component_id`, `employee_visible`, `status` if missing — via migration in Task 5). For this task, entities + service can use columns that will be in migration.

Dynamic fields: `benefit_type_fields` + `field_values` JSONB on `employee_benefits` per database-design (simpler than separate field_value table for v1 — match DB design `field_values JSONB`).

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit** `feat(payroll): benefit types and employee benefit assignments`

---

### Task 3: Compensation records CRUD

**Files:**
- `compensation.service.ts`, `compensation.controller.ts`, DTOs
- Test: `compensation.service.spec.ts`

- [ ] **Step 1: Failing tests** — create compensation, redact amounts for non-Finance roles on read, audit on update

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

Paths:
- `GET/POST/PATCH /api/v1/payroll/compensation-records`
- Query by `workerId`; effective-dated; Finance/People Ops write; employee may read own with redaction rules per role (Finance sees full; Manager does not see amounts)

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat(payroll): compensation records with field redaction`

---

### Task 4: Statutory rate schedules + entries (FLW-PAY-003)

**Files:**
- Entities: `statutory-rate-schedule.entity.ts`, `statutory-rate-entry.entity.ts`
- `statutory-rate.service.ts`, controller, DTOs
- Test: `statutory-rate.service.spec.ts`

- [ ] **Step 1: Failing tests** — create schedule draft → activate; activating supersedes prior active for same entity+country; resolve rates for pay period date

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

Paths:
- `GET/POST/PATCH /api/v1/payroll/statutory-rate-schedules`
- `POST /api/v1/payroll/statutory-rate-schedules/:id/activate`
- Entries nested or `POST .../entries`

Impact preview endpoint optional in Wave 1: `GET .../:id/impact-preview` returning count of workers in scope (simple).

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat(payroll): statutory rate schedules with activation`

---

### Task 5: Migration CreatePayrollTables

**Files:**
- Create: `backend/src/database/migrations/1783038400000-CreatePayrollTables.ts`
- Alter `benefit_types` if new columns needed
- Seed helper for PK/UAE/SG statutory starter rates + benefit packs

- [ ] **Step 1: Write migration** matching all Wave 1 entities (pay_components through pay_run_export_batches, finance_export_profiles). Use timestamp `1783038400000` (after latest Phase 1 migrations).

Include enums as PostgreSQL enum types following existing migration style (read `1783037550000-CreateTimeLeave.ts` for pattern).

- [ ] **Step 2: Run** `cd backend && pnpm migration:up` — expect success

- [ ] **Step 3: Seed statutory packs** (minimal rate keys for PK/UAE/SG) via setup-wizard extension or dedicated seed script called from migration `up` only if project already seeds in migrations — prefer setup-wizard service method `seedPayrollPacks`.

- [ ] **Step 4: Commit** `feat(payroll): add payroll tables migration and seed packs`

---

### Task 6: Pay run calculator (pure logic)

**Files:**
- `pay-run-calculator.service.ts`
- Test: `pay-run-calculator.service.spec.ts` (no DB)

- [ ] **Step 1: Failing unit tests**

```typescript
describe('PayRunCalculatorService', () => {
  it('computes gross from base + cash benefits', () => {});
  it('applies LOP deduction proportionally', () => {});
  it('applies statutory percentage rates from schedule entries', () => {});
  it('pro-rates for mid-period joiner', () => {});
  it('flags zero_net anomaly', () => {});
  it('never branches on country code string', () => {
    // calculator only uses rate_key map from schedule
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement calculator**

Input DTO (internal):
```typescript
interface WorkerPayInput {
  workerId: string;
  baseSalary: number;
  currencyCode: string;
  cashBenefits: Array<{ code: string; amount: number; includeInGross: boolean }>;
  lopDays: number;
  workingDaysInPeriod: number;
  daysEmployedInPeriod: number;
  statutoryRates: Array<{ rateKey: string; rateValue: number; rateUnit: 'percentage' | 'fixed_amount' }>;
  hasBankDetails: boolean;
  priorNetPay?: number;
  varianceThresholdPercent?: number;
}
```

Output: `{ grossPay, totalDeductions, netPay, employerCost, calculationSnapshot, anomalyFlags }`

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat(payroll): config-driven pay run calculator`

---

### Task 7: Pay run service — create, calculate, approve

**Files:**
- `pay-run.entity.ts`, `pay-run-line-item.entity.ts` (if not in Task 1)
- `pay-run.service.ts`, `pay-run.controller.ts`, DTOs
- Test: `pay-run.service.spec.ts`

- [ ] **Step 1: Failing tests**

1. Create pay run in `draft` for legal entity + period
2. Calculate pulls workers + compensation + benefits + LOP stubs; writes line items; sets status `review`
3. Approve sets `approved` + audit; second approve idempotent
4. Non-Finance cannot approve

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

Paths:
- `POST /api/v1/payroll/pay-runs`
- `GET /api/v1/payroll/pay-runs`
- `GET /api/v1/payroll/pay-runs/:id`
- `POST /api/v1/payroll/pay-runs/:id/calculate`
- `POST /api/v1/payroll/pay-runs/:id/approve`

For LOP: query `attendance_day_summaries` / unpaid leave if available; if integration heavy, inject a `PayRunInputPort` interface with a TimeLeave adapter — keep calculator pure.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat(payroll): pay run create calculate approve`

---

### Task 8: Payslips + release

**Files:**
- `payslip.entity.ts`, `payslip.service.ts`, controller
- PDF generation: reuse document PDF patterns or simple PDFKit/puppeteer already in repo — search existing PDF builders (`document-pdf.builder`)
- Test: `payslip.service.spec.ts`

- [ ] **Step 1: Failing tests** — release creates payslips from approved lines; employee lists own only; download blocked until released

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

Paths:
- `POST /api/v1/payroll/pay-runs/:id/release-payslips`
- `GET /api/v1/payroll/payslips`
- `GET /api/v1/payroll/payslips/:id/download`

Store PDF in Azure Blob when configured (reuse `AzureBlobService`); else local/media fallback like reports.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat(payroll): payslip release and employee self-service`

---

### Task 9: Export packs (PDF + Excel)

**Files:**
- `finance-export-profile.entity.ts`, `pay-run-export-batch.entity.ts`
- `export.service.ts`
- BullMQ job if heavy — follow `automation` report export pattern
- Test: `export.service.spec.ts`

- [ ] **Step 1: Failing tests** — export from approved run creates batch with blob URL; column mapping from profile; status → `exported`

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Implement**

Paths:
- `POST /api/v1/payroll/pay-runs/:id/export`
- `GET/POST /api/v1/payroll/export-profiles` (Finance)

Default profile: worker name, bank, gross, deductions, net, currency, empty payment_ref column.

- [ ] **Step 4: PASS**

- [ ] **Step 5: Commit** `feat(payroll): pay run PDF Excel export packs`

---

### Task 10: Finance + employee frontend

**Files:** frontend routes listed in file map; `en.json` keys

- [ ] **Step 1: Pages with five UI states** (loading skeleton, empty, error, offline banner if existing pattern, success toast)

Pay run list + detail with StatusTracker (`draft→…→locked`), anomaly flags table, Approve + Export actions.

Benefit type list/builder (basic CRUD).

Statutory rate list + activate.

Employee payslips list + download.

- [ ] **Step 2: Wire API client** matching envelope `{ data, meta, errors }`

- [ ] **Step 3: RequireRole Finance / Employee**

- [ ] **Step 4: Manual smoke** — pages render without crash

- [ ] **Step 5: Commit** `feat(finance): pay run benefits statutory and payslip UI`

---

### Task 11: Wave 1 verification + tasks.md

- [ ] **Step 1: Run** `cd backend && pnpm exec jest src/modules/payroll --passWithNoTests 2>&1 | tail -40`

- [ ] **Step 2: Map FLW-PAY-001 steps to tests** — document in `docs/compliance/` only if a checklist file already exists for phase; else note in tasks.md

- [ ] **Step 3: Check off Wave 1 items in `docs/generated/tasks.md`:**
  - 2.2 benefit_types, fields, employee_benefits
  - pay_components, compensation_records
  - statutory_rate_schedules/entries
  - pay_runs, line_items, anomaly detection
  - pay run approval gate
  - payslips + self-service
  - pay_run_export_batches
  - Finance export column mappings (export profiles)
  - 2.6 Benefit type builder UI, pay run review grid, statutory rate UI, payroll reports basics

- [ ] **Step 4: Commit** `docs(tasks): check off Phase 2 Wave 1 payroll items`

---

## Out of Wave 1 (later waves)

Contractor invoices, remittance, expenses, travel, help desk, FX UI, talent, enterprise governance.

## Spec coverage checklist

| Requirement | Task |
|---|---|
| PRD §6.12.1 compensation + components | 1, 3 |
| §6.12.4 benefits dynamic | 2 |
| §6.12.2 pay run calc + approve | 6, 7 |
| §6.12.3 payslips + reports/export | 8, 9 |
| FLW-PAY-003 statutory | 4 |
| FLW-PAY-001 | 7–9 |
| Finance UI §6.4 UX | 10 |
| Migration + seeds | 5 |
