# Generated Documentation

**Product:** Polaris  
**Last updated:** 26 June 2026

This folder contains build artefacts derived from the specification documents.

---

## Current artefacts

| File | Description | Status |
|---|---|---|
| [tasks.md](./tasks.md) | Phased implementation checklist (Phase 0–3) | ✅ Ready |
| [TECHNICAL_DOCS.md](./TECHNICAL_DOCS.md) | Consolidated technical reference (stack, contexts, conventions, frontend) | 🔄 Spec-derived digest |
| [DATABASE_SCHEMA.sql](./DATABASE_SCHEMA.sql) | PostgreSQL DDL (all tables, enums, indexes, RLS notes) | 🔄 Spec-derived draft |
| [API_CONTRACTS.yaml](./API_CONTRACTS.yaml) | OpenAPI 3.1 (all modules/paths, envelope, error schema) | 🔄 Spec-derived draft |

> 🔄 = **spec-derived draft**, hand-authored from the canonical specs so the artefact is usable now. **Regenerate from code at Phase 0** (DDL ← TypeORM migrations; YAML ← NestJS Swagger) and treat the generated output as authoritative thereafter. The source specs remain canonical: [database-design.md](../project-requirements/database-design.md), [api-specification.md](../project-requirements/api-specification.md).

---

## Source → artefact mapping

| Artefact | Derived from | Regenerate via |
|---|---|---|
| `DATABASE_SCHEMA.sql` | [database-design.md](../project-requirements/database-design.md) | TypeORM migrations (`backend/src/database/migrations/`) |
| `API_CONTRACTS.yaml` | [api-specification.md](../project-requirements/api-specification.md) | NestJS Swagger → `backend/dist/openapi.yaml` |
| `TECHNICAL_DOCS.md` | all specs | keep in sync as code lands |

Use [../PROMPTS.md](../PROMPTS.md) prompts to regenerate these during implementation.

---

## How to use tasks.md

1. Work phase by phase — do not skip gates
2. Check items as completed in PRs
3. Phase go-live gates must pass before next phase starts
4. Cross-reference [../compliance/feature-flows.md](../compliance/feature-flows.md) for each feature task

---

## Related documents

- [../project-requirements/](../project-requirements/) — source specifications
- [../generated/tasks.md](./tasks.md) — start here for implementation
