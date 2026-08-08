# Polaris — Product Brief

**Product name:** Polaris (Digitaro internal HR platform)  
**Document owner:** Hammad (Founder & CEO)  
**Status:** Approved for implementation  
**Last updated:** 26 June 2026  
**Audience:** Digitaro Labs engineering, People Ops, Finance, IT, founders

---

## Project Overview

### What are we building?

**Polaris** is Digitaro's internal HR platform — a responsive web application that becomes the single system of record for the workforce across two divisions (Labs and Studio) and three jurisdictions (Pakistan, UAE, Singapore).

Today, HR runs through Microsoft 365, Xero, manually maintained policy documents, and ad-hoc spreadsheets. Leave is tracked manually, onboarding is inconsistent, employee records live in multiple places, and there is no verifiable record of who has accepted which policy version.

Polaris operationalizes the existing ISO-aligned HR policy suite, automates People Ops workflows (onboarding, leave, attendance, document acknowledgement, offer/contract/NDA generation with native e-signatures), calculates payroll inputs with country-aware rules, and integrates with Microsoft Entra ID for employee identity. Finance exports pay runs and contractor batches as PDF/Excel for manual entry into Xero — no live Xero API.

### Why now?

Headcount is growing across divisions and jurisdictions. Cross-border statutory complexity (EOBI, CPF, visa obligations, multi-currency payroll) cannot be modelled in spreadsheets. People Ops admin time must drop while compliance evidence must improve for ISO 9001, ISO 30400-series, ISO 27001/27701, and future SOC 2 readiness.

### Secondary opportunity

A well-architected Polaris — including a native e-signature module — is a candidate for productization later. Multi-tenant HR with built-in signing tuned for cross-border SMEs (Pakistan/GCC/Singapore) is underserved. This build is scoped internal-first; architectural decisions must not preclude multi-tenancy.

---

## Target Audience

### Primary users

| Audience | Role in Polaris | Pain today |
|---|---|---|
| **Employees** | Self-service portal (check-in, leave, payslips, signing) | Fragmented tools, no status visibility |
| **Contractors** | Contractor portal (invoices, documents, signing) | Email-based invoicing, no payment tracker |
| **Managers** | Approvals, team calendar, live attendance | Manual leave/expense routing |
| **People Ops / HR** | Worker CRUD, onboarding, policies, templates, e-sign | Spreadsheet HR, unverifiable policy compliance |
| **Finance** | Pay runs, FX, statutory rates, export packs | Manual payroll collation before Xero |
| **IT Admin** | Entra provisioning, help desk, access | No single worker record |
| **Division Heads** | Division analytics, hiring approval, manpower | No headcount/attrition visibility |
| **Super Admin** | System config, roles, audit, signing cert | — |

### Technical audience

Digitaro Labs engineers building and maintaining the platform using the **fullstack-starter-kit** architecture (NestJS 10 + Next.js 16 + PostgreSQL + Better Auth).

---

## Goals & Success Metrics

| Goal | Metric | Target (6 months post-launch) |
|---|---|---|
| Single source of truth | % employees with complete profiles | 100% |
| Automate leave | % leave requests processed in-system | 100% |
| Faster onboarding | Median onboarding cycle time | < 2 business days |
| Policy compliance | % staff with current-version policy acknowledgements | 100% |
| Reduce People Ops admin | Hours/week on manual HR admin | −60% |
| Visa/permit risk | Visa/work-permit expiries missed | 0 |
| Self-service adoption | % routine queries resolved via self-service | > 70% |
| Daily check-in adoption | % working days with check-in recorded | > 95% |
| Document turnaround | Median hire decision → signed offer | < 1 business day |
| E-sign completion rate | % envelopes without manual PDF fallback | > 90% |
| Payroll accuracy | Pay runs requiring manual correction | < 5% |
| Payroll cycle time | Hours from period close → approved export | < 4 hours |

---

## Project Type & Scope

### Project type

**Fullstack SaaS (internal)** — NestJS API + Next.js PWA frontend + PostgreSQL + Azure hosting.

### In scope

- Core HR — employee/contractor records, org structure, employment types, skills, career history
- Self-service employee portal + contractor portal
- Talent — recruitment, onboarding, separation, performance, training, manpower planning
- Leave & absence (country-aware, comp-off, tenure tiers)
- Work calendar, holidays, attendance (check-in/out, shifts, rosters)
- Document & policy management with acknowledgements
- HR letters & contracts — template library, merge fields, native e-sign + manual upload path
- Operations — expenses, contractor invoices, travel, help desk
- Pay & benefits — payroll calculation, payslips, benefits, PDF/Excel export (no Xero API)
- Compliance tracking — visa, probation, statutory IDs
- Automation — alerts, birthdays, scheduled reports
- Currency management — multi-currency catalog, Frankfurter FX auto-fetch, overrides
- Identity — Entra SSO (employees), Polaris email auth (contractors)

### Out of scope (v1)

- Xero API / live accounting integration
- Statutory filing/remittance portals (EOBI, CPF, WPS)
- Multi-tenant productization (deferred; keep tenant-shaped seams)
- Third-party e-sign SaaS (DocuSign, Adobe Sign)
- QES / hardware token signing
- External LMS authoring, GDS travel booking
- Urdu/Arabic UI (English only at launch)
- Dark mode (deferred post–Phase 1)

---

## Key Features (by phase)

### Phase 0 — Foundations
Country config, currency catalog + FX job, worker records, org structure, Entra SSO, RBAC, directory, audit log.

### Phase 1 — MVP (daily-value core)
Self-service portal, profiles, leave, work calendar + check-in/out, shift rosters, policies, HR letters + e-sign, onboarding + separation, compliance alerts, reports, native e-signature.

### Phase 2 — Full operations & talent
FX management, expenses, contractor portal, travel, help desk, payroll + payslips + benefits + contractor batches + export packs, performance, recruitment, training, manpower planning.

### Phase 3 — Strategic
Advanced People analytics, job board APIs, multi-tenant productization evaluation.

---

## Compliance & governance

Polaris embeds Digitaro's ISO-aligned management system:

| Document | Location |
|---|---|
| ISO/SOC compliance framework | [../compliance/iso-soc-framework.md](../compliance/iso-soc-framework.md) |
| Feature flows (step-by-step, auditable) | [../compliance/feature-flows.md](../compliance/feature-flows.md) |
| Deferred compliance work (SOC 2, DSAR, access review) | [../compliance/deferred-compliance-work.md](../compliance/deferred-compliance-work.md) |

Every module maps to ISO clauses and SOC 2 TSC controls. Evidence is produced in-system (audit logs, acknowledgements, sealed PDFs, pay run approval chains).

---

## Technology direction

Implementation uses the **fullstack-starter-kit** stack (not the original .NET/Angular sketch in early PRD drafts):

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, PWA |
| Backend | NestJS 10, TypeScript, Fastify |
| Database | PostgreSQL + TypeORM |
| Auth | Better Auth + Microsoft Entra OIDC (employees); email/magic link (contractors) |
| Cache/Queue | Redis + BullMQ |
| Storage | Azure Blob (documents, signed PDFs) |
| Secrets | Azure Key Vault (signing certificate, API keys) |
| PDF | Open-source generation + signing (no commercial iText license) |
| FX | Frankfurter API (daily scheduled job) |
| Observability | Application Insights, Sentry, structured logging |

See [system-architecture.md](./system-architecture.md) for full technical design.

---

## Related documents

| Document | Purpose |
|---|---|
| [prd.md](./prd.md) | Canonical product requirements (full detail) |
| [srs.md](./srs.md) | Structured software requirements specification |
| [system-architecture.md](./system-architecture.md) | Technical architecture |
| [database-design.md](./database-design.md) | Data model and ER diagrams |
| [api-specification.md](./api-specification.md) | REST API contracts |
| [user-stories.md](./user-stories.md) | User stories with acceptance criteria |
| [../design-specs/ux-design-specs.md](../design-specs/ux-design-specs.md) | UX & design specification |
| [../generated/tasks.md](../generated/tasks.md) | Phased build checklist |

---

## Document control

| Version | Date | Changes |
|---|---|---|
| 1.0 | 26 Jun 2026 | Initial Polaris product brief from PRD v0.14 |
