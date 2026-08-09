# ISO / SOC compliance framework — Polaris

**Status:** Restored 2026-08-10 (people-domain evidence layer)  
**Tenant model:** All in-app evidence is `tenant_id`-scoped (Digitaro v1; multi-tenant-ready).

## 1. Purpose / Digitaro posture

Digitaro operates Labs + Studio across Pakistan, UAE, and Singapore. Polaris embeds an ISO-aligned management system and produces **in-system evidence** for people, access, policy, privacy, and process controls. Formal ISO certification and SOC 2 Type II remain organisational programmes; Polaris supplies the continuous people-domain evidence window.

## 2. Frameworks in scope

| Framework / overlay | Role in Polaris |
|---|---|
| ISO 9001 | Process / workflow evidence |
| ISO 30400-series | HR management evidence |
| ISO 27001 | InfoSec — people/access/policy subset |
| ISO 27701 | Privacy extension |
| SOC 2 TSC | Trust Services Criteria evidence for Type II readiness |
| Singapore PDPA | Legal overlay → privacy controls |
| UAE PDPL | Legal overlay → privacy controls |
| GDPR principles | Spec alignment overlay |
| Pakistan DP direction | Config-ready privacy controls |

**Out of Polaris automation:** HIPAA, PCI-DSS, FedRAMP, CMMC, cloud CSPM packs, Trust Center badge frameworks, ISO 42001 (unless product strategy changes).

## 3. Domains

| Domain | Examples |
|---|---|
| `policy` | Mandatory policy acknowledgement by version |
| `access` | Access reviews, RBAC snapshots, Entra offboarding |
| `people` | Training awareness, onboarding gates, separation clearance |
| `privacy` | DSAR export, retention |
| `process` | Append-only audit log, e-sign certificate of completion |

## 4. Tenancy

Evidence catalogue, programme settings, test runs, and exports are **per tenant**. See design §2.1. Control codes are unique within a tenant, not globally.

## 5. Retention

Default **5-year** retention post-departure for workforce and audit evidence, aligned with [database-design.md](../project-requirements/database-design.md) classification notes. Soft-delete only on business entities; `audit_log` and `control_test_runs` are append-oriented.

## 6. Evidence catalogue (Wave 1 seed)

Seed in app must match these codes exactly. Adapter `null` = manual / hybrid control.

| Code | Title | Domain | Owner | Adapter | Example framework refs |
|---|---|---|---|---|---|
| `POL-ACK-CURRENT` | Current mandatory policy acknowledgement 100% | policy | people_ops | `policy_ack_current` | SOC2:CC1.1; ISO27001:A.5.1; ISO9001:7.5 |
| `POL-VERSION-MANDATORY` | Mandatory policies published and versioned | policy | people_ops | — | ISO27001:A.5.1; ISO27701:6.2 |
| `ACC-REVIEW-QUARTERLY` | Quarterly access review completed | access | it_admin | `access_review_quarterly` | SOC2:CC6.2; ISO27001:A.5.18 |
| `ACC-RBAC-SNAPSHOT` | RBAC assignments reviewable / snapshot healthy | access | it_admin | `rbac_assignment_reviewable` | SOC2:CC6.1; ISO27001:A.5.15 |
| `ACC-OFFBOARD-ENTRA` | Entra disable within SLA after separation | access | it_admin | `offboarding_entra_disable` | SOC2:CC6.3; ISO27001:A.5.18 |
| `PEO-TRAIN-AWARENESS` | No overdue awareness/compliance training | people | people_ops | `training_awareness_overdue` | SOC2:CC1.4; ISO27001:A.6.3 |
| `PEO-ONBOARD-GATE` | Onboarding gated on policies / docs / Entra | people | people_ops | — | ISO30400; ISO9001:8.5 |
| `PEO-SEPARATION-CLEARANCE` | Separation clearance completed before archive | people | people_ops | — | ISO27001:A.6.5; SOC2:CC6.3 |
| `PRIV-DSAR-EXPORT` | DSAR export capability ready | privacy | people_ops | `dsar_export_ready` | ISO27701; PDPA; PDPL; GDPR |
| `PRIV-RETENTION-5Y` | Retention schedule documented and applied | privacy | people_ops | — | ISO27701; PDPA; PDPL |
| `PROC-AUDIT-LOG` | Append-only audit log operational | process | super_admin | `audit_log_immutable` | SOC2:CC7.2; ISO27001:A.8.15 |
| `PROC-ESIGN-COC` | E-sign Certificate of Completion retained | process | people_ops | — | ISO9001:7.5; SOC2:CC8.1 |

Live status, scheduled tests, and exports: People Ops → Compliance catalogue (`/people-ops/compliance`) and `GET /api/v1/compliance/evidence/status`.
