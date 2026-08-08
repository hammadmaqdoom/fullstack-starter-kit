# Claude — Polaris Quick Reference

> Full guidelines: `AGENTS.md`. Entry point: `ai-config/START-HERE-AI-AGENTS.md`.

## Product

**Polaris** — Digitaro internal HR platform (Labs + Studio, Pakistan/UAE/Singapore). Replaces M365/Xero/spreadsheet HR.

## Stack

Next.js 16 + PrimeReact + NestJS 10 + PostgreSQL + Better Auth + Entra OIDC + Azure Blob/Key Vault

## Non-negotiables

1. Specs first — `docs/project-requirements/`, `docs/compliance/`
2. Phase-gated — `docs/generated/tasks.md` (Phase 0 → 1 → 2)
3. Better Auth, not NextAuth
4. Country rules via config tables, never inline branches
5. Every mutation writes `audit_log`
6. Lucide icons only
7. **English only** for all UI — `locales/en.json` only; no ar/fr/RTL

## Read order (new feature)

1. `docs/generated/tasks.md`
2. `docs/project-requirements/prd.md` §6.x
3. `docs/compliance/feature-flows.md` (matching FLW-*)
4. `docs/project-requirements/user-stories.md`
5. `backend/AGENTS.md` or `frontend/AGENTS.md`
6. `docs/PROMPTS.md` — copy-paste implementation prompts

## Current build focus

Phase 0: module scaffold, audit_log, RBAC, Entra auth, country config, worker CRUD, setup wizard.

Plan: `docs/superpowers/plans/2026-07-03-polaris-build-plan.md`
