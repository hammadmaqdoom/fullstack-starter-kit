# Design: Payout Rails — Aspire Primary, Wise Secondary, Manual CSV

**Date:** 2026-08-10  
**Status:** Draft — pending user review  
**Product:** Polaris (Digitaro HRMS)  
**Related:** PRD §6.9 (expenses), §6.12 (payroll / export / remittance), `docs/compliance/tax-compliance-boundary.md`  
**External docs:** [Wise Platform](https://docs.wise.com/guides), [Aspire Payroll](https://docs.api.aspireapp.com/use-cases/payroll-automations), [Aspire Accounting](https://docs.api.aspireapp.com/use-cases/accounting-automation), [Aspire Cards](https://docs.api.aspireapp.com/use-cases/card-ota)

## Problem

Polaris calculates pay runs, contractor batches, and expense claims, then today stops at **PDF/Excel export** for manual Xero / bank processing. Digitaro operates multi-currency Aspire and Wise business accounts and wants Polaris to:

1. Drive **payouts** after Finance approval (salary, contractors, reimbursements)
2. Optionally **bundle expense reimbursements into payroll**
3. Support **per-country / per-corridor** rails with Aspire primary and Wise secondary
4. Keep **Pakistan entity** on **manual bank transfer + configurable CSV**
5. Configure **funding accounts** (Aspire MCA, Wise MCA, and local manual bank accounts such as PK operating accounts) and choose them at payout generation
6. Later extend to **virtual cards + spend allocation** and **Aspire bank feeds** for reconciliation

This is an intentional expansion beyond the v1 “no accounting API” boundary: Polaris remains system of record for calculation and approval; payment providers are execution rails only. Statutory remittance portals (EOBI, CPF, WPS filing) remain out of scope.

## Goals

1. **Aspire primary, Wise secondary**, resolved **per legal entity** with **per-corridor overrides** (payer country × recipient bank country).
2. **Manual bank + field-picker CSV** for entities/corridors that require it (Digitaro PK entity by default).
3. **Funding accounts** for `aspire` | `wise` | `manual_bank`, scoped to `legal_entity_id`, selected by Finance at payout generation.
4. Expense settlement modes: **`bundle_with_payroll`** | **`standalone_payout`** | **`export_only`**, with double-pay prevention.
5. Full feature family (may ship in waves): payroll payouts, standalone reimbursements, contractor payouts, remittance pack linkage, PK CSV profiles, virtual cards + allocation, Aspire bank feeds.
6. Country capability via **config catalogs** seeded from official provider lists — never `if (country === 'PK')` in application logic.

## Non-goals

- Replacing payroll **calculation** with Aspire/Wise
- Live Xero journal posting (bank feeds / export packs only)
- Statutory remittance portals (EOBI, CPF, WPS *submission* UIs)
- Productizing payments for third-party tenants (Digitaro internal use)
- Opening Aspire accounts for countries Aspire does not support for incorporation (e.g. PK, AE) — Digitaro uses SG Aspire account as payer where configured

## Decisions (confirmed)

| Topic | Choice |
|---|---|
| Primary rail | **Aspire** |
| Secondary rail | **Wise** |
| Routing model | **C** — entity default + corridor overrides |
| PK Digitaro entity | **Manual bank CSV** (+ funding account for PK operating bank) |
| Funding accounts | Configured in Polaris for Aspire, Wise, **and manual bank**; chosen at payout generation |
| Expense reimbursement | Bundle with payroll **and** standalone payout **and** export-only |
| Feature scope | **All** features in this design; implementation may wave |
| Provider KYC model | Digitaro’s own funds (Aspire business / Wise enterprise-style payouts); recipients are employees/vendors, not Aspire/Wise end customers |

---

## Approaches considered

### Approach 1 — Config-driven rails + adapters (**SELECTED**)

Polaris owns amounts, recipients, approval, audit. Adapters execute Aspire / Wise / CSV. Catalogs + profiles choose the rail.

**Why:** Matches Digitaro multi-entity reality, preserves compliance boundary, allows PK manual and SG API in one product.

### Approach 2 — Single global provider

Rejected — Digitaro needs Aspire + Wise + PK manual.

### Approach 3 — Export-only forever

Rejected for this initiative — user wants API payouts and cards/feeds.

---

## 1. Official provider coverage (as of research date 2026-08-10)

### 1.1 Aspire

**Account opening (payer entity incorporation)** — companies incorporated in ([Aspire Help](https://help.aspireapp.com/en/articles/9239713-what-countries-does-aspire-support)):

Australia, China, Hong Kong, India, Indonesia, Malaysia, Maldives, Mongolia, Philippines, Singapore, South Korea, Sri Lanka, Taiwan, Thailand, United States, Vietnam.

**Not** on that list: **Pakistan, United Arab Emirates** → Digitaro PK/AE legal entities cannot open Aspire company accounts. Digitaro **SG** entity can.

**Payout reach** (from an eligible Aspire account): 38 local rails + SWIFT to 100+ countries; FX corridors include AED and others ([Collections and Payouts](https://help.aspireapp.com/sg/en/articles/15433948-collections-and-payouts), [Global Account](https://aspireapp.com/global-account)). Holding currencies include SGD, USD, EUR, GBP, HKD, CNH (+ more). Local collection accounts live for a subset; APAC local accounts expanding.

**APIs (feature map):** Payouts (payroll/supplier), Bank Feeds / Transactions (accounting automation), Cards (virtual card issuance with limits). Auth: OAuth2; payouts may require 2FA for non-admin. Payout API commercial access may require partner onboarding / waitlist — treat as integration dependency.

### 1.2 Wise

**Enterprise / business payouts** from Digitaro’s Wise account: quote → recipient → transfer → fund; **batch groups** up to 1000 transfers ([Batch transfers](https://docs.wise.com/guides/product/send-money/batch-transfers), [Enterprise send money](https://docs.wise.com/guides/product/send-money/use-cases/enterprise/send-money)).

**Blocked countries/regions** (cannot send/receive / operate) include AF, BY, BI, CF, TD, CG, CD, CU, ER, IR, IQ, KP, LY, MM, SO, SS, RU, SD, SY, YE, VE, and certain Ukraine regions ([Where can I use Wise?](https://wise.com/help/articles/2978049/where-can-i-use-wise)). **PK, AE, SG are not on the block list.**

**Currency caveat:** Wise can send **PKR to personal accounts within Pakistan**; **business payments to PKR are not supported** ([currencies](https://wise.com/help/articles/2571907/what-currencies-can-i-send-to-and-from)). Encode as `wise_currency_restrictions` catalog rule.

### 1.3 Digitaro seed defaults

| Payer entity | Recipient bank | Primary | Secondary | Fallback |
|---|---|---|---|---|
| SG | SG | Aspire | Wise | Manual CSV |
| SG | PK | Aspire (SWIFT) | Wise (personal PKR only) | Manual CSV + remittance pack |
| SG | AE | Aspire (AED corridor) | Wise | Manual / WPS bank file export |
| PK | PK | Manual bank CSV | — | — |
| AE | AE | Wise | Manual / WPS file | CSV |

WPS (UAE salary compliance file) is a **manual export profile type**, not an Aspire/Wise substitute for statutory WPS obligations.

Catalog rows are **seeded and admin-updatable**; product must not hard-code the table above in TypeScript conditionals.

---

## 2. Rail resolution (Model C)

```
1. Load payout_rail_profile for legal_entity_id
2. If payout_corridor_override matches (payer_country, recipient_bank_country)
     use override primary / secondary / fallback
   else use entity profile defaults
3. Validate candidate rail against provider_capability_catalogs + configured funding_accounts
4. If invalid → try secondary → else manual_bank CSV with machine reason_code
5. Finance may override to any still-allowed rail at payout generation
```

**Inputs:** `legal_entity_id`, worker `bank_country_code`, payment type (`employee_payroll` | `expense_reimbursement` | `contractor_invoice`), optional recipient `account_legal_type` (personal vs business) for Wise PKR rule.

**Outputs:** `resolved_rail`, `allowed_rails[]`, `reason_codes[]`, `suggested_funding_account_id` (nullable — Finance still confirms).

---

## 3. Funding accounts

Finance/Admin configures wallets and bank accounts Digitaro actually holds.

| Field | Notes |
|---|---|
| `tenant_id` | Required |
| `legal_entity_id` | Required |
| `provider` | `aspire` \| `wise` \| `manual_bank` |
| `currency` | ISO 4217 |
| `label` | e.g. "Aspire SGD MCA", "Wise USD", "PK Payroll — HBL" |
| `external_account_id` | Aspire/Wise account id when API-backed |
| `bank_details` | Encrypted JSON for manual (IBAN, account no, bank name, SWIFT, branch) — Finance-redacted on read |
| `is_active` | Soft disable |
| `audit` | All mutations → `audit_log` |

**At payout generation:** Finance selects one funding account compatible with the chosen rail and legal entity. Manual CSV may include **payer** columns sourced from the selected `manual_bank` funding account.

---

## 4. Expense settlement modes

On `expense_claims` (or approval DTO):

| Mode | Behaviour |
|---|---|
| `bundle_with_payroll` | Attach to open/next pay run as reimbursement earning line (payroll_treatment compatible with `exclude_from_gross` / reimbursement). Paid with salary via that pay run’s payout batch. |
| `standalone_payout` | Eligible for a reimbursement `payout_batch` after Finance approval. |
| `export_only` | Appears on expense export pack only; no API payout line. |

**Double-pay guard:** Once `bundle_with_payroll` and linked to a pay_run_line (or marked included), claim cannot enter a standalone payout batch. Status tracker shows settlement path.

Default mode: from `expense_policies` or entity profile; Finance may change at approval.

---

## 5. Payout batch lifecycle

### 5.1 Batch types

- `payroll` — approved pay run (includes bundled expenses)
- `expense_reimbursement` — standalone approved claims
- `contractor` — approved contractor payment batch

### 5.2 Generation wizard (Finance)

1. Choose batch type + source document (pay run / claim set / contractor batch)
2. Preview lines; flag missing banks / Wise PKR business conflicts
3. System proposes rail (Model C); Finance confirms or overrides within `allowed_rails`
4. Finance selects **funding account**
5. If `manual_bank`: open CSV field-picker (profile select → columns → order → download)
6. If Aspire/Wise: submit batch (idempotent); poll/webhooks for status
7. Persist provider refs on lines; update remittance packs where corridor requires

### 5.3 Status machine (batch and line)

`draft` → `previewed` → `submitted` → `funding` → `processing` → `paid` | `partially_paid` | `failed` | `cancelled`

Rules: never regress `paid` → earlier state; line-level retry allowed; every transition audited.

### 5.4 Provider adapters

| Adapter | Behaviour |
|---|---|
| `AspirePayoutAdapter` | Recipients + payouts; 2FA/OAuth as required; webhooks; idempotency keys |
| `WisePayoutAdapter` | Quote + recipient + transfer; prefer batch groups for N>1; fund from selected MCA |
| `ManualCsvExporter` | Render CSV from profile + funding account payer fields; no auto-mark paid until Finance confirms payment refs (optional confirm step) |

---

## 6. PK / manual CSV export profiles

`csv_export_profiles`:

- Scoped to `legal_entity_id` (and optional bank format name: “HBL payroll”, “Generic IBFT”, “WPS salary file”)
- Column catalog (worker id, name, account, IBAN, bank code, amount, currency, narration, CNIC, cost centre, payer account from funding account, …)
- Checkbox + drag reorder before download
- Saved defaults per entity

---

## 7. Cards, allocation, bank feeds (same design family)

Ship after core payouts if needed, but in-scope for this design:

| Capability | Provider | Polaris behaviour |
|---|---|---|
| Virtual cards | Aspire primary; Wise secondary if configured | Issue per trip/budget; spend limits; link to worker/travel request |
| Spend allocation | — | Card transactions → draft expense lines → manager/Finance approve allocation to cost centre |
| Bank feeds | Aspire Transactions / Bank Feeds API | Sync credits/debits; match to payout_batch_lines and card spend; support Xero reconciliation workflow (no live Xero post) |

Out-of-pocket reimbursements remain claim-based; card spend is company-paid allocation, not a second reimbursement.

---

## 8. Data model (additions)

All business tables: `tenant_id`; financial tables: `legal_entity_id` where applicable; soft-delete; mutations → `audit_log`.

| Entity | Purpose |
|---|---|
| `funding_accounts` | Aspire / Wise / manual_bank wallets |
| `payout_rail_profiles` | Per legal entity primary/secondary/fallback |
| `payout_corridor_overrides` | Payer × recipient bank country rails |
| `provider_capability_catalogs` | Aspire incorporation, Aspire payout corridors, Wise blocked, Wise currency rules |
| `payout_batches` | Header: type, rail, funding_account_id, status, provider refs |
| `payout_batch_lines` | Source type/id, amount, currency, recipient, provider_transfer_id, status |
| `csv_export_profiles` | Manual field picker definitions |
| `expense_claims.settlement_mode` | Enum as above (+ link to pay_run_line when bundled) |
| `corporate_cards` / `card_transactions` | Optional wave for cards + feeds |

Existing: `worker_bank_accounts`, `pay_runs`, `pay_run_line_items`, `expense_claims`, `contractor_payment_batches`, remittance pack entities — extend with settlement and payout foreign keys as needed.

---

## 9. Backend modules & API sketch

Bounded context: prefer `payroll` (payout orchestration) with thin provider clients under `integrations/aspire` and `integrations/wise`, or `modules/operations` if finance ops already lives there. Match existing module layout at implementation time.

**Services:** `PayoutRailResolver`, `PayoutOrchestrator`, `ExpenseSettlementService`, `AspirePayoutAdapter`, `WisePayoutAdapter`, `ManualCsvExporter`, `BankFeedSyncService` (wave), `CorporateCardService` (wave).

**API (illustrative `/api/v1/`):**

- `GET/POST/PATCH /funding-accounts`
- `GET/PUT /payout-rail-profiles`
- `GET/PUT /payout-corridor-overrides`
- `GET/PUT /csv-export-profiles`
- `POST /payout-batches/preview`
- `POST /payout-batches` (execute or prepare CSV)
- `GET /payout-batches/:id`
- `POST /payout-batches/:id/confirm-manual-paid` (optional)
- Provider webhooks: `/webhooks/aspire/*`, `/webhooks/wise/*` (signature verified)
- Expense approve: include `settlementMode`

Envelope `{ data, meta, errors }`; RBAC Finance (mutate) / People Ops (read as needed); bank and funding details field-redacted.

---

## 10. Frontend (Finance)

Routes under existing finance shell:

- Funding accounts list/form (provider-specific fields)
- Rail profiles + corridor override grid
- CSV export profile editor
- **Generate payout** wizard (status tracker)
- Pay run: bundled reimbursement summary
- Expense approve: settlement mode control
- Payout batch detail + remittance pack links
- (Wave) Cards inventory + bank feed reconciliation inbox

UX: five states; Lucide only; English `en.json` only; Hub notifications for failed payouts / missing banks.

---

## 11. Compliance & security

- Pipeline: Authenticate → Authorise → Validate → Persist + `audit_log` → scoped response
- Secrets (Aspire/Wise client credentials) in Key Vault / env — never logged
- Encrypted bank details at rest (same pattern as `worker_bank_accounts`)
- Idempotent provider writes
- Append-only evidence: payout status history + remittance documents
- Country rules only via config catalogs / profiles

---

## 12. Implementation waves (recommended)

| Wave | Scope |
|---|---|
| **W0** | Schema + catalogs + funding accounts + rail profiles/overrides + resolver + PK CSV field picker |
| **W1** | Payout batches for payroll + bundle-with-payroll expenses + standalone reimbursements + contractor; Aspire adapter; Wise adapter; webhooks; remittance refs |
| **W2** | Aspire bank feeds reconciliation UI |
| **W3** | Virtual cards + spend → draft expenses |

W0–W1 are the minimum to claim “payout rails live.” W2–W3 complete the “all features” commitment.

---

## 13. Risks & open dependencies

| Risk | Mitigation |
|---|---|
| Aspire Payout API access gated | Confirm Digitaro partner/API access before W1 coding; sandbox first |
| Wise PKR business restriction | Catalog rule + UI block; route contractors to Aspire SWIFT or manual |
| UAE WPS | Separate CSV/WPS export profile; do not claim Wise/Aspire replaces WPS |
| FX timing | Lock quote at submit; show fees on preview |
| Partial failures | Line-level status + retry |

---

## 14. Acceptance criteria (design-level)

1. Given SG entity + SG bank worker, when Finance generates payroll payout, then Aspire is proposed first and Wise is available as override if configured.
2. Given PK entity, when Finance generates payroll payout, then only manual rail is allowed and CSV field picker runs against a selected `manual_bank` funding account.
3. Given corridor override SG→PK, when recipient is personal PKR, then Wise secondary is allowed; when business PKR, then Wise is rejected with reason.
4. Given expense approved as `bundle_with_payroll`, when pay run is paid, then claim is marked paid and cannot enter standalone payout.
5. Given expense approved as `standalone_payout`, when reimbursement batch pays via Aspire/Wise/CSV, then claim status tracks to paid with provider or manual ref.
6. Given funding accounts for Aspire, Wise, and PK manual bank on their entities, when opening payout wizard, then only compatible funding accounts for the selected rail are listed.
7. Every payout mutation writes `audit_log`; bank fields are redacted for non-Finance roles.

---

## Sources

- [Wise Platform guides](https://docs.wise.com/guides)
- [Wise batch transfers](https://docs.wise.com/guides/product/send-money/batch-transfers)
- [Wise enterprise send money](https://docs.wise.com/guides/product/send-money/use-cases/enterprise/send-money)
- [Wise — where can I use Wise?](https://wise.com/help/articles/2978049/where-can-i-use-wise)
- [Wise — currencies send/from](https://wise.com/help/articles/2571907/what-currencies-can-i-send-to-and-from)
- [Aspire — countries for account opening](https://help.aspireapp.com/en/articles/9239713-what-countries-does-aspire-support)
- [Aspire — collections and payouts](https://help.aspireapp.com/sg/en/articles/15433948-collections-and-payouts)
- [Aspire payroll automations](https://docs.api.aspireapp.com/use-cases/payroll-automations)
- [Aspire accounting automation](https://docs.api.aspireapp.com/use-cases/accounting-automation)
- [Aspire card OTA](https://docs.api.aspireapp.com/use-cases/card-ota)
