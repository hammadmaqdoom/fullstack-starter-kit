# Dual Auth + Dev Demo Role Testing — Design

**Date:** 2026-08-08  
**Status:** Approved for planning  
**Product:** Polaris (Digitaro HRMS)

## Problem

Polaris needs to support signing in with **email/password** and **Microsoft Entra** for any user. Entra is not configured yet, so role and workflow testing must work with manual accounts. Production should be set up with real users; a full **demo org** is for local/dev testing (process: do not run the demo seed on prod — no hard runtime block required).

## Goals

1. Dual auth always available: email/password for everyone; Microsoft when Entra env is configured; contractors also keep magic link.
2. Access determined by Polaris RBAC (`user_role_assignments`) + worker link — not by which login method was used.
3. Idempotent demo seed with one (or more) accounts per role, linked workers, org hierarchy, and enough sample workflow data to click through Phase 0/1 flows.
4. Written role-by-role smoke checklist and credential sheet for local testing.

## Non-goals

- Hard-blocking `seed:demo` in production code (ops discipline only).
- Full payroll runs, live Entra Graph provisioning, or production-grade e-sign envelopes in the demo pack.
- Changing production to Microsoft-only for employees.
- Multi-tenant productization.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Scope | Product dual-login **and** full demo org (Approach 1) |
| Who may use password | Anyone, all environments |
| Demo depth | Full demo org (roles + workers + sample workflows) |
| Prod vs demo | Same auth codepaths; demo data for local/dev only — do not run demo seed on prod |
| Demo seed gating | No hard production block |

---

## 1. Auth model

### Sign-in UX

- **Email/password** available for all users (employees, contractors, admins).
- **Microsoft** button visible when Entra `clientId` + `clientSecret` are configured; when not configured, hide the button or disable it with a clear “Microsoft sign-in is not configured” message (no dead click).
- **Contractors** retain magic link in addition to password.
- Post-login redirect uses existing shell `homePath` from `GET /api/v1/me/shell`.

### Identity linking

```
Better Auth user
  └── account(s): credential and/or microsoft (same email)
  └── user_role_assignments → Polaris roles + row scope
  └── optional worker profile (core-hr)
```

- Role and row scope come from RBAC assignments, not from the auth provider.
- Manual path: create user → set password (or invite) → assign role(s) → link worker.
- Microsoft path: Entra OIDC → find or create user by email → same role/worker linking.
- Prefer account linking by email when a user later adds Microsoft to an existing credential account (avoid duplicate users for the same email).

### Current baseline to extend

- Backend already enables `emailAndPassword` and conditionally registers Microsoft when Entra env is set (`better-auth.config.ts`).
- Sign-in UI today splits “employee = Microsoft” vs “contractor = email/magic”; it must be updated so employees (and all roles) can use password without Entra.

### Prod vs local

- Identical auth behaviour in all environments.
- Local difference is **data**: run demo seed. Production creates real people via People Ops / IT / Entra — do not load demo personas.

---

## 2. Demo accounts and org

### Command

- `pnpm seed:demo` (or equivalent package script) — **idempotent**, safe to re-run.
- Depends on existing seeds: tenant, roles, country-config, org structure, admin where needed.
- Document clearly: for local/dev; do not run on production.

### Credentials (dev reference)

| Field | Value |
|---|---|
| Shared password | `PolarisDemo!2026` |
| Email domain | `*.demo@digitaro.local` |

| Email | Role | Notes |
|---|---|---|
| `superadmin.demo@digitaro.local` | `super_admin` | Full access / setup |
| `peopleops.demo@digitaro.local` | `people_ops` | Workers, policies, onboarding |
| `hrbp.demo@digitaro.local` | `hrbp` | HRBP-scoped views |
| `itadmin.demo@digitaro.local` | `it_admin` | Access / Entra-related admin |
| `finance.demo@digitaro.local` | `finance` | Finance surfaces |
| `divhead.demo@digitaro.local` | `division_head` | Division scope |
| `manager.demo@digitaro.local` | `manager` | Team approvals |
| `employee.demo@digitaro.local` | `employee` | Reports to manager |
| `employee2.demo@digitaro.local` | `employee` | Second report |
| `contractor.demo@digitaro.local` | `contractor` | Contractor portal |

Each account: Better Auth user + credential account with hashed password + `user_role_assignment` + linked `worker` (contractor also has contractor profile fields as required).

### Org shape

- Digitaro tenant; reuse Labs / Studio (and legal entities) from existing org seed when present.
- Manager has `employee` and `employee2` as direct reports (`manager_relationships`).
- Division head above manager for division-scope tests.
- Workers use seeded country / employment-type config (PK/UAE/SG matrix) — no hard-coded country branches.

### Sample workflow data

Enough to exercise Phase 0/1 clicks:

- Leave balances + 1–2 leave requests pending for the manager.
- 1–2 Hub inbox items (mine / for-me as applicable).
- One published policy requiring acknowledgement.
- Minimal check-in / time data if those tables are already in use.

### Explicitly out of demo v1

- Full pay runs, remittance packs, live Entra provisioning jobs, production e-sign envelopes.
- Thin stubs may be added later as those modules mature.

### Dev reference doc

- Short `docs/superpowers/specs/` companion or `docs/` note listing emails, password, and the smoke checklist (dev only; no secrets beyond the well-known demo password).

---

## 3. Role-by-role test plan

### Local run order

1. Start Postgres/Redis, migrate, run foundation seeds, then `seed:demo`.
2. Sign in with each demo email + shared password.
3. Confirm landing route matches shell `homePath`.
4. Walk per-role smoke; record gaps as “bug” vs “not built yet”.

### Suggested persona order

1. `super_admin` — sanity, setup visibility  
2. `people_ops` — worker CRUD  
3. `employee` → `manager` — leave request then approve  
4. `contractor` — separate portal + magic link optional  
5. `finance`, `it_admin`, `hrbp`, `division_head` — nav + row scope  

### Per-role smoke

| Role | Land on | Must do | Must not |
|---|---|---|---|
| employee | `/employee/home` | Check-in, leave, Hub (mine), directory, Me, policy ack | Finance / People Ops admin; others’ sensitive fields |
| employee2 | `/employee/home` | Same; visible on manager team | Manager cockpit |
| manager | manager home / cockpit | Approve leave, team calendar, Hub for-me | People Ops CRUD unless also assigned |
| division_head | manager-style home | Broader division visibility than manager | Full People Ops unless assigned |
| people_ops | `/people-ops/dashboard` | Workers, policies, audit log, setup | SoD-blocked self-finance actions |
| hrbp | people-ops–adjacent | HRBP-scoped people views | Super-admin / IT-only |
| finance | `/finance/...` | Finance nav that exists | Unrestricted HR edit |
| it_admin | admin layout | Access/admin surfaces | Default manager of everyone |
| super_admin | admin / people-ops | Full access; workspace switch if multi-layout | — |
| contractor | `/contractor/...` | Documents / invoices / Me; password (+ magic link) | Staff check-in / employee leave |

### Cross-cutting (every role)

- Password sign-in works with Entra unset.
- Nav matches role (no locked ghost items).
- Direct URL cannot bypass row scope for restricted records.
- Required mutations append `audit_log`.
- Empty/error UI states do not hard-crash.

---

## 4. Implementation outline (for planning)

Ordered work after this spec is accepted:

1. **Sign-in UX** — email/password for all roles; Microsoft conditional; keep contractor magic link.
2. **Account linking** — ensure Microsoft login attaches to existing user by email when possible.
3. **Manual user path** — confirm create/invite + password set + role assign + worker link works for People Ops/IT (fix gaps only).
4. **Demo seed** — users, passwords, roles, workers, relationships, sample leave/Hub/policy data; idempotent; package script.
5. **Demo credentials + checklist doc** — emails, password, smoke table.
6. **Verification** — local run of seed + one pass of persona checklist.

## 5. Risks

| Risk | Mitigation |
|---|---|
| Demo seed accidentally run on prod | Document loudly; use `.demo@digitaro.local`; optional future env guard if ops wants it |
| Duplicate users when Entra is added later | Link Microsoft account to existing email user |
| Demo password in repo docs | Acceptable for local personas only; never reuse for real Digitaro accounts |
| Modules incomplete for some checklist rows | Mark “not built” vs fail; don’t block seed on missing optional tables |

## 6. Success criteria

- Without Entra env: every demo persona signs in with password and lands on the correct shell home.
- With Entra env: Microsoft button works; linking to an existing demo/real email does not create a second user.
- `seed:demo` re-run does not duplicate personas or break FKs.
- Operator can complete employee → manager leave approve and people_ops worker view using only demo accounts.
