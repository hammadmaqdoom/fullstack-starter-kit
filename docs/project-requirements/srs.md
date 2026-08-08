# Polaris — Software Requirements Specification (SRS)

**Product:** Polaris  
**Status:** Approved for implementation  
**Last updated:** 26 June 2026  
**Canonical detail:** [prd.md](./prd.md) (full functional requirements)

---

## 1. Introduction

### 1.1 Purpose

This SRS specifies software requirements for **Polaris**, Digitaro's internal HR platform. It is intended for:

- Developers implementing NestJS backend and Next.js frontend
- Designers implementing [ux-design-specs.md](../design-specs/ux-design-specs.md)
- QA validating against acceptance criteria in [user-stories.md](./user-stories.md)
- Auditors tracing controls via [compliance/feature-flows.md](../compliance/feature-flows.md)

### 1.2 Scope

**In scope:** All modules in PRD §4 — Core HR, Talent, Time & Leave, Documents & E-sign, Operations, Pay & Benefits, Automation, Currency, Reporting.

**Out of scope (v1):** Xero API, statutory remittance portals, multi-tenant SaaS, QES e-signatures, GDS travel booking, external LMS authoring, Urdu/Arabic UI.

### 1.3 Definitions

| Term | Definition |
|---|---|
| **Worker** | Any person in Polaris — employee or contractor |
| **FTE** | Full-time equivalent headcount measure |
| **Envelope** | E-signature container with signatories and fields |
| **Pay run** | Country-scoped payroll calculation batch |
| **Country config** | Jurisdiction-specific rules (PK, UAE, SG) |
| **Hub** | Unified inbox for requests and approvals (UX §5.1) |
| **Entra** | Microsoft Entra ID (Azure AD) |

### 1.4 References

- [product-brief.md](./product-brief.md)
- [prd.md](./prd.md) — canonical functional spec
- [system-architecture.md](./system-architecture.md)
- [database-design.md](./database-design.md)
- [api-specification.md](./api-specification.md)
- [../compliance/iso-soc-framework.md](../compliance/iso-soc-framework.md)
- [../compliance/feature-flows.md](../compliance/feature-flows.md)
- [../design-specs/ux-design-specs.md](../design-specs/ux-design-specs.md)

---

## 2. Overall description

### 2.1 Product perspective

Polaris is a standalone internal web application integrating with Microsoft Entra ID (employee SSO), M365/Teams (notifications), Frankfurter FX API (exchange rates), and Azure platform services. Finance uses export packs — not live accounting integration.

### 2.2 Product functions (summary)

| # | Function area | PRD | Phase |
|---|---|---|---|
| 1 | Core HR & worker records | §6.1, §6.1.1, §6.2 | 0–1 |
| 2 | Onboarding & separation | §6.3, §6.4 | 1 |
| 3 | Leave & absence | §6.5 | 1 |
| 4 | Work calendar, holidays, attendance | §6.6 | 1–2 |
| 5 | Document & policy management | §6.7 | 1 |
| 6 | HR letters & contract generation | §6.8 | 1 |
| 7 | Native e-signature platform | §6.13 | 1 |
| 8 | Expense management | §6.9 | 2 |
| 9 | Alerts & scheduled notifications | §6.10 | 1–2 |
| 10 | Reporting & scheduled reports | §6.11 | 1–2 |
| 11 | Payroll, benefits, finance export | §6.12 | 2 |
| 12 | Performance management | §6.14 | 2 |
| 13 | Recruitment | §6.15 | 2 |
| 14 | Training | §6.16 | 2 |
| 15 | Travel management | §6.17 | 2 |
| 16 | Help desk | §6.18 | 2 |
| 17 | Manpower planning | §6.19 | 2 |
| 18 | Contractor portal & invoicing | §6.20 | 2 |
| 19 | Currency & FX management | §6.21 | 0–2 |

Full requirement detail for each area is in [prd.md](./prd.md) §6.

### 2.3 User classes

See PRD §5 and UX spec §8.1 capability matrix. Roles are additive; access = role × row-level scope (own/team/division/all).

### 2.4 Operating environment

- **Client:** Modern browsers (Chrome, Safari, Edge, Firefox); PWA installable on iOS/Android
- **Server:** Azure (Container Apps / App Service), PostgreSQL, Redis, Blob Storage
- **Network:** HTTPS; single Azure region

### 2.5 Design constraints

- English-only UI at launch
- Responsive PWA — no native wrapper (Capacitor)
- ISO/SOC controls embedded per [feature-flows.md](../compliance/feature-flows.md)
- 5-year default retention post-departure
- No Xero API

---

## 3. Functional requirements

> **Note:** Full acceptance criteria and field-level detail are in [prd.md](./prd.md) §6. This section provides the structured SRS index.

### 3.1 Core HR (FR-HR)

| ID | Requirement | Priority |
|---|---|---|
| FR-HR-001 | System shall maintain a single worker profile for employees and contractors with employment-type-driven behaviour | Must |
| FR-HR-002 | System shall surface country-conditional statutory ID fields (PK/UAE/SG) and **passport + visa/work-pass records for AE/SG** (§6.1.2) | Must |
| FR-HR-003 | System shall support profile change requests with approval workflow | Must |
| FR-HR-004 | System shall maintain skills, career history, and document attachments per worker | Should |
| FR-HR-005 | System shall track Entra ID status (`not_required`, `pending`, `provisioned`, `disabled`) | Must |
| FR-HR-006 | System shall auto-generate org chart from manager relationships | Must |
| FR-HR-007 | System shall enforce employment-type × country entitlement matrix | Must |
| FR-HR-008 | System shall write immutable audit log on every field change | Must |

**Flow:** [FLW-HR-001](../compliance/feature-flows.md) through FLW-HR-003

### 3.2 Talent (FR-TAL)

| ID | Requirement | Priority |
|---|---|---|
| FR-TAL-001 | Two-phase onboarding: pre-boarding (§6.3.1) + day-1 activation (§6.3.2); templates per employment type, division, country | Must |
| FR-TAL-002 | Auto-generate onboarding documents from templates with e-sign tracking | Must |
| FR-TAL-003 | Multi-department separation clearance workflow | Must |
| FR-TAL-008 | Pre-boarding packet at personal email: consent, PII/payroll fields, **passport + previous visa/pass (AE/SG)**, auto-merge on start date (FLW-TAL-006) | Must |
| FR-TAL-009 | Entra / M365 auto-provisioning via Microsoft Graph API (FLW-SEC-006) | Must |
| FR-TAL-004 | Recruitment pipeline: requisition → candidate → offer → hire | Should |
| FR-TAL-005 | Performance review cycles with goals and appraisals | Should |
| FR-TAL-006 | Training catalog with assignments and completion tracking | Should |
| FR-TAL-007 | Manpower plans with FTE vs contractor capacity | Should |

### 3.3 Time & leave (FR-TIME)

| ID | Requirement | Priority |
|---|---|---|
| FR-TIME-001 | Country-aware leave types, accrual rules, carry-forward caps | Must |
| FR-TIME-002 | Leave request → manager approval with delegation | Must |
| FR-TIME-003 | Automated staff calendar from work-week, holidays, leave, attendance | Must |
| FR-TIME-004 | One-tap daily check-in/check-out with geolocation (non-blocking) | Must |
| FR-TIME-005 | Team calendar with live check-in status | Must |
| FR-TIME-006 | Shift rosters and assignments | Must |
| FR-TIME-007 | Comp-off credits and tenure-based entitlement tiers | Should |
| FR-TIME-008 | Punch correction requests with approval | Must |

### 3.4 Documents & e-sign (FR-DOC)

| ID | Requirement | Priority |
|---|---|---|
| FR-DOC-001 | Versioned policy distribution with acknowledgement tracking | Must |
| FR-DOC-002 | Rich-text document templates with merge fields and letterhead | Must |
| FR-DOC-003 | Document generation workflow with preview and e-sign routing | Must |
| FR-DOC-004 | Native e-signature: envelope lifecycle, field placement, consent | Must |
| FR-DOC-005 | PAdES sealing with RFC 3161 timestamps | Must |
| FR-DOC-006 | Append-only e-sign audit events | Must |
| FR-DOC-007 | Manual sign path: export PDF / print / upload signed copy | Must |

### 3.5 Operations (FR-OPS)

| ID | Requirement | Priority |
|---|---|---|
| FR-OPS-001 | Expense claims with policy limits and approval chain | Should |
| FR-OPS-002 | Contractor portal: email auth, invoice submission, payment tracker, remittance packs (§6.12.9) | Should |
| FR-PAY-006 | Employee payslip remittance documentation for cross-border salary (§6.12.9) | Should |
| FR-OPS-003 | Travel requests with approval and expense reconciliation | Should |
| FR-OPS-004 | Help desk tickets (HR/IT/Admin/Finance queues) with SLA | Should |

### 3.6 Pay & benefits (FR-PAY)

| ID | Requirement | Priority |
|---|---|---|
| FR-PAY-001 | Configurable benefit types with dynamic fields per country | Should |
| FR-PAY-002 | Pay run calculation with statutory deductions per country | Should |
| FR-PAY-003 | Payslip self-service (released on Finance approval) | Should |
| FR-PAY-004 | Contractor payment batch from approved invoices | Should |
| FR-PAY-005 | Cross-border remittance packs for **employee payroll and contractor** payments; corridor config; SWIFT/proof upload (§6.12.9) | Should |
| FR-PAY-005 | PDF/Excel export packs for manual Xero entry | Should |
| FR-PAY-006 | Versioned statutory rate schedules with effective dating | Should |
| FR-PAY-007 | Multi-currency catalog with daily Frankfurter FX fetch | Must |

### 3.7 Automation (FR-AUTO)

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTO-001 | Compliance alerts: visa expiry, probation end, statutory registration | Must |
| FR-AUTO-002 | People alerts: birthdays, work anniversaries | Must |
| FR-AUTO-003 | Custom alert rules with configurable conditions | Should |
| FR-AUTO-004 | Scheduled report delivery (email/in-app) | Should |

### 3.8 Cross-cutting UX requirements (FR-UX)

From [ux-design-specs.md](../design-specs/ux-design-specs.md):

| ID | Requirement | Priority |
|---|---|---|
| FR-UX-001 | Unified Hub inbox for all request types | Must |
| FR-UX-002 | Universal status tracker on every workflow | Must |
| FR-UX-003 | Notification discipline: digests, quiet hours, per-type channels | Must |
| FR-UX-004 | Timezone-aware timestamps and reminders | Must |
| FR-UX-005 | Guided setup wizard with PK/UAE/SG seeded defaults | Must |
| FR-UX-006 | Responsive parity: desktop, tablet, mobile for employee flows | Must |
| FR-UX-007 | Offline-tolerant check-in and draft requests (PWA) | Must |

---

## 4. Non-functional requirements

### 4.1 Security (NFR-SEC)

| ID | Requirement | Target |
|---|---|---|
| NFR-SEC-001 | Employee auth via Entra OIDC + MFA | Required |
| NFR-SEC-002 | Contractor auth via email/password or magic link, rate-limited | Required |
| NFR-SEC-003 | RBAC + row-level scope on all data access | Required |
| NFR-SEC-004 | Encryption at rest and in transit | Required |
| NFR-SEC-005 | Secrets in Azure Key Vault | Required |
| NFR-SEC-006 | Append-only audit log (no UPDATE/DELETE) | Required |
| NFR-SEC-007 | Field-level redaction for compensation, bank, exit data | Required |
| NFR-SEC-008 | Microsoft Graph provisioning via least-privilege app registration; all calls audit-logged | Required |

### 4.2 Privacy (NFR-PRIV)

| ID | Requirement | Target |
|---|---|---|
| NFR-PRIV-001 | GDPR, UAE PDPL, Singapore PDPA alignment | Required |
| NFR-PRIV-002 | 5-year retention default post-departure | Required |
| NFR-PRIV-003 | DSAR export capability (runbook deferred) | Phase 1 basic / Phase 2 full |
| NFR-PRIV-004 | Punch location classified restricted — manager/HR only | Required |
| NFR-PRIV-005 | Privacy by design: minimum necessary in reports | Required |

### 4.3 Performance (NFR-PERF)

| ID | Requirement | Target |
|---|---|---|
| NFR-PERF-001 | Common page load time | < 1.5s |
| NFR-PERF-002 | API p95 response (CRUD) | < 200ms |
| NFR-PERF-003 | First meaningful paint (PWA) | < 2s on 4G |
| NFR-PERF-004 | Interaction-to-response (optimistic UI) | < 100ms perceived |
| NFR-PERF-005 | Large reports | Async generation |

### 4.4 Availability & reliability (NFR-AVAIL)

| ID | Requirement | Target |
|---|---|---|
| NFR-AVAIL-001 | Uptime | 99.5% |
| NFR-AVAIL-002 | Daily automated backups with PITR | Required |
| NFR-AVAIL-003 | Documented RTO/RPO | 4h / 1h target |
| NFR-AVAIL-004 | Semi-annual backup restore test | Required |

### 4.5 Accessibility (NFR-A11Y)

| ID | Requirement | Target |
|---|---|---|
| NFR-A11Y-001 | WCAG 2.1 AA on core flows | Required |
| NFR-A11Y-002 | Minimum 44px touch targets on mobile | Required |
| NFR-A11Y-003 | 4.5:1 text contrast | Required |
| NFR-A11Y-004 | Status conveyed by label + icon, not colour alone | Required |
| NFR-A11Y-005 | Respect `prefers-reduced-motion` | Required |

### 4.6 Localization (NFR-L10N)

| ID | Requirement | Target |
|---|---|---|
| NFR-L10N-001 | English-only UI at launch | Required |
| NFR-L10N-002 | Currency symbols and decimal places per currency catalog | Required |
| NFR-L10N-003 | Date formats per country config | Required |

### 4.7 Compliance (NFR-COMP)

| ID | Requirement | Reference |
|---|---|---|
| NFR-COMP-001 | ISO 9001 process approach on all workflows | [feature-flows.md](../compliance/feature-flows.md) |
| NFR-COMP-002 | ISO 30400-series HR evidence | [iso-soc-framework.md](../compliance/iso-soc-framework.md) §3.2 |
| NFR-COMP-003 | ISO 27001/27701 security & privacy controls | Framework §3.3–3.4 |
| NFR-COMP-004 | SOC 2 TSC evidence production | Framework §3.5; deferred Type II audit |
| NFR-COMP-005 | Segregation of duties on financial workflows | Framework §3.5 SoD matrix |

---

## 5. External interface requirements

### 5.1 User interfaces

Specified in [ux-design-specs.md](../design-specs/ux-design-specs.md) — employee 5-tab nav, manager cockpit, admin sidebar, contractor 4-tab portal.

### 5.2 Software interfaces

| Interface | Protocol | Purpose |
|---|---|---|
| Entra ID | OIDC | Employee SSO |
| M365/Teams | REST/webhook | Notifications, adaptive cards |
| Frankfurter API | HTTPS REST | Daily FX rates |
| RFC 3161 TSA | HTTPS | PDF timestamping |
| Azure Key Vault | Azure SDK | Signing certificate, secrets |
| Azure Blob | Azure SDK | Document storage |

### 5.3 Communications interfaces

- Email via M365 SMTP (digests, alerts, e-sign notifications)
- In-app notifications + PWA push
- Teams adaptive cards for approvals and check-in nudges
- WhatsApp via `wa.me` deep links (user-initiated, not Business API)

---

## 6. Data requirements

See [database-design.md](./database-design.md). Key constraints:

- UUID primary keys
- `tenant_id` on core entities (single tenant v1)
- `country_code` dimension on worker and config tables
- Effective-dated records for rates, calendars, roles
- Append-only audit and e-sign event tables
- Soft-delete with retention policy on worker records

---

## 7. Cross-border requirements

Country is a core dimension. See PRD §7. Pakistan, UAE, and Singapore each have distinct statutory bodies, leave law, currencies, and work authorization fields. All resolved via country-configuration layer — not code branches.

---

## 8. Phased delivery

| Phase | Modules | Go-live criteria |
|---|---|---|
| **0** | Country config, currency, worker records, org, auth, RBAC, audit | Entra SSO works; worker CRUD; audit log |
| **1** | Leave, calendar, attendance, policies, templates, e-sign, onboarding, separation, alerts, reports | Employee daily flows; e-sign complete; policy ack 100% |
| **2** | Payroll, benefits, expenses, contractor portal, travel, help desk, talent modules | Finance export packs; contractor invoices end-to-end |
| **3** | Advanced analytics, job boards, multi-tenant evaluation | TBD |

Build checklist: [../generated/tasks.md](../generated/tasks.md)

---

## 9. Risks

See PRD §14. Top risks: e-sign legal defensibility, cross-border statutory complexity, payroll calculation errors, Phase 2 scope breadth. Mitigations documented in PRD and compliance framework.

---

## 10. Document control

| Version | Date | Changes |
|---|---|---|
| 1.0 | 26 Jun 2026 | Initial SRS from PRD v0.14, adapted to NestJS/Next.js stack |
