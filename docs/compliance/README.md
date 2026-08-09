# Compliance documentation — Polaris

**Product:** Polaris (Digitaro HRMS)  
**Audience:** People Ops, IT Admin, Super Admin, auditors, engineers

## Purpose

Polaris is Digitaro’s **people-domain evidence plane**: HR lifecycle, policy acknowledgement, access reviews, training, DSAR, audit log, and e-sign evidence for ISO 9001 / ISO 30400-series / ISO 27001 / ISO 27701 / SOC 2 readiness, plus PDPA / PDPL / GDPR-principle overlays.

Polaris does **not** replace a full GRC platform for cloud CSPM, device/MDM, TPRM, or Trust Center. Buy or integrate a GRC tool when those domains are required; sync people evidence via `GET /api/v1/compliance/evidence/status`.

## Documents

| Doc | Contents |
|---|---|
| [iso-soc-framework.md](./iso-soc-framework.md) | Framework posture, domains, retention, **§6 evidence catalogue** (control codes) |
| [feature-flows.md](./feature-flows.md) | FLW-* control flows (auditable steps) |
| [deferred-compliance-work.md](./deferred-compliance-work.md) | SOC 2 Type II window, DSAR/access-review runbooks, cloud buy-later |
| [tax-compliance-boundary.md](./tax-compliance-boundary.md) | What Polaris calculates vs external statutory filing |

## Related product specs

- Design: `docs/superpowers/specs/2026-08-10-people-domain-evidence-layer-design.md`
- Plan: `docs/superpowers/plans/2026-08-10-people-domain-evidence-layer.md`
- PRD §8 privacy / auditability; SRS NFR-COMP / NFR-PRIV
