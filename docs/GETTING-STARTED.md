# Polaris — Getting Started with Documentation

**Product:** Polaris  
**Last updated:** 26 June 2026

This guide explains how to use the Polaris documentation system to build the HR platform systematically.

---

## Step 1: Understand the product (30 minutes)

Read in this order:

1. **[project-requirements/product-brief.md](./project-requirements/product-brief.md)** — What Polaris is, who it's for, success metrics
2. **[project-requirements/prd.md](./project-requirements/prd.md)** — Skim §1–5 (overview, scope, roles), then dive into §6 modules as needed
3. **[compliance/iso-soc-framework.md](./compliance/iso-soc-framework.md)** — How compliance is embedded

---

## Step 2: Understand the technical approach (45 minutes)

1. **[project-requirements/system-architecture.md](./project-requirements/system-architecture.md)** — NestJS + Next.js modular monolith
2. **[project-requirements/database-design.md](./project-requirements/database-design.md)** — PostgreSQL schema
3. **[project-requirements/api-specification.md](./project-requirements/api-specification.md)** — REST API modules

**Note:** The PRD §10 originally referenced .NET/Angular. Implementation uses the **fullstack-starter-kit** (NestJS/Next.js). The architecture doc is authoritative.

---

## Step 3: Understand the UX (30 minutes)

1. **[design-specs/ux-design-specs.md](./design-specs/ux-design-specs.md)** — Full UX spec
2. **[design-specs/design-system.md](./design-specs/design-system.md)** — Tokens and components summary

Key UX concepts to internalise:
- **The Hub** — unified inbox (not per-module request lists)
- **Status tracker** — on every workflow
- **One-tap check-in** — flagship friction-kill
- **Responsive parity** — employee flows work on phone and desktop

---

## Step 4: Start building (ongoing)

1. Open **[generated/tasks.md](./generated/tasks.md)**
2. Begin **Phase 0** tasks
3. For each feature, read the matching flow in **[compliance/feature-flows.md](./compliance/feature-flows.md)**
4. Verify against **[project-requirements/user-stories.md](./project-requirements/user-stories.md)** acceptance criteria
5. Use **[PROMPTS.md](./PROMPTS.md)** for AI-assisted implementation

---

## Phase overview

### Phase 0 — Foundations (~2–3 weeks)

**Goal:** Auth, worker records, country config, audit log.

| Deliverable | Doc reference |
|---|---|
| Entra SSO + contractor auth | Architecture §4, API §2 |
| Worker CRUD | PRD §6.1, Flow FLW-HR-001 |
| Country config seeded | PRD §7, DB §3.2 |
| Setup wizard | UX §7 |

**Gate:** Create a worker, sign in via Entra, see audit log entry.

### Phase 1 — MVP (~6–8 weeks)

**Goal:** Daily employee value — check-in, leave, Hub, policies, e-sign, onboarding.

| Deliverable | Doc reference |
|---|---|
| Check-in/check-out | PRD §6.6, UX §6.1.3, Flow FLW-TIME-003 |
| Leave management | PRD §6.5, Flow FLW-TIME-001 |
| Unified Hub | UX §5.1 |
| Policy acknowledgements | PRD §6.7, Flow FLW-DOC-001 |
| E-sign platform | PRD §6.13, Flow FLW-DOC-003 |
| Onboarding + separation | PRD §6.3–6.4, Flow FLW-TAL-002/003 |

**Gate:** Employee completes daily check-in, requests leave, signs a document, acknowledges policies. People Ops UAT sign-off.

### Phase 2 — Full operations (~8–10 weeks)

**Goal:** Payroll, contractor portal, expenses, talent modules.

| Deliverable | Doc reference |
|---|---|
| Pay runs + export packs | PRD §6.12, Flow FLW-PAY-001/002 |
| Contractor portal | PRD §6.20, UX §6.5 |
| Expenses, travel, help desk | PRD §6.9, 6.17, 6.18 |
| Recruitment, performance, training | PRD §6.14–6.16 |

**Gate:** Finance runs pay run, downloads export pack, contractor invoice paid end-to-end.

### Phase 3 — Strategic (backlog)

Advanced analytics, job board APIs, multi-tenant evaluation.

---

## Compliance workflow

Every feature implementation follows this pattern:

```
1. Read PRD §6.x module requirements
2. Read matching FLW-* flow in feature-flows.md
3. Implement API + UI with controls from flow steps
4. Verify evidence catalogue item in iso-soc-framework.md §6
5. Test against user story acceptance criteria
```

### Deferred compliance (not blocking Phase 1)

| Item | When | Doc |
|---|---|---|
| SOC 2 Type II assessment | Post–Phase 2 | [deferred-compliance-work.md](./compliance/deferred-compliance-work.md) §1 |
| DSAR formal runbook | Phase 2 | §2 |
| Quarterly access review | 90 days post–Phase 1 | §3 |
| Dark mode | Post–Phase 1 | §4 |

---

## Development environment

```bash
# From hrms/ root
./start-dev.sh

# Or separately:
cd backend && pnpm install && pnpm start:dev
cd frontend && pnpm install && pnpm dev
```

Environment variables: see `backend/.env.example` and `frontend/.env.example`.

---

## AI-assisted development

Use [PROMPTS.md](./PROMPTS.md) with these context files:

| Task type | Attach these docs |
|---|---|
| New API module | `api-specification.md`, `database-design.md`, relevant `feature-flows.md` section |
| New UI screen | `ux-design-specs.md`, `design-system.md`, relevant user story |
| Database migration | `database-design.md`, PRD §6 entity section |
| Compliance review | `iso-soc-framework.md`, `feature-flows.md` |

---

## Document maintenance

| When | Action |
|---|---|
| PRD changes | Update `prd.md` first, then sync `srs.md`, `user-stories.md`, `tasks.md` |
| New API endpoint | Update `api-specification.md` + regenerate OpenAPI |
| New entity | Update `database-design.md` + create TypeORM migration |
| UX decision | Update `ux-design-specs.md` §12 decisions log |
| Compliance change | Update `iso-soc-framework.md` and affected flows |

Original working drafts remain in `../local-docs/` for reference. **`docs/` is canonical.**

---

## Quick reference

| Question | Answer |
|---|---|
| What's the product name? | Polaris (HRMS acceptable in code namespaces) |
| What countries? | Pakistan, UAE, Singapore |
| What auth for employees? | Microsoft Entra SSO |
| What auth for contractors? | Polaris email login |
| Xero integration? | No API — PDF/Excel export only |
| E-sign approach? | Native platform + manual upload fallback |
| Data retention? | 5 years post-departure default |
| UI language? | English only v1 |

---

**Ready?** Open [generated/tasks.md](./generated/tasks.md) and start Phase 0.
