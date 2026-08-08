# START HERE — AI Agents (Polaris)

**5-minute orientation.** You are building **Polaris**, not a generic starter kit.

## What Polaris is

Digitaro's internal HR platform for ~100–200 workers across Labs and Studio in **Pakistan, UAE, and Singapore**. Single system of record for profiles, leave, attendance, documents, e-sign, onboarding, and (later) payroll exports.

| Context | Name |
|---|---|
| Product (UI) | Polaris |
| Repo | `hrms` |
| Code namespace | `Digitaro.Hrms.*` / `polaris-*` modules |

## Stack (fixed — do not suggest alternatives)

- **Frontend:** Next.js 16 App Router, PrimeReact, Tailwind 4, Lucide, Better Auth client
- **Backend:** NestJS 10, TypeORM, PostgreSQL, Redis, BullMQ, Better Auth server
- **Auth:** Entra OIDC (employees) + email/magic-link (contractors)
- **Deploy:** `digitaro-platform` on shared VPS — see `docs/adr/0001-multi-repo-platform-deployment.md`

## Read next (15 min total)

| Order | File | Why |
|---|---|---|
| 1 | `AGENTS.md` (root) | Project rules + workflow |
| 2 | `docs/AGENTS.md` | Specs, compliance, phased delivery |
| 3 | `docs/generated/tasks.md` | What to build now |
| 4 | `backend/AGENTS.md` or `frontend/AGENTS.md` | Patterns for your area |
| 5 | `.cursor/README.md` | Project subagents, skills, rules |

**Implementing a feature?** Also read PRD §6.x, matching FLW-* in `docs/compliance/feature-flows.md`, and `docs/PROMPTS.md`. Use skill `implement-polaris-feature` or subagents `polaris-backend` / `polaris-frontend`.

## Current phase: Phase 0 (Foundations)

**Gate:** Entra SSO works; worker CRUD with audit log; PK/UAE/SG country config seeded.

Checklist: `docs/generated/tasks.md` § Phase 0  
Step-by-step plan: `docs/superpowers/plans/2026-07-03-polaris-build-plan.md`

Code not built yet: `backend/src/modules/` HR contexts (core-hr, country-config, compliance, etc.). Starter-kit CMS/user modules exist — **new HR work goes in `modules/`**.

## Decision tree

```
Feature requested?
├─ In docs/project-requirements/? → Read PRD + FLW flow → implement
├─ In tasks.md current phase? → implement
├─ Phase 2+ while in Phase 0/1? → STOP, ask user
└─ Not documented? → ask user to spec first
```

## Never

- Implement without documented requirements
- Use NextAuth
- Hard-code PK/UAE/SG (`if (country === 'PK')`)
- Skip `audit_log` on mutations
- Build payroll/Xero API before Phase 2 gate
- Use non-Lucide icons
- Add or edit `ar.json` / `fr.json` — **English only** (`en.json`)
- Implement from `local-docs/` (use `docs/`)

## Always

- Filter queries by `tenant_id`
- Enforce RBAC + row scope server-side
- Redact compensation/bank/exit-interview fields by role
- Add status tracker on workflow UIs
- Use country config tables for jurisdiction rules
- Write tests for new behaviour
- Put all UI strings in `frontend/src/locales/en.json` (English only)

## Quick commands

```bash
./start-dev.sh                    # full stack
cd backend && pnpm docker:dev:up  # postgres + redis
cd backend && pnpm migration:up   # run migrations
cd backend && pnpm test           # backend tests
cd frontend && pnpm check:types   # frontend types
```

## Where things live

```
docs/project-requirements/   PRD, API spec, DB design
docs/compliance/             FLW-* flows, ISO/SOC mapping
docs/design-specs/           UX, wireframes, ui-specifications/
docs/generated/tasks.md      phased checklist
backend/src/modules/         HR bounded contexts (create here)
frontend/src/app/[locale]/(auth)/   authenticated app routes
```

## Help

| Issue | Check |
|---|---|
| What to build | `docs/generated/tasks.md` |
| How a feature should behave | `docs/project-requirements/prd.md` |
| Security/compliance controls | `docs/compliance/feature-flows.md` |
| API shape | `docs/project-requirements/api-specification.md` |
| UI layout | `docs/design-specs/ui-specifications/` |
| Copy-paste prompts | `docs/PROMPTS.md` |
| Patterns | `AI-QUICK-REFERENCE.md` |
