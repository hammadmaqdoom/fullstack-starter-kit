# Deferred compliance work

Carry-forward checklists for Digitaro compliance programmes that Polaris supports but do not complete alone.

## 1. SOC 2 Type II readiness

- Start evidence observation **6–12 months** before external audit engagement.  
- In Polaris: set `compliance_programme.evidence_window_start` (Super Admin → Compliance programme).  
- Rely on daily people-domain control tests (`control_test_runs` where `ran_at >= evidence_window_start`).  
- Cloud / device / vuln evidence: **buy GRC or use Azure/Intune tooling** — not in Polaris Wave 1.  
- Keep auditor export packs: `GET /api/v1/compliance/evidence/export`.

## 2. DSAR runbook

- Operational owner: People Ops.  
- Tooling: `POST /api/v1/compliance/dsar/export` (basic package).  
- Still required outside Polaris: legal review, redaction decisions, deletion fulfilment workflow, processor notifications.  
- Control: `PRIV-DSAR-EXPORT` (adapter may be `manual` until regular export cadence exists).

## 3. Access review ops

- Cadence: quarterly.  
- Tooling: access review cycles + CSV evidence.  
- Control: `ACC-REVIEW-QUARTERLY`.  
- Expand app inventory beyond Polaris RBAC via Entra / GRC later.

## 4. Other deferred (from product backlog)

- Dark mode (UX) — not a security control.  
- Full privacy ROPA/DPIA product — use ISO 27701 process + GRC/privacy tool if needed.  
- Risk register product UI — deferred; optional notes on controls only if added later.

## 5. Evidence window checklist

1. Name audit target date and frameworks on programme row.  
2. Set `evidence_window_start`.  
3. Confirm daily adapter job healthy (Hub clear or owned failures).  
4. Freeze policy/training mandatory sets for the period where required.  
5. Export packs at period end; retain with audit workpapers.
