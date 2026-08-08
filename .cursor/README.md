# Polaris — Cursor AI Configuration

Project-specific agents, skills, and rules for **Polaris** (Digitaro HRMS).

## Quick start

1. Read `ai-config/START-HERE-AI-AGENTS.md` (5 min)
2. Read root `AGENTS.md` + folder `AGENTS.md` for your area
3. Check `docs/generated/tasks.md` for current phase
4. Use skills and subagents below for implementation work

## Layout

```
.cursor/
├── agents/          # Custom subagents (delegate via Task tool or @mention)
├── skills/          # Repeatable workflows (auto-discovered by Agent)
├── rules/           # File-scoped rules (apply when matching files are open)
└── README.md        # This file
```

## Subagents (`.cursor/agents/`)

| Agent | Use when |
|---|---|
| `polaris-backend` | NestJS modules, entities, migrations, API, audit log |
| `polaris-frontend` | Next.js screens, PrimeReact, PWA, role-based UI |
| `polaris-compliance-auditor` | Review FLW-* controls before merge (read-only) |
| `polaris-verifier` | Run tests, verify acceptance criteria |
| `polaris-explorer` | Find specs, flows, and existing patterns (read-only) |
| `polaris-db-reviewer` | Review schema/migrations against database-design.md |
| `polaris-security` | Auth, RBAC, PII, audit security review (read-only) |

Invoke: ask Agent to use a subagent by name, or `/polaris-backend` style commands.

## Skills (`.cursor/skills/`)

| Skill | Triggers on |
|---|---|
| `implement-polaris-feature` | End-to-end feature from PRD → code |
| `polaris-compliance-controls` | FLW-* flow implementation |
| `polaris-backend-module` | New NestJS bounded-context module |
| `polaris-ui-screen` | Screen from ui-specifications + wireframes |
| `polaris-phase-check` | Phase gate / tasks.md scope check |
| `polaris-audit-log` | Mutations requiring audit_log |

## Rules (`.cursor/rules/`)

| Rule | Scope |
|---|---|
| `polaris-backend.mdc` | `backend/**` |
| `polaris-frontend.mdc` | `frontend/**` |
| `polaris-compliance.mdc` | Compliance-sensitive backend paths |
| `polaris-migrations.mdc` | Database migrations |

Root `.cursorrules` always applies Polaris-wide constraints.

## Canonical docs (implement from these)

| Priority | Path |
|---|---|
| 1 | `docs/generated/tasks.md` |
| 2 | `docs/project-requirements/prd.md` |
| 3 | `docs/compliance/feature-flows.md` |
| 4 | `docs/project-requirements/api-specification.md` |
| 5 | `docs/project-requirements/database-design.md` |
| 6 | `docs/design-specs/ux-design-specs.md` |
| 7 | `docs/superpowers/plans/2026-07-03-polaris-build-plan.md` |

`local-docs/` is archive only — never implement from it.
