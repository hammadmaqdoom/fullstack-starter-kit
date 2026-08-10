# Feature flows (FLW-*) — Polaris

**Purpose:** Step-by-step auditable flows with control points. Full narrative for every module may grow over time; this index is the SoT for security/compliance evidence flows tied to the people-domain evidence layer.

## Index

| ID | Title | Module | Evidence |
|---|---|---|---|
| FLW-SEC-001 | Append-only audit log on mutations | compliance | `audit_log` |
| FLW-SEC-004 | DSAR access export | compliance | `POST /compliance/dsar/export` |
| FLW-SEC-005 | Quarterly access review | compliance | `access_review_*` + evidence CSV |
| FLW-SEC-006 | Hire path Entra / identity | talent + auth | provisioning jobs |
| FLW-SEC-010 | Control test run / evidence catalogue | compliance | `control_test_runs` + Hub alert |
| FLW-HR-001 | Worker CRUD with field redaction | core-hr | `audit_log` |
| FLW-TAL-002 | Day-1 onboarding gates | talent | onboarding checklist |
| FLW-TAL-006 | Pre-boarding packet | talent | pre-boarding |
| FLW-PAY-010 | Payout batch execution (Aspire / Wise / manual) | payroll | `payout_batches` + provider webhooks + remittance refs |
| FLW-OPS-002 | Expense settlement mode selection | operations | `expense_claims.settlementMode` + double-pay guard |

Other module FLW-* entries continue to live in PRD / implementation plans; add them here when rewritten.

---

## FLW-PAY-010 — Payout batch execution

1. Authenticate Finance / Super Admin.  
2. Authorise tenant + finance role.  
3. Preview lines from pay run / standalone expenses / contractor batch; resolve rail via Model C (entity default + corridor override + capability catalog).  
4. Select funding account matching chosen rail (`aspire` | `wise` | `manual_bank`).  
5. Create draft batch; execute provider (API) or manual CSV; confirm paid with references.  
6. On line paid: stamp remittance pack `paymentReference` / proof docs; mark expense paid when applicable.  
7. Audit `payout_batch.*` mutations; webhooks update line/batch status idempotently.

Control: payout rail catalogs — never hard-code country branches.

---

## FLW-OPS-002 — Expense settlement modes

1. Finance sets `settlementMode` on approve: `bundle_with_payroll` | `standalone_payout` | `export_only`.  
2. Bundle attaches to pay-run line; standalone eligible for expense reimbursement payout batch; export-only never paid via payout rails.  
3. Card-funded claims (`cardTransactionId`) are forced `export_only` and cannot switch to `standalone_payout` (`CARD_FUNDED`).  
4. Double-pay guard: claim already attached to pay run cannot enter standalone payout.

---

## FLW-SEC-004 — DSAR export

1. Authenticate People Ops / Super Admin.  
2. Authorise role + tenant.  
3. Validate worker id in tenant.  
4. Build export package (profile, documents, audit trail, payslips as implemented).  
5. Audit `compliance.dsar.export`.  
6. Return package meta / download.  

Control: `PRIV-DSAR-EXPORT`.

---

## FLW-SEC-005 — Access review

1. IT / People Ops / Super Admin opens cycle → snapshot active role assignments (`tenant_id`).  
2. Reviewers certify or revoke items.  
3. Complete cycle when items resolved.  
4. Export CSV evidence.  

Control: `ACC-REVIEW-QUARTERLY`, `ACC-RBAC-SNAPSHOT`.

---

## FLW-SEC-010 — Control test / evidence catalogue

1. **Schedule** (worker) or **manual** run for a tenant.  
2. Resolve control by `(tenant_id, code)`; load `test_adapter_key`.  
3. Adapter queries tenant-scoped producers → `pass` / `fail` / `manual` / `error`.  
4. Persist `control_test_runs` (append).  
5. On `fail` → Hub / `compliance_alerts` (`control_test_fail`) for that tenant.  
6. Catalogue UI and `GET /compliance/evidence/status|export` expose latest result.  

Controls: all seeded codes in [iso-soc-framework.md](./iso-soc-framework.md) §6.
