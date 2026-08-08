# AI Agent Configuration — Polaris Documentation

**Product:** Polaris (Digitaro internal HR platform)  
**Last updated:** 3 July 2026

Guidelines for AI agents implementing Polaris from the `docs/` specification system.

---

## Project context

Polaris is Digitaro's internal HR platform for ~100–200 workers across Labs and Studio in Pakistan, UAE, and Singapore. It replaces fragmented M365/Xero/spreadsheet HR with a single system of record.

**Stack:** NestJS 10 + Next.js 16 + PostgreSQL + Better Auth + Azure  
**Not:** .NET/Angular (original PRD sketch — superseded by fullstack-starter-kit)

---

## Canonical documents (read before implementing)

| Priority | Document | When |
|---|---|---|
| 1 | [project-requirements/prd.md](./project-requirements/prd.md) | Any feature — full functional detail |
| 2 | [compliance/feature-flows.md](./compliance/feature-flows.md) | Any feature — controls & evidence |
| 3 | [project-requirements/api-specification.md](./project-requirements/api-specification.md) | API endpoints |
| 4 | [project-requirements/database-design.md](./project-requirements/database-design.md) | Entities & migrations |
| 5 | [design-specs/ux-design-specs.md](./design-specs/ux-design-specs.md) | UI screens & interactions |
| 6 | [project-requirements/user-stories.md](./project-requirements/user-stories.md) | Acceptance criteria |
| 7 | [generated/tasks.md](./generated/tasks.md) | Current phase tasks |
| 8 | [superpowers/plans/2026-07-03-polaris-build-plan.md](./superpowers/plans/2026-07-03-polaris-build-plan.md) | Step-by-step build plan |
| 9 | [PROMPTS.md](./PROMPTS.md) | Copy-paste AI implementation prompts |

---

## Implementation rules

### Architecture
- **Modular monolith** — bounded contexts as NestJS modules (see [system-architecture.md](./project-requirements/system-architecture.md))
- **Country-config layer** — never hard-code PK/UAE/SG logic; use configuration tables
- **Dual auth** — Entra OIDC for employees; Better Auth email for contractors
- **tenant_id** on core tables (single tenant v1)

### Compliance (mandatory on every feature)
1. Authenticate → Authorise (RBAC + row scope) → Validate → Persist with audit log
2. Implement controls from the matching **FLW-*** flow in [feature-flows.md](./compliance/feature-flows.md)
3. Append-only tables (`audit_log`, `esign_audit_event`) — no UPDATE/DELETE
4. Field redaction for compensation, bank details, exit interviews
5. 5-year retention default post-departure

### UX (mandatory on every screen)
1. **Status tracker** on every request-bearing workflow
2. **Hub** as unified inbox — not per-module request lists
3. **Responsive parity** — employee flows at 375px, 768px, 1280px
4. **One-tap** for daily actions (check-in, approve via swipe)
5. Five states: loading (skeleton), empty, error, offline, success
6. **English only** — all UI copy in English; `frontend/src/locales/en.json` only (do not edit `ar.json`/`fr.json`; no RTL)

### API conventions
- Base path: `/api/v1/`
- Response envelope: `{ data, meta, errors }`
- Row-level scope enforced server-side
- Every mutation writes `audit_log`
- See [api-specification.md](./project-requirements/api-specification.md)

### Explicit exclusions (do not implement)
- Xero API integration (export packs only)
- Capacitor / native wrapper (PWA only)
- Non-English UI locales (English v1 only)
- WhatsApp Business API (`wa.me` links only)
- QES e-signatures
- Statutory remittance portals

---

## Phased delivery

Work **phase by phase** per [tasks.md](./generated/tasks.md). Do not implement Phase 2 modules during Phase 0/1 unless explicitly requested.

| Phase | Focus |
|---|---|
| 0 | Auth, worker records, country config, audit |
| 1 | Check-in, leave, Hub, policies, e-sign, **pre-boarding**, day-1 onboarding, **Entra Graph provisioning** |
| 2 | Payroll, contractor portal, expenses, talent |
| 3 | Analytics, productization (backlog) |

---

## AI workflow

1. Check [tasks.md](./generated/tasks.md) for current phase
2. Read PRD §6.x for the module
3. Read FLW-* flow for controls (**FLW-TAL-006**, **FLW-SEC-006** for hire path)
4. Read user story acceptance criteria
5. Implement backend module + migration + API + frontend screen
6. Verify against acceptance criteria
7. Use [PROMPTS.md](./PROMPTS.md) for structured AI prompts

---

## Key naming

| Context | Name |
|---|---|
| Product (user-facing) | Polaris |
| Code namespace | `Digitaro.Hrms.*` or `polaris-*` modules |
| Category label | HRMS (industry comparisons) |

---

## Local docs archive

`../local-docs/` contains original working drafts. **`docs/` is canonical** — always implement from `docs/`, not `local-docs/`.
