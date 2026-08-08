# AI Configuration Files — Polaris

## Primary (read these)

| File | Purpose |
|---|---|
| `../AGENTS.md` | Main guidelines |
| `../.cursorrules` | Cursor auto-rules |
| `../CLAUDE.md` | Claude quick ref |
| `START-HERE-AI-AGENTS.md` | 5-min entry point |
| `AI-QUICK-REFERENCE.md` | Cheat sheet |
| `../docs/AGENTS.md` | Specs + compliance |
| `../docs/PROMPTS.md` | Copy-paste implementation prompts |
| `../docs/generated/tasks.md` | Current phase checklist |
| `../docs/superpowers/plans/2026-07-03-polaris-build-plan.md` | Build plan |
| `../.cursor/README.md` | Subagents, skills, rules index |

## Cursor AI (`.cursor/`)

| Path | Purpose |
|---|---|
| `.cursor/agents/polaris-backend.md` | NestJS module implementation |
| `.cursor/agents/polaris-frontend.md` | Next.js / PrimeReact screens |
| `.cursor/agents/polaris-compliance-auditor.md` | FLW control review (read-only) |
| `.cursor/agents/polaris-verifier.md` | Tests + acceptance criteria |
| `.cursor/agents/polaris-explorer.md` | Spec/code search (read-only) |
| `.cursor/agents/polaris-db-reviewer.md` | Schema/migration review |
| `.cursor/agents/polaris-security.md` | Security audit (read-only) |
| `.cursor/skills/implement-polaris-feature/` | End-to-end feature workflow |
| `.cursor/skills/polaris-compliance-controls/` | FLW implementation |
| `.cursor/skills/polaris-backend-module/` | Module scaffold |
| `.cursor/skills/polaris-ui-screen/` | UI from specs |
| `.cursor/skills/polaris-phase-check/` | Phase scope gate |
| `.cursor/skills/polaris-audit-log/` | Audit log patterns |
| `.cursor/rules/*.mdc` | File-scoped rules (auto when editing) |

## Folder-specific

| File | When |
|---|---|
| `../backend/AGENTS.md` | NestJS, modules, TypeORM |
| `../frontend/AGENTS.md` | Next.js, PrimeReact, routes |

## By question

| Question | File |
|---|---|
| What is this project? | `START-HERE-AI-AGENTS.md` |
| What to build now? | `../docs/generated/tasks.md` |
| How to implement X? | `../docs/PROMPTS.md` |
| NestJS service pattern? | `../backend/AGENTS.md` |
| React component pattern? | `../frontend/AGENTS.md` |
| Compliance controls? | `../docs/compliance/feature-flows.md` |
| API shape? | `../docs/project-requirements/api-specification.md` |
| DB schema? | `../docs/project-requirements/database-design.md` |
| UI layout? | `../docs/design-specs/ui-specifications/` |

## Structure

```
AGENTS.md (root) ──extends──► backend/AGENTS.md
              ├──extends──► frontend/AGENTS.md
              └──extends──► docs/AGENTS.md

.cursor/ ──subagents/skills/rules──► Polaris implementation
.cursorrules ──points to──► AGENTS.md + START-HERE
PROMPTS.md ──implements──► tasks.md + build plan
```
