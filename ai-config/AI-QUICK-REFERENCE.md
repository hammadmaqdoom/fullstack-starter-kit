# Polaris — AI Quick Reference

> Full rules: `AGENTS.md`. Specs: `docs/AGENTS.md`. Start: `START-HERE-AI-AGENTS.md`.

## Product

**Polaris** — Digitaro HRMS. ~100–200 workers. PK / UAE / SG. Phase 0 in progress.

## Critical rules

| # | Rule |
|---|---|
| 1 | Specs first — `docs/project-requirements/` + `docs/compliance/` |
| 2 | Phase-gated — `docs/generated/tasks.md` |
| 3 | Better Auth + Entra — NOT NextAuth |
| 4 | Country via config tables — no `if (country === 'PK')` |
| 5 | Every mutation → `audit_log` |
| 6 | RBAC + row scope server-side |
| 7 | Lucide icons only |
| 8 | PrimeReact for UI components |
| 9 | **English only** — `locales/en.json`; no ar/fr/RTL |

## Canonical docs (priority)

1. `docs/generated/tasks.md` — what to build now
2. `docs/project-requirements/prd.md` — features
3. `docs/compliance/feature-flows.md` — FLW-* controls
4. `docs/project-requirements/database-design.md` — schema
5. `docs/project-requirements/api-specification.md` — API
6. `docs/design-specs/ui-specifications/` — screens

## Bounded contexts → `backend/src/modules/`

| Module | Domain |
|---|---|
| `core-hr` | workers, org, profile changes |
| `country-config` | countries, employment types, FX |
| `compliance` | audit_log, RBAC, evidence |
| `time-leave` | leave, calendars, attendance |
| `documents` | policies, templates |
| `esign` | envelopes, signing (isolated) |
| `talent` | onboarding, separation, recruitment |
| `payroll` | pay runs, benefits (Phase 2) |
| `operations` | expenses, tickets, contractor invoices |

## API

- Base: `/api/v1/`
- Envelope: `{ data, meta, errors }`
- Auth: Entra (employees) / email (contractors)

## UX must-haves

- Hub = unified inbox
- Status tracker on workflows
- One-tap check-in
- 5 states: skeleton, empty, error, offline, success
- Responsive: 375 / 768 / 1280 px

## Exclusions

Xero API · native app · non-English UI · QES e-sign · remittance portals

## File naming

```
backend:  worker.controller.ts, worker.service.ts, worker.entity.ts, create-worker.dto.ts
frontend: page.tsx, WorkerList.tsx, workers.ts (api client)
docs:     kebab-case.md
```

## Commands

```bash
./start-dev.sh
cd backend && pnpm docker:dev:up && pnpm migration:up && pnpm test
cd frontend && pnpm dev && pnpm check:types
```

## Pre-code checklist

```
□ In current phase (tasks.md)?
□ PRD §6.x read?
□ FLW-* flow read?
□ Folder AGENTS.md read?
□ tenant_id + audit_log planned?
□ UI spec read (if frontend)?
```

## Common issues

| Issue | Fix |
|---|---|
| CORS | `CORS_ORIGIN` in backend `.env` |
| Auth | Redis up; Better Auth config both sides |
| DB | `pnpm docker:dev:up` |
| Wrong phase | Check `tasks.md` — don't build payroll in Phase 0 |

## Prompts

Copy-paste implementation prompts: `docs/PROMPTS.md`  
Build plan: `docs/superpowers/plans/2026-07-03-polaris-build-plan.md`

## Folder AGENTS.md

| Path | When |
|---|---|
| `backend/AGENTS.md` | NestJS, TypeORM, BullMQ |
| `frontend/AGENTS.md` | Next.js, PrimeReact, PWA |
| `docs/AGENTS.md` | Specs, compliance, phases |
