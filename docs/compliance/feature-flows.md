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

Other module FLW-* entries continue to live in PRD / implementation plans; add them here when rewritten.

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
