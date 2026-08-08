# AI Agent Configuration — Polaris

> **Start:** `ai-config/START-HERE-AI-AGENTS.md` (5 min) → this file → folder `AGENTS.md`

Guidelines for AI agents building **Polaris** (Digitaro internal HR platform).

---

## Project overview

Polaris replaces fragmented M365/Xero/spreadsheet HR for ~100–200 workers across **Labs** and **Studio** in **Pakistan, UAE, and Singapore**.

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, PrimeReact, Tailwind 4, Lucide, Better Auth client, PWA |
| Backend | NestJS 10 (Fastify), TypeORM, PostgreSQL, Redis, BullMQ |
| Auth | Entra OIDC (employees) + Better Auth email (contractors) |
| Storage | Azure Blob; secrets in Key Vault |
| Hosting | Shared VPS via `digitaro-platform` (ADR-0001) |

**Architecture:** Modular monolith — bounded contexts as NestJS modules under `backend/src/modules/`. See `docs/project-requirements/system-architecture.md`.

**Naming:** Product UI = **Polaris**. Repo = `hrms`. Code = `Digitaro.Hrms.*` or `polaris-*`.

**Cursor AI:** `.cursor/README.md` — project subagents (`polaris-backend`, `polaris-frontend`, …), skills (`implement-polaris-feature`, …), and file-scoped rules.

---

## Critical rules

### 1. Requirements-first (non-negotiable)

Before writing code:

1. `docs/generated/tasks.md` — current phase and gate
2. `docs/project-requirements/prd.md` §6.x — feature detail
3. `docs/compliance/feature-flows.md` — matching **FLW-*** controls
4. `docs/project-requirements/user-stories.md` — acceptance criteria
5. Design: `docs/design-specs/ui-specifications/` + wireframes

If requirements are missing, **stop and ask the user**.

### 2. Phased delivery

| Phase | Focus | Do not build yet |
|---|---|---|
| **0** (now) | Auth, audit, country config, worker CRUD, setup wizard | Leave, payroll, e-sign |
| **1** | Check-in, leave, Hub, policies, e-sign, onboarding | Payroll, contractor portal |
| **2** | Pay runs, contractor portal, expenses, talent | Multi-tenant productization |
| **3** | Analytics, backlog | — |

Plan: `docs/superpowers/plans/2026-07-03-polaris-build-plan.md`

### 3. Compliance on every feature

Pipeline: **Authenticate → Authorise (RBAC + row scope) → Validate → Persist with audit_log → Return scoped response**

- Append-only: `audit_log`, `esign_audit_events` — no UPDATE/DELETE
- `tenant_id` on all business tables
- Field redaction: compensation, bank details, exit interviews
- 5-year retention; soft-delete only

### 4. Country configuration

Never hard-code jurisdiction logic. Resolve via `countries`, `employment_type_country_configs`, `holiday_calendars`, `statutory_rate_schedules`.

```typescript
// ❌ Wrong
if (worker.countryCode === 'PK') { /* EOBI logic */ }

// ✅ Right
const rules = await this.countryConfigService.resolve(worker.employmentTypeId, worker.countryCode);
```

### 5. Authentication

- **Employees:** Entra OIDC → Better Auth session
- **Contractors:** Better Auth email/password or magic link
- **NOT NextAuth** — ever

### 6. API conventions

- Base: `/api/v1/`
- Envelope: `{ data, meta, errors }`
- Every mutation → `audit_log`
- Row scope enforced in repository layer, not client filters
- Spec: `docs/project-requirements/api-specification.md`

### 7. UX conventions (frontend)

Per `docs/design-specs/ux-design-specs.md`:

- **Hub** — unified inbox (not per-module lists)
- **Status tracker** — on every workflow
- **One-tap** — check-in, swipe approve
- **Five states** — loading (skeleton), empty, error, offline, success
- **Responsive parity** — employee flows at 375px, 768px, 1280px
- **PrimeReact** for data components; **Lucide** for icons only
- **English only** — all user-facing copy in English; add strings to `frontend/src/locales/en.json` only (do not edit `ar.json`, `fr.json`, or add RTL)

### 8. Explicit exclusions

Do not implement unless user explicitly requests and specs exist:

- Xero API (export packs only)
- Capacitor / native app wrapper (PWA only)
- Non-English UI locales (English v1 only — no Urdu, Arabic, French, RTL)
- QES e-signatures
- Statutory remittance portals
- WhatsApp Business API

---

## Folder-specific rules

| Working in | Read |
|---|---|
| `backend/` | `backend/AGENTS.md` |
| `frontend/` | `frontend/AGENTS.md` |
| `docs/` | `docs/AGENTS.md` |

---

## Project structure

```
hrms/
├── docs/                          # CANONICAL specs (start here)
│   ├── project-requirements/      # PRD, API, DB design
│   ├── compliance/                # FLW-* flows
│   ├── design-specs/              # UX, wireframes, ui-specs
│   ├── generated/tasks.md         # phased checklist
│   └── superpowers/plans/         # implementation plans
├── backend/src/
│   ├── modules/                   # HR bounded contexts (create here)
│   ├── auth/                      # Better Auth + Entra + RBAC
│   ├── api/                       # legacy starter-kit modules
│   └── worker/                    # BullMQ processors
├── frontend/src/
│   ├── app/[locale]/(auth)/       # authenticated app
│   └── components/                # shared + feature components
└── ai-config/                     # agent quick-start docs
```

---

## Implementation workflow

```
1. tasks.md          → confirm phase + unchecked item
2. prd.md §6.x       → functional requirements
3. feature-flows.md  → FLW-* controls + evidence
4. database-design   → entities + migration
5. api-specification → endpoints + DTOs
6. ui-specifications → screen layout (if frontend)
7. Implement         → backend first, then frontend
8. Test              → unit + e2e for public contract
9. Verify            → user story acceptance criteria
10. tasks.md         → check off item
```

Use `docs/PROMPTS.md` for copy-paste prompts per feature type.

---

## Backend module pattern (Polaris)

New HR features go in `backend/src/modules/<context>/`:

```
modules/core-hr/
├── core-hr.module.ts
├── worker.controller.ts      # /api/v1/workers
├── worker.service.ts
├── dto/create-worker.dto.ts
├── entities/worker.entity.ts
└── __tests__/worker.service.spec.ts
```

Bounded contexts: `core-hr`, `country-config`, `time-leave`, `talent`, `documents`, `esign`, `operations`, `payroll`, `automation`, `compliance`.

---

## Frontend route pattern (Polaris)

Role-based routes under `app/[locale]/(auth)/`:

```
(auth)/employee/home/          # daily portal
(auth)/manager/cockpit/        # approvals
(auth)/people-ops/workers/     # HR admin
(auth)/finance/pay-runs/       # Phase 2
(auth)/hub/                    # unified inbox
```

Shell: `AuthenticatedShell` + `AppSidebar`. Reference: `docs/design-specs/ui-specifications/`.

---

## Code quality

- TypeScript strict — no `any`
- Backend: class-validator DTOs, Jest tests, Swagger decorators
- Frontend: Zod + React Hook Form, Vitest + Playwright
- Fix lint errors before commit
- Conventional Commits: `feat(core-hr): add worker CRUD with audit log`

---

## File naming

| Area | Convention |
|---|---|
| Backend controller | `*.controller.ts` |
| Backend service | `*.service.ts` |
| Backend entity | `*.entity.ts` |
| Backend DTO | `create-*.dto.ts` |
| Frontend page | `page.tsx` |
| Frontend component | `PascalCase.tsx` |
| Docs | `kebab-case.md` |

---

## Security

- Never commit `.env`
- Validate all inputs at trust boundaries
- Never log secrets, tokens, or PII
- HTTP-only session cookies
- CORS: `backend/.env` `CORS_ORIGIN`

---

## Common issues

| Problem | Fix |
|---|---|
| CORS | Match `CORS_ORIGIN` to frontend URL |
| Auth fails | Check Better Auth config both sides; Redis running |
| DB connection | `cd backend && pnpm docker:dev:up` |
| Migrations | `pnpm migration:up` — never edit old migrations |

---

## Key documentation

| Doc | Purpose |
|---|---|
| `docs/GETTING-STARTED.md` | Doc system walkthrough |
| `docs/generated/TECHNICAL_DOCS.md` | One-page tech digest |
| `docs/PROMPTS.md` | AI implementation prompts |
| `INTEGRATION-GUIDE.md` | Frontend-backend auth |
| `ai-config/AI-QUICK-REFERENCE.md` | Cheat sheet |

---

## Pre-implementation checklist

- [ ] Feature in `docs/project-requirements/` and current `tasks.md` phase
- [ ] FLW-* flow identified in `feature-flows.md`
- [ ] Folder `AGENTS.md` read
- [ ] Entities match `database-design.md`
- [ ] API matches `api-specification.md`
- [ ] UI matches `ui-specifications/` (if frontend)
- [ ] `audit_log` on mutations planned
- [ ] RBAC + row scope planned
- [ ] Tests planned

---

**`docs/` is canonical.** `local-docs/` is archive only — never implement from it.
