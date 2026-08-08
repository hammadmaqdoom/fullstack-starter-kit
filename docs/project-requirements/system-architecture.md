# Polaris — System Architecture

**Product:** Polaris  
**Status:** Approved for implementation  
**Last updated:** 26 June 2026  
**Companion to:** [prd.md](./prd.md) · [database-design.md](./database-design.md) · [api-specification.md](./api-specification.md) · [../compliance/iso-soc-framework.md](../compliance/iso-soc-framework.md)

---

## 1. Architecture overview

### 1.1 High-level architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Users (Browser / PWA)                            │
│     Employees (Entra SSO)  ·  Contractors (email auth)  ·  Admins       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Next.js 16 Frontend (PWA)                             │
│   App Router · Tailwind · React Hook Form · Better Auth client           │
│   Employee portal · Contractor portal · Admin surfaces                   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ REST / GraphQL
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NestJS 10 API (Fastify)                               │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ Core HR     │ │ Time & Leave │ │ Documents  │ │ E-Sign (bounded) │  │
│  │ Talent      │ │ Attendance   │ │ Policies   │ │ PDF seal/audit   │  │
│  │ Payroll     │ │ Operations   │ │ Templates  │ └──────────────────┘  │
│  └─────────────┘ └──────────────┘ └────────────┘                         │
│  Auth (Better Auth) · RBAC guards · Audit interceptor · Country rules    │
└───────┬─────────────────┬──────────────────┬────────────────────────────┘
        │                 │                  │
        ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌────────────────────────────────────┐
│ PostgreSQL   │  │ Redis        │  │ Azure Blob Storage                  │
│ (TypeORM)    │  │ Cache/Queue  │  │ Documents · signed PDFs · exports   │
└──────────────┘  └──────┬───────┘  └────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ BullMQ Worker│
                  │ FX fetch     │
                  │ Alerts       │
                  │ PDF sealing  │
                  │ Entra sync   │
                  └──────────────┘

External integrations:
  Microsoft Entra ID (OIDC) · M365/Teams (notifications) · Frankfurter FX API
  RFC 3161 TSA (timestamps) · Azure Key Vault (signing cert)
```

### 1.2 Architecture style

**Modular monolith** — single deployable API with bounded contexts as NestJS modules. Chosen because:

- Digitaro workforce is small (~tens to low hundreds); operational simplicity beats microservice overhead
- Strong transactional consistency needed for payroll, leave balances, and e-sign audit
- Country-configuration layer shared across modules
- Future multi-tenant productization via `tenant_id` seams without service split

### 1.3 Design principles

| Principle | Implementation |
|---|---|
| Country as first-class dimension | `CountryConfig`, `EmploymentTypeCountryConfig` resolve rules — no hard-coded PK/UAE/SG branches |
| Specification-driven | `docs/` is source of truth; code follows [prd.md](./prd.md) and [compliance/feature-flows.md](../compliance/feature-flows.md) |
| Compliance by design | Append-only audit tables; RBAC + row-level scope on every query |
| Dual auth paths | Employees via Entra OIDC; contractors via Better Auth email credentials |
| Offline-tolerant employee flows | PWA service worker queues check-in and draft requests |
| Tenant-shaped seams | `tenant_id` on core tables (single tenant = Digitaro for v1) |

---

## 2. Technology stack

### 2.1 Frontend (Next.js 16)

| Concern | Choice |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4, design tokens from [ux-design-specs.md](../design-specs/ux-design-specs.md) |
| Forms | React Hook Form + Zod |
| Auth client | Better Auth + Entra OIDC plugin |
| i18n | next-intl (English only v1; infrastructure ready) |
| PWA | Service worker, offline queue, push notifications |
| Testing | Vitest (unit), Playwright (e2e) |
| Analytics | PostHog |
| Error tracking | Sentry |

**Layout strategy:** Responsive PWA — bottom tab bar (mobile), persistent sidebar (desktop). Admin surfaces desktop-optimised; employee flows parity on all viewports. See UX spec §2.9, §4, §9.

### 2.2 Backend (NestJS 10)

| Concern | Choice |
|---|---|
| Framework | NestJS 10, Fastify adapter |
| ORM | TypeORM + migrations |
| Auth | Better Auth (NestJS integration) + Entra OIDC |
| API | REST (primary) + GraphQL (where starter kit provides) |
| Validation | class-validator / Zod DTOs |
| Background jobs | BullMQ worker process |
| Email | React Email templates + M365 SMTP |
| File storage | AWS S3 SDK → Azure Blob in production |
| PDF generation | Open-source library (QuestPDF-equivalent Node stack or pdf-lib + templates) |
| PDF signing | PDF signing with org cert from Key Vault |
| API docs | Swagger/OpenAPI auto-generated |

### 2.3 Data & infrastructure

| Concern | Choice |
|---|---|
| Database | PostgreSQL on shared VPS (via digitaro-platform) |
| Cache | Redis on shared VPS |
| Blob | Azure Blob Storage |
| Secrets | Azure Key Vault + per-app env on VPS |
| Hosting | Shared VPS (8 GB) — [ADR-0001](../adr/0001-multi-repo-platform-deployment.md) |
| Region | Single Azure region for all countries (PK/UAE/SG workforce) |
| CI/CD | GitHub Actions |
| Monitoring | Application Insights, Prometheus/Grafana (starter kit) |

---

## 3. Bounded contexts (NestJS modules)

```
backend/src/
├── modules/
│   ├── core-hr/           # Worker, org, employment types, profile changes
│   ├── country-config/    # Country rules, currencies, FX, holidays
│   ├── time-leave/        # Leave, calendars, attendance, shifts
│   ├── talent/            # Onboarding, separation, recruitment, performance, training
│   ├── documents/         # Policies, templates, generated documents
│   ├── esign/             # Envelopes, signing sessions, audit, PDF sealing
│   ├── operations/        # Expenses, travel, help desk, contractor invoices
│   ├── payroll/           # Pay runs, benefits, statutory rates, export packs
│   ├── automation/        # Alerts, scheduled reports, manpower
│   └── compliance/        # Audit log queries, evidence exports
├── auth/                  # Better Auth, Entra, RBAC guards
├── shared/                # Mail, cache, storage, queue
└── worker/                # BullMQ processors
```

Each module owns its entities, services, controllers, and DTOs. Cross-module communication via domain events or shared read services — no circular imports.

---

## 4. Authentication & authorization

### 4.1 Dual authentication paths

```
Employees                          Contractors
    │                                   │
    ▼                                   ▼
Entra ID OIDC                    Better Auth
(MFA via Entra)                  email + password
    │                            or magic link
    ▼                                   │
Better Auth session ◄───────────────────┘
    │
    ▼
Polaris RBAC + row-level scope
```

- **Employees:** "Sign in with Microsoft" → Entra OIDC → Better Auth session. `entra_object_id` stored on worker profile.
- **Contractors:** Email login independent of Entra. `entra_status: not_required` by default.
- **E-sign:** Employees sign via authenticated session; contractors via email-verified signing token.

### 4.2 Authorization model

| Layer | Mechanism |
|---|---|
| Role-based | Roles from PRD §5: Employee, Contractor, Manager, Finance, People Ops, IT Admin, Division Head, Super Admin |
| Row-level scope | own / team / division / all — enforced in repository layer |
| Field-level redaction | Compensation, bank details, exit interviews, disciplinary — DTO serializers |
| Segregation of duties | Finance cannot approve own expenses; dual-control option on pay runs — see [iso-soc-framework.md](../compliance/iso-soc-framework.md) §3.5 |

### 4.3 Session & security controls

- TLS 1.2+ everywhere; HSTS in production
- HTTP-only secure cookies for sessions
- Rate limiting on auth endpoints (NestJS throttler + Redis)
- CSRF protection on state-changing routes
- Secrets in Key Vault — never in code or `.env` committed to git
- Append-only `audit_log` and `esign_audit_event` tables (no UPDATE/DELETE grants)

---

## 5. Country configuration layer

The country-configuration module is the architectural heart of Polaris. All jurisdiction-specific behaviour resolves through configuration tables, not code branches.

```
Worker.country_code
        │
        ▼
EmploymentTypeCountryConfig  ──► leave entitlements, check-in rules, payroll routing
CountryCurrencyConfig        ──► default currency, allowed currencies
HolidayCalendar            ──► public holidays per country
StatutoryRateSchedule      ──► EOBI, CPF, etc. (effective-dated)
DocumentTemplate routing   ──► employment type × country → template set
```

**Seeded defaults:** PK, UAE, SG holiday calendars, leave-law starting points, statutory rate templates, benefit type catalogs, starter document packs — loaded via setup wizard (UX spec §7).

---

## 6. E-signature bounded context

Isolated `esign` module per PRD §6.13:

| Component | Responsibility |
|---|---|
| Envelope service | Lifecycle: draft → sent → in_progress → completed/voided |
| Signing session | PDF viewer, field completion, consent capture |
| Audit service | Append-only `ESignAuditEvent` (who, what, when, IP, user-agent) |
| Sealing service | PAdES sealing + RFC 3161 timestamp via background job |
| Certificate service | Org X.509 cert from Key Vault |
| Manual path | Export PDF / print / upload signed copy — equal workflow |

---

## 7. Integration architecture

| System | Pattern | Direction |
|---|---|---|
| Microsoft Entra ID | OIDC + **Graph API provisioning** (create user, license, groups) + provisioning webhook | Bi-directional |
| Microsoft Graph API | Entra lifecycle, M365 licenses, group membership, Teams adaptive cards | Outbound |
| M365 / Teams | Outbound notifications (adaptive cards) | Outbound |
| Email (M365 SMTP) | React Email templates via queue | Outbound |
| Frankfurter FX API | BullMQ daily cron job | Outbound |
| RFC 3161 TSA | HTTP on PDF seal | Outbound |
| Azure Key Vault | SDK for signing cert + secrets | Internal |
| Xero | **No API** — Finance uses PDF/Excel export packs | — |

---

## 8. Background jobs (BullMQ)

| Job | Schedule | Module |
|---|---|---|
| FX rate fetch | Daily 06:00 UTC | country-config |
| Compliance alerts | Daily | automation |
| Birthday/anniversary | Daily per timezone | automation |
| E-sign reminders | Configurable | esign |
| PDF sealing | On envelope complete | esign |
| Entra provisioning | On offer accept; scheduled `start_date − N days` | core-hr |
| Entra deprovisioning | On separation LWD | core-hr |
| Pre-boarding invite email | On offer accept / packet create | talent |
| Pre-boarding merge | On start date cron | talent |
| Scheduled reports | Per subscription | automation |
| Report/async export | On demand | various |

---

## 9. Data architecture

- **PostgreSQL** single database, single schema (v1)
- **UUID** primary keys on all entities
- **Soft delete** on worker records with retention-policy awareness
- **Effective dating** on calendars, rates, role assignments, exchange rates
- **Append-only** audit and e-sign event tables
- **tenant_id** column on core tables (default Digitaro tenant)

Full entity list and ER diagrams: [database-design.md](./database-design.md).

---

## 10. Observability & operations

| Concern | Approach |
|---|---|
| Logging | Structured JSON → Application Insights |
| Metrics | Request latency, queue depth, FX job success, pay run duration |
| Health | `/health` liveness + DB/Redis connectivity |
| Alerts | FX fetch failure, pay run anomalies, backup failures |
| Backup | Daily automated backups, PITR, semi-annual restore test |
| Availability target | 99.5% (PRD §8) |
| RTO/RPO | Documented in ops runbook (4h RTO / 1h RPO target) |

---

## 11. Deployment architecture

> **Hosting decision:** Compute runs on a shared 8 GB VPS orchestrated by the `digitaro-platform` repo (multi-repo layout). See [ADR-0001](../adr/0001-multi-repo-platform-deployment.md). Azure Blob Storage and Key Vault remain for HRMS documents and e-sign certificates.

```
App repos (hrms, payment-service, new-website)
    │
    ▼ CI/CD per repo (GitHub Actions)
    ├── Build & test
    ├── Run migrations (app-specific)
    └── Push image → GHCR
            │
            ▼
digitaro-platform (nginx + Docker Compose on VPS)
    ├── hrms-api + hrms-worker + hrms-frontend
    ├── payment-service (internal only)
    ├── marketing (new-website)
    ├── Shared PostgreSQL (hrms / payments / website DBs)
    ├── Shared Redis
    └── nginx (TLS, routing, IP allowlists)

Hybrid Azure (HRMS only):
    ├── Blob Storage — documents, signed PDFs, exports
    └── Key Vault — e-sign signing certificate
```

Environments: `development` (local Docker), `staging` (optional second VPS or compose profile), `production` (VPS).

---

## 12. Security architecture (ISO 27001 alignment)

Maps to [iso-soc-framework.md](../compliance/iso-soc-framework.md) §3.3:

| Control | Implementation |
|---|---|
| A.5 Organisational | Policy acknowledgements; vendor register (Azure, FX API) |
| A.6 People | Onboarding/offboarding workflows; Entra provisioning |
| A.8 Technological | Entra SSO, RBAC, encryption, Key Vault, audit log, secure SDLC |
| Privacy (27701) | Field classification, retention (5 years), DSAR export API |
| SOC 2 evidence | Audit log, pay run chains, role history, e-sign events |

---

## 13. Performance & scalability

| Requirement | Target |
|---|---|
| Common page load | < 1.5s (PRD §8) |
| API p95 latency | < 200ms for CRUD |
| Concurrent users | ~200 (Digitaro internal scale) |
| Report generation | Async for large exports |
| Employee bundle | Lazy-load admin modules (UX §9.5) |

Horizontal scaling: API containers behind load balancer; worker scaled independently; PostgreSQL vertical scale sufficient for v1.

---

## 14. Architecture decisions log

| # | Decision | Rationale |
|---|---|---|
| 1 | NestJS + Next.js (starter kit) over .NET + Angular | Align with fullstack-starter-kit; Labs maintains TypeScript stack |
| 2 | Modular monolith | Small team, strong consistency, simpler ops |
| 3 | Single Azure region | PRD §13 decision #1; no per-country data residency split v1 |
| 4 | Better Auth + Entra OIDC | Starter kit integration; dual path for contractors |
| 5 | Country-config layer | Avoid jurisdiction branching throughout codebase |
| 6 | Isolated esign module | High complexity; independent testing and legal review |
| 7 | No Xero API | PRD §13 decision #8; export packs only |
| 8 | Frankfurter for FX | Free ECB rates; no API key |
| 9 | tenant_id seams | Future multi-tenant without rewrite |
| 10 | PWA only (no Capacitor) | UX spec §9.1; responsive web parity |

---

## 15. Related documents

- [prd.md](./prd.md) — §9 Integrations, §10 original stack notes (superseded by this doc for implementation stack)
- [api-specification.md](./api-specification.md) — REST contracts
- [database-design.md](./database-design.md) — full schema
- [../compliance/feature-flows.md](../compliance/feature-flows.md) — operational flows with controls
- [../design-specs/ux-design-specs.md](../design-specs/ux-design-specs.md) — frontend architecture (IA, PWA, responsive)
