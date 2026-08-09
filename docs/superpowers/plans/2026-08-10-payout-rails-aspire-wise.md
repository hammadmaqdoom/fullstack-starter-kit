# Payout Rails (Aspire / Wise / Manual) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Polaris payout rails end-to-end — Aspire primary, Wise secondary, manual bank CSV (incl. PK funding accounts), expense bundle-with-payroll + standalone + export-only, remittance refs, Aspire bank feeds reconciliation, and Aspire/Wise virtual cards with spend allocation — per [2026-08-10-payout-rails-aspire-wise-design.md](../specs/2026-08-10-payout-rails-aspire-wise-design.md).

**Architecture:** Config-driven rails in `payroll` (+ thin `integrations/aspire` and `integrations/wise`). `PayoutRailResolver` uses entity profiles + corridor overrides + capability catalogs (never hard-coded country branches). `PayoutOrchestrator` builds batches; adapters execute Aspire/Wise or `ManualCsvExporter`. Expense settlement lives in `operations` with double-pay guards. Bank feeds and cards share funding-account / legal-entity scoping.

**Tech Stack:** NestJS 10, TypeORM, Jest, BullMQ; Next.js 16, PrimeReact, Vitest; English-only `en.json`; Lucide only.

## Global Constraints

- Spec canonical: [2026-08-10-payout-rails-aspire-wise-design.md](../specs/2026-08-10-payout-rails-aspire-wise-design.md)
- API `/api/v1/`, envelope `{ data, meta, errors }`
- Every mutation → `AuditLogService.append` with `tenantId`
- Tenancy: `resolveTenantId(session)` from `@/modules/compliance/tenant-context.util`; never client-supplied tenant
- No `if (country === 'PK')` — use `provider_capability_catalogs` + rail profiles
- Finance RBAC for mutate; bank/funding fields Finance-redacted
- English only — `frontend/src/locales/en.json` only
- Conventional Commits: `feat(payroll): …`, `feat(operations): …`, `feat(frontend): …`, `docs(payroll): …`
- TDD: failing test before production code for resolver, orchestrator, settlement, adapters, CSV builder
- Statutory portals (EOBI/CPF/WPS filing UIs) out of scope; WPS = CSV export profile only
- Secrets via ConfigService / env — never log tokens or full bank numbers

## File map

| File | Responsibility |
|---|---|
| `backend/src/modules/payroll/enums/payout.enum.ts` | Rails, providers, batch types/statuses, catalog kinds |
| `backend/src/modules/payroll/entities/funding-account.entity.ts` | Aspire / Wise / manual_bank wallets |
| `backend/src/modules/payroll/entities/payout-rail-profile.entity.ts` | Per legal entity defaults |
| `backend/src/modules/payroll/entities/payout-corridor-override.entity.ts` | Payer × recipient overrides |
| `backend/src/modules/payroll/entities/provider-capability-catalog.entity.ts` | Seeded Aspire/Wise rules |
| `backend/src/modules/payroll/entities/csv-export-profile.entity.ts` | Manual column sets |
| `backend/src/modules/payroll/entities/payout-batch.entity.ts` | Batch header |
| `backend/src/modules/payroll/entities/payout-batch-line.entity.ts` | Batch lines |
| `backend/src/modules/payroll/entities/corporate-card.entity.ts` | Virtual cards |
| `backend/src/modules/payroll/entities/card-transaction.entity.ts` | Card spend |
| `backend/src/modules/payroll/entities/bank-feed-transaction.entity.ts` | Synced Aspire txns |
| `backend/src/database/migrations/1783041700000-PayoutRailsFoundation.ts` | W0 tables + expense settlement cols |
| `backend/src/database/migrations/1783041800000-PayoutBatchesAndCards.ts` | Batches + cards + bank feeds |
| `backend/src/modules/payroll/constants/provider-capability.seed.ts` | Digitaro seed catalogs + default profiles |
| `backend/src/modules/payroll/payout-rail-seed.service.ts` | `ensureSeeded(tenantId)` |
| `backend/src/modules/payroll/payout-rail-resolver.service.ts` | Model C resolution |
| `backend/src/modules/payroll/funding-account.service.ts` | CRUD funding accounts |
| `backend/src/modules/payroll/payout-rail-profile.service.ts` | Profiles + corridor CRUD |
| `backend/src/modules/payroll/csv-export-profile.service.ts` | CSV profiles |
| `backend/src/modules/payroll/manual-csv.exporter.ts` | Render CSV buffer |
| `backend/src/modules/payroll/payout-orchestrator.service.ts` | Preview + execute batches |
| `backend/src/modules/payroll/integrations/aspire/aspire-payout.adapter.ts` | Aspire payouts |
| `backend/src/modules/payroll/integrations/aspire/aspire-bank-feed.client.ts` | Bank feeds client |
| `backend/src/modules/payroll/integrations/aspire/aspire-cards.client.ts` | Cards client |
| `backend/src/modules/payroll/integrations/wise/wise-payout.adapter.ts` | Wise batch payouts |
| `backend/src/modules/payroll/integrations/wise/wise-cards.client.ts` | Wise cards (secondary) |
| `backend/src/modules/payroll/bank-feed-sync.service.ts` | Sync + match |
| `backend/src/modules/payroll/corporate-card.service.ts` | Issue / list / allocate |
| `backend/src/modules/payroll/funding-account.controller.ts` | REST |
| `backend/src/modules/payroll/payout-rail.controller.ts` | Profiles + corridors |
| `backend/src/modules/payroll/payout-batch.controller.ts` | Preview / execute / get |
| `backend/src/modules/payroll/bank-feed.controller.ts` | Sync + list + match |
| `backend/src/modules/payroll/corporate-card.controller.ts` | Cards CRUD + allocate |
| `backend/src/modules/payroll/webhooks/aspire-payout.webhook.ts` | Aspire webhooks |
| `backend/src/modules/payroll/webhooks/wise-payout.webhook.ts` | Wise webhooks |
| `backend/src/modules/payroll/dto/funding-account.dto.ts` | DTOs |
| `backend/src/modules/payroll/dto/payout-rail.dto.ts` | DTOs |
| `backend/src/modules/payroll/dto/payout-batch.dto.ts` | DTOs |
| `backend/src/modules/payroll/dto/bank-feed.dto.ts` | DTOs |
| `backend/src/modules/payroll/dto/corporate-card.dto.ts` | DTOs |
| `backend/src/modules/payroll/payroll.module.ts` | Wire all providers |
| `backend/src/modules/operations/enums/expense.enum.ts` | Add `ExpenseSettlementMode` |
| `backend/src/modules/operations/entities/expense-claim.entity.ts` | settlementMode + payRunLineItemId |
| `backend/src/modules/operations/expense-settlement.service.ts` | Bundle / standalone / export guards |
| `backend/src/modules/operations/expense-claim.service.ts` | Approve with settlementMode |
| `backend/src/worker/queues/bank-feed.processor.ts` | Scheduled Aspire feed pull |
| `frontend/src/libs/api/payout-rails.ts` | API client |
| `frontend/src/app/[locale]/(auth)/finance/funding-accounts/page.tsx` | Funding CRUD |
| `frontend/src/app/[locale]/(auth)/finance/payout-rails/page.tsx` | Profiles + corridors |
| `frontend/src/app/[locale]/(auth)/finance/csv-export-profiles/page.tsx` | Field picker profiles |
| `frontend/src/app/[locale]/(auth)/finance/payouts/page.tsx` | Batch list |
| `frontend/src/app/[locale]/(auth)/finance/payouts/generate/page.tsx` | Wizard |
| `frontend/src/app/[locale]/(auth)/finance/payouts/[id]/page.tsx` | Batch detail |
| `frontend/src/app/[locale]/(auth)/finance/bank-feeds/page.tsx` | Reconciliation inbox |
| `frontend/src/app/[locale]/(auth)/finance/cards/page.tsx` | Cards inventory |
| `frontend/src/components/...` | Nav links + wizard components |
| `frontend/src/locales/en.json` | Copy |
| `docs/project-requirements/database-design.md` | New tables |
| `docs/generated/tasks.md` | Checklist items |

---

### Task 1: Enums + entities (W0 core)

**Files:**
- Create: `backend/src/modules/payroll/enums/payout.enum.ts`
- Create: entities listed in file map for funding, profiles, corridor, catalog, csv profile
- Test: `backend/src/modules/payroll/__tests__/payout.enum.spec.ts` (smoke export)

**Interfaces:**
- Produces enums: `PayoutRail`, `FundingAccountProvider`, `PayoutBatchType`, `PayoutBatchStatus`, `PayoutLineStatus`, `ProviderCatalogKind`, `ExpenseSettlementMode` (expense enum lives in operations — add in Task 6)

- [ ] **Step 1: Write failing smoke test** that imports `PayoutRail` and expects `'aspire' | 'wise' | 'manual_bank'`

```typescript
import { FundingAccountProvider, PayoutRail } from '../enums/payout.enum';

describe('payout.enum', () => {
  it('defines rails and funding providers', () => {
    expect(PayoutRail.ASPIRE).toBe('aspire');
    expect(PayoutRail.WISE).toBe('wise');
    expect(PayoutRail.MANUAL_BANK).toBe('manual_bank');
    expect(FundingAccountProvider.MANUAL_BANK).toBe('manual_bank');
  });
});
```

- [ ] **Step 2: Run** `cd backend && pnpm test -- payout.enum.spec.ts` — expect FAIL (module missing)

- [ ] **Step 3: Implement** `payout.enum.ts`:

```typescript
export enum PayoutRail {
  ASPIRE = 'aspire',
  WISE = 'wise',
  MANUAL_BANK = 'manual_bank',
}

export enum FundingAccountProvider {
  ASPIRE = 'aspire',
  WISE = 'wise',
  MANUAL_BANK = 'manual_bank',
}

export enum PayoutBatchType {
  PAYROLL = 'payroll',
  EXPENSE_REIMBURSEMENT = 'expense_reimbursement',
  CONTRACTOR = 'contractor',
}

export enum PayoutBatchStatus {
  DRAFT = 'draft',
  PREVIEWED = 'previewed',
  SUBMITTED = 'submitted',
  FUNDING = 'funding',
  PROCESSING = 'processing',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PayoutLineStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  PAID = 'paid',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum ProviderCatalogKind {
  ASPIRE_INCORPORATION = 'aspire_incorporation',
  ASPIRE_PAYOUT_CORRIDOR = 'aspire_payout_corridor',
  WISE_BLOCKED_COUNTRY = 'wise_blocked_country',
  WISE_CURRENCY_RULE = 'wise_currency_rule',
}

export enum PayoutSourceType {
  PAY_RUN_LINE = 'pay_run_line',
  EXPENSE_CLAIM = 'expense_claim',
  CONTRACTOR_PAYMENT_LINE = 'contractor_payment_line',
}

export enum CorporateCardProvider {
  ASPIRE = 'aspire',
  WISE = 'wise',
}

export enum CorporateCardStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  CANCELLED = 'cancelled',
}

export enum BankFeedMatchStatus {
  UNMATCHED = 'unmatched',
  MATCHED_PAYOUT = 'matched_payout',
  MATCHED_CARD = 'matched_card',
  IGNORED = 'ignored',
}
```

- [ ] **Step 4: Create TypeORM entities** with `tenantId`, soft-delete where appropriate, encrypted `bankDetails` JSON column on `FundingAccountEntity` (same encryption helper pattern as `worker_bank_accounts` if one exists; otherwise store JSON and document encryption follow-up in audit note — prefer reuse).

`FundingAccountEntity` required columns: `id`, `tenantId`, `legalEntityId`, `provider`, `currency`, `label`, `externalAccountId` nullable, `bankDetails` nullable jsonb, `isActive`, timestamps, `deletedAt`.

`PayoutRailProfileEntity`: `legalEntityId`, `primaryRail`, `secondaryRail` nullable, `fallbackRail` default `manual_bank`.

`PayoutCorridorOverrideEntity`: unique `(tenantId, payerCountryCode, recipientBankCountryCode)`, rails triad.

`ProviderCapabilityCatalogEntity`: `kind`, `countryCode` nullable, `currencyCode` nullable, `payload` jsonb (e.g. `{ personalOnly: true }` for Wise PKR), `isAllowed` boolean.

`CsvExportProfileEntity`: `legalEntityId`, `name`, `columns` jsonb array `{ key, label, enabled, order }[]`, `includePayerFromFundingAccount` boolean.

- [ ] **Step 5: Re-run test** — PASS

- [ ] **Step 6: Commit** `feat(payroll): add payout rail enums and W0 entities`

---

### Task 2: Migration + seed catalogs

**Files:**
- Create: `backend/src/database/migrations/1783041700000-PayoutRailsFoundation.ts`
- Create: `backend/src/modules/payroll/constants/provider-capability.seed.ts`
- Create: `backend/src/modules/payroll/payout-rail-seed.service.ts`
- Test: `backend/src/modules/payroll/__tests__/payout-rail-seed.service.spec.ts`
- Modify: `docs/project-requirements/database-design.md` — append payout tables section

**Interfaces:**
- Produces: `PayoutRailSeedService.ensureSeeded(tenantId: string): Promise<void>`

- [ ] **Step 1: Failing test** — `ensureSeeded` inserts Aspire incorporation `SG`, Wise blocked `IR`, Wise currency rule `PKR` personal-only, and Digitaro default profiles when legal entities exist (mock repos).

```typescript
it('seeds aspire SG incorporation and wise PKR personal-only rule', async () => {
  await service.ensureSeeded(DIGITARO_TENANT_ID);
  expect(catalogSave).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: ProviderCatalogKind.ASPIRE_INCORPORATION,
      countryCode: 'SG',
      isAllowed: true,
    }),
  );
  expect(catalogSave).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: ProviderCatalogKind.WISE_CURRENCY_RULE,
      currencyCode: 'PKR',
      payload: expect.objectContaining({ personalOnly: true }),
    }),
  );
});
```

- [ ] **Step 2: Run test** — FAIL

- [ ] **Step 3: Write migration** creating all W0 tables + indexes on `(tenantId, legalEntityId)`. Also add to `expense_claims`:
  - `settlementMode` varchar nullable (backfill `'export_only'` for existing)
  - `payRunLineItemId` uuid nullable FK

- [ ] **Step 4: Implement seed constants** from design §1.3 — at minimum:
  - Aspire incorporation: full 16-country list from spec sources
  - Aspire payout corridors: `SG`,`AE`,`PK` (PK via SWIFT flag in payload), plus common APAC
  - Wise blocked countries from design §1.2
  - Wise `PKR` `{ personalOnly: true }`
  - Default rail profiles keyed by legal entity country when seeding Digitaro entities: SG→aspire/wise/manual; PK→manual only; AE→wise/manual

- [ ] **Step 5: Implement `ensureSeeded`** idempotent (upsert by unique keys)

- [ ] **Step 6: Run tests** — PASS; run migration in dev

- [ ] **Step 7: Update database-design.md** with entity column tables matching entities

- [ ] **Step 8: Commit** `feat(payroll): migrate and seed payout rail catalogs`

---

### Task 3: PayoutRailResolver (Model C)

**Files:**
- Create: `backend/src/modules/payroll/payout-rail-resolver.service.ts`
- Test: `backend/src/modules/payroll/__tests__/payout-rail-resolver.service.spec.ts`

**Interfaces:**
- Consumes: catalogs, profiles, corridor overrides, funding accounts (existence check)
- Produces:

```typescript
export type ResolvePayoutRailInput = {
  tenantId: string;
  legalEntityId: string;
  payerCountryCode: string; // ISO 3166-1 alpha-2
  recipientBankCountryCode: string;
  paymentType: 'employee_payroll' | 'expense_reimbursement' | 'contractor_invoice';
  recipientAccountLegalType?: 'personal' | 'business';
  targetCurrency?: string;
};

export type ResolvePayoutRailResult = {
  resolvedRail: PayoutRail;
  allowedRails: PayoutRail[];
  reasonCodes: string[];
  suggestedFundingAccountId: string | null;
};
```

- [ ] **Step 1: Write failing tests** covering:
  1. SG→SG → primary aspire when funding account aspire exists
  2. PK entity profile → only `manual_bank`
  3. Corridor override SG→PK preferred over entity default
  4. Wise PKR + `business` recipient → wise removed from allowed; reason `WISE_PKR_BUSINESS_UNSUPPORTED`
  5. Aspire primary invalid (no incorporation / no funding) → fall through to wise then manual

- [ ] **Step 2: Run** — FAIL

- [ ] **Step 3: Implement resolver** — exact algorithm from design §2; validate each candidate:

```typescript
function isRailAllowed(rail: PayoutRail, input: ResolvePayoutRailInput, ctx: ResolverCtx): { ok: boolean; reason?: string } {
  if (rail === PayoutRail.MANUAL_BANK) return { ok: true };
  if (rail === PayoutRail.ASPIRE) {
    if (!ctx.hasAspireIncorporation(input.payerCountryCode)) {
      return { ok: false, reason: 'ASPIRE_INCORPORATION_UNSUPPORTED' };
    }
    if (!ctx.hasActiveFunding(FundingAccountProvider.ASPIRE, input.legalEntityId)) {
      return { ok: false, reason: 'ASPIRE_FUNDING_ACCOUNT_MISSING' };
    }
    if (!ctx.hasAspireCorridor(input.recipientBankCountryCode)) {
      return { ok: false, reason: 'ASPIRE_CORRIDOR_UNSUPPORTED' };
    }
    return { ok: true };
  }
  // Wise: blocked countries, currency personalOnly, funding present
  ...
}
```

- [ ] **Step 4: Tests PASS**

- [ ] **Step 5: Commit** `feat(payroll): resolve payout rails with corridor overrides`

---

### Task 4: Funding accounts + rail profile + CSV profile APIs

**Files:**
- Create services/controllers/DTOs for funding, rail profiles, corridors, csv profiles
- Tests: `funding-account.service.spec.ts`, `csv-export-profile.service.spec.ts`
- Modify: `payroll.module.ts`

**Interfaces:**
- `FundingAccountService.create/update/list/get(tenantId, …)`
- `PayoutRailProfileService.getOrCreate / update / listCorridors / upsertCorridor`
- `CsvExportProfileService.create/update/list`
- `ManualCsvExporter.build(profile, lines, fundingAccount): Buffer`

- [ ] **Step 1: Failing tests**
  - Creating `manual_bank` funding account for PK legal entity persists `bankDetails` and audits
  - List filters by `legalEntityId` + tenant
  - CSV exporter includes payer IBAN column when `includePayerFromFundingAccount` and column enabled
  - Non-Finance role redacts `bankDetails` (service method `toPublicDto(actor)`)

- [ ] **Step 2: Implement CRUD + `ManualCsvExporter`**

CSV column keys (minimum): `workerEmployeeId`, `workerName`, `accountNumber`, `iban`, `bankCode`, `amount`, `currency`, `narration`, `cnic`, `costCentre`, `payerAccountNumber`, `payerIban`.

Exporter must:
1. Sort enabled columns by `order`
2. Escape CSV cells
3. Pull payer fields from `fundingAccount.bankDetails` when requested

- [ ] **Step 3: Controllers** under `/api/v1/funding-accounts`, `/payout-rail-profiles`, `/payout-corridor-overrides`, `/csv-export-profiles` with Finance auth guard pattern used by `pay-run.controller.ts`

- [ ] **Step 4: Tests PASS + commit** `feat(payroll): funding accounts, rail profiles, and CSV exporter`

---

### Task 5: Expense settlement modes + double-pay guard

**Files:**
- Modify: `backend/src/modules/operations/enums/expense.enum.ts`
- Modify: `expense-claim.entity.ts`, `expense.dto.ts`, `expense-claim.service.ts`
- Create: `expense-settlement.service.ts`
- Test: `expense-settlement.service.spec.ts`

**Interfaces:**

```typescript
export enum ExpenseSettlementMode {
  BUNDLE_WITH_PAYROLL = 'bundle_with_payroll',
  STANDALONE_PAYOUT = 'standalone_payout',
  EXPORT_ONLY = 'export_only',
}

// ExpenseSettlementService
attachToPayRun(tenantId, claimId, payRunId, actor): Promise<void>
assertEligibleForStandalonePayout(tenantId, claimId): Promise<void>
markPaidFromPayout(tenantId, claimId, payoutBatchLineId, actor): Promise<void>
```

- [ ] **Step 1: Failing tests**
  - Approve with `bundle_with_payroll` sets mode; `assertEligibleForStandalonePayout` throws `ConflictException`
  - After attach to pay run line, standalone still blocked
  - `export_only` never appears in standalone payout eligibility query

- [ ] **Step 2: Implement** enum + columns (if not already in Task 2 migration) + settlement service; wire approve DTO `settlementMode` (default `export_only` for backward compat, or policy default)

- [ ] **Step 3: When bundling**, create/update pay run line item with reimbursement component treatment compatible with existing calculator (`exclude_from_gross` / informational earning — match existing benefit reimbursement pattern in `pay-run-calculator.service.ts`)

- [ ] **Step 4: Tests PASS + commit** `feat(operations): expense settlement modes with double-pay guard`

---

### Task 6: Payout batch entities + orchestrator preview

**Files:**
- Create: `payout-batch.entity.ts`, `payout-batch-line.entity.ts`
- Migration: `1783041800000-PayoutBatchesAndCards.ts` (batches now; cards/feeds tables in same migration to avoid thrash — see Task 11/12)
- Create: `payout-orchestrator.service.ts`
- Test: `payout-orchestrator.service.spec.ts`

**Interfaces:**

```typescript
preview(input: {
  tenantId: string;
  type: PayoutBatchType;
  legalEntityId: string;
  sourceId: string; // payRunId | claimIds via body | contractorBatchId
  actor: ActorContext;
}): Promise<{
  lines: Array<{ sourceType: PayoutSourceType; sourceId: string; amount: string; currency: string; workerId: string; issues: string[] }>;
  resolution: ResolvePayoutRailResult;
}>;

createDraft(input: PreviewInput & { fundingAccountId: string; rail: PayoutRail; csvProfileId?: string }): Promise<PayoutBatchEntity>;
```

- [ ] **Step 1: Failing tests**
  - Payroll preview includes bundled expense lines and excludes `export_only`
  - Preview flags `MISSING_BANK` when worker has no bank account
  - `createDraft` rejects funding account whose provider ≠ selected rail
  - `createDraft` rejects rail not in `allowedRails`

- [ ] **Step 2: Implement preview/createDraft** with audit on create

- [ ] **Step 3: Tests PASS + commit** `feat(payroll): payout batch preview and draft creation`

---

### Task 7: Manual execute path (CSV download + confirm paid)

**Files:**
- Extend orchestrator + `payout-batch.controller.ts`
- Test: orchestrator manual path

**Interfaces:**
- `executeManual(tenantId, batchId, actor): Promise<{ csv: Buffer; fileName: string }>`
- `confirmManualPaid(tenantId, batchId, refs: { lineId: string; paymentReference: string }[], actor): Promise<void>`

- [ ] **Step 1: Failing tests** — executeManual only when rail=`manual_bank`; sets batch `submitted`; confirmManualPaid → line `paid`, batch `paid`/`partially_paid`; expense claims marked paid via settlement service

- [ ] **Step 2: Implement**

- [ ] **Step 3: Commit** `feat(payroll): manual bank CSV payout execution`

---

### Task 8: Aspire payout adapter + webhook

**Files:**
- Create: `integrations/aspire/aspire-payout.adapter.ts`, `aspire-auth.client.ts`
- Create: `webhooks/aspire-payout.webhook.ts`
- Config keys: `ASPIRE_CLIENT_ID`, `ASPIRE_CLIENT_SECRET`, `ASPIRE_API_BASE`, `ASPIRE_WEBHOOK_SECRET`
- Test: adapter unit tests with HTTP mocked

**Interfaces:**

```typescript
export interface PayoutAdapter {
  submitBatch(batch: PayoutBatchEntity, lines: PayoutBatchLineEntity[], funding: FundingAccountEntity): Promise<{ providerBatchId: string; lineExternalIds: Record<string, string> }>;
}

// AspirePayoutAdapter implements PayoutAdapter
// Auth: POST /public/v1/login client credentials; token TTL 900s; cache in memory
// Every POST: Idempotency-Key = payout_batch_line.id
```

- [ ] **Step 1: Failing tests** — submitBatch maps lines to Aspire payout payload; retries on 401 by refreshing token; webhook signature invalid → 401; webhook paid → line status paid (idempotent)

- [ ] **Step 2: Implement adapter** behind interface; if sandbox credentials missing, adapter throws `AspireNotConfiguredError` and orchestrator surfaces clear error (do not silently no-op)

- [ ] **Step 3: Wire `executeAspire` in orchestrator: status `submitted` → `processing`; store provider ids

- [ ] **Step 4: Commit** `feat(payroll): Aspire payout adapter and webhooks`

---

### Task 9: Wise payout adapter + webhook

**Files:**
- Create: `integrations/wise/wise-payout.adapter.ts`, `wise-auth.client.ts`
- Create: `webhooks/wise-payout.webhook.ts`
- Config: `WISE_API_TOKEN` or OAuth client credentials per env, `WISE_PROFILE_ID`, `WISE_API_BASE`, `WISE_WEBHOOK_SECRET`

**Interfaces:** Same `PayoutAdapter`. Implementation uses quote → recipient → batch group (N>1) or single transfer → fund from selected MCA (`funding.externalAccountId`).

- [ ] **Step 1: Failing tests** — batch group create/add/complete/fund sequence mocked; PKR business line skipped with `WISE_PKR_BUSINESS_UNSUPPORTED` before API call; webhook updates status without regressing `paid`

- [ ] **Step 2: Implement**

- [ ] **Step 3: Orchestrator fallback helper** `suggestSecondaryOnFailure(batch)` — if Aspire fails at submit and wise allowed, do **not** auto-switch without Finance confirm; expose `POST /payout-batches/:id/retry-with-secondary` that Finance calls

- [ ] **Step 4: Commit** `feat(payroll): Wise payout adapter and secondary retry`

---

### Task 10: Remittance pack linkage + pay-run / contractor hooks

**Files:**
- Modify: `remittance.service.ts` to accept `providerTransferId` / payment ref from payout lines
- Modify: pay-run approve/export UI flow docs in finance pages — hook “Generate payout” CTA
- Test: remittance update from payout line

- [ ] **Step 1: On line `paid`**, if corridor requires remittance pack, set payment reference fields and open/complete checklist items already modeled in remittance entities

- [ ] **Step 2: Commit** `feat(payroll): link payout refs to remittance packs`

---

### Task 11: Aspire bank feeds sync + match UI API

**Files:**
- Entities already in migration 1783041800000: `bank_feed_transactions`
- Create: `aspire-bank-feed.client.ts`, `bank-feed-sync.service.ts`, `bank-feed.controller.ts`
- Worker: `bank-feed.processor.ts` daily job foreach tenant
- Test: sync + match

**Interfaces:**

```typescript
sync(tenantId, fundingAccountId, actor?): Promise<{ inserted: number }>;
list(tenantId, query: { matchStatus?: BankFeedMatchStatus }): Promise<Paginated…>;
matchToPayoutLine(tenantId, feedId, payoutBatchLineId, actor): Promise<void>;
matchToCardTransaction(tenantId, feedId, cardTransactionId, actor): Promise<void>;
ignore(tenantId, feedId, actor): Promise<void>;
```

- [ ] **Step 1: Failing tests** — sync upserts by provider txn id; signed amount + credit/debit stored; match sets status; tenant isolation

- [ ] **Step 2: Implement client** reading Aspire Transactions / Bank Feeds API (`type` credit/debit + signed amount per Aspire docs)

- [ ] **Step 3: Controller** `GET/POST /bank-feeds/sync`, `GET /bank-feeds`, `POST /bank-feeds/:id/match`, `POST /bank-feeds/:id/ignore`

- [ ] **Step 4: BullMQ schedule** daily; commit `feat(payroll): Aspire bank feed sync and matching`

---

### Task 12: Corporate cards + spend allocation

**Files:**
- Entities: `corporate_cards`, `card_transactions` (in 1783041800000)
- Create: `aspire-cards.client.ts`, `wise-cards.client.ts`, `corporate-card.service.ts`, controller
- Modify: `expense-claim.service.ts` — `createDraftFromCardTransaction`
- Test: issue card, ingest txn, allocate → draft expense

**Interfaces:**

```typescript
issueCard(input: {
  tenantId; legalEntityId; provider: CorporateCardProvider; workerId?; travelRequestId?;
  spendLimit: string; currency; label; fundingAccountId; actor;
}): Promise<CorporateCardEntity>;

syncCardTransactions(tenantId, cardId): Promise<number>;

allocateToExpense(tenantId, cardTransactionId, dto: { category; costCentre?; note? }, actor): Promise<{ expenseClaimId: string }>;
```

- [ ] **Step 1: Failing tests**
  - Issue Aspire card when Aspire funding exists
  - Issue Wise only if Aspire unavailable for entity (secondary) — still allowed if Finance explicitly passes `provider: wise`
  - Allocate creates expense claim `draft` with `settlementMode=export_only` (company-paid; not reimbursable) and links `cardTransactionId`
  - Cannot mark card-funded claim as `standalone_payout`

- [ ] **Step 2: Implement** clients + service + guard on settlement modes for card-linked claims (`CARD_FUNDED` reason)

- [ ] **Step 3: Commit** `feat(payroll): corporate cards and spend-to-expense allocation`

---

### Task 13: Frontend — config screens (funding, rails, CSV profiles)

**Files:**
- Create pages under `finance/funding-accounts`, `finance/payout-rails`, `finance/csv-export-profiles`
- Create `frontend/src/libs/api/payout-rails.ts`
- Modify finance layout / sidebar nav + `en.json`

- [ ] **Step 1: API client functions** mirroring backend routes with typed envelopes

- [ ] **Step 2: Funding accounts page** — DataTable + Dialog form; provider select shows Aspire/Wise external id **or** manual bank fields

- [ ] **Step 3: Payout rails page** — entity default form + corridor override DataTable

- [ ] **Step 4: CSV profiles page** — checkbox list + reorder (PrimeReact OrderList or up/down buttons); preview table

- [ ] **Step 5: English strings only in `en.json`**

- [ ] **Step 6: Commit** `feat(frontend): finance payout rail configuration screens`

---

### Task 14: Frontend — payout wizard + batch detail

**Files:**
- `finance/payouts/page.tsx`, `generate/page.tsx`, `[id]/page.tsx`
- Hook from pay-run detail + contractor batch + expenses finance queue

- [ ] **Step 1: Wizard steps** — type/source → preview (issues column) → select rail (allowed only) → select funding account → confirm (or CSV download)

- [ ] **Step 2: Status tracker** component for batch status machine

- [ ] **Step 3: Batch detail** — lines, retry-with-secondary button, confirm-manual-paid form

- [ ] **Step 4: Expense approve UI** — settlement mode dropdown (bundle / standalone / export)

- [ ] **Step 5: Commit** `feat(frontend): payout generation wizard and settlement controls`

---

### Task 15: Frontend — bank feeds + cards

**Files:**
- `finance/bank-feeds/page.tsx` — unmatched inbox, match dialog
- `finance/cards/page.tsx` — issue card dialog, transactions, allocate action

- [ ] **Step 1: Implement pages** with five UI states (loading skeleton, empty, error, offline if existing pattern, success toast)

- [ ] **Step 2: Nav entries** under Finance

- [ ] **Step 3: Commit** `feat(frontend): bank feed reconciliation and corporate cards UI`

---

### Task 16: Docs, tasks.md, smoke verification

**Files:**
- Update `docs/generated/tasks.md` with payout rails checklist (all features)
- Update `docs/compliance/feature-flows.md` with `FLW-PAY-010` payout execution / `FLW-OPS-002` expense settlement if missing
- Spec link from plan already present

- [ ] **Step 1: Add acceptance checklist** mirroring design §14 + bank feed match + card allocate

- [ ] **Step 2: Run backend unit suites** for payroll + operations settlement:

```bash
cd backend && pnpm test -- payout-rail-resolver.service.spec.ts payout-orchestrator.service.spec.ts expense-settlement.service.spec.ts funding-account.service.spec.ts
```

Expected: PASS

- [ ] **Step 3: Manual smoke** (local): seed → create SG Aspire funding + PK manual funding → preview SG payroll → preview PK CSV → approve expense bundle → regenerate pay run preview includes claim

- [ ] **Step 4: Commit** `docs(payroll): record payout rails delivery checklist`

---

## Spec coverage (self-check)

| Spec area | Tasks |
|---|---|
| Aspire primary / Wise secondary / Model C | 3, 4, 8, 9 |
| PK manual CSV + field picker | 4, 7, 13, 14 |
| Funding accounts aspire/wise/**manual_bank** | 1, 4, 13 |
| Expense bundle / standalone / export | 5, 6, 14 |
| Payroll + contractor + reimbursement batches | 6–10, 14 |
| Remittance refs | 10 |
| Bank feeds | 11, 15 |
| Virtual cards + allocation | 12, 15 |
| Catalogs / no country hard-code | 2, 3 |
| Audit / tenant / RBAC | all service tasks |
| Webhooks / idempotency | 8, 9 |

## Follow-ups explicitly in-plan (not deferred)

W2 bank feeds = Task 11 + 15. W3 cards = Task 12 + 15. No separate plan required unless execution is split by wave for staffing.

---

## Execution

Plan complete when saved. Offer:

1. **Subagent-Driven (recommended)** — fresh subagent per task + review between tasks  
2. **Inline Execution** — this session with executing-plans checkpoints
