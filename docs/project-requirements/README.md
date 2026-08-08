# Polaris — Project Requirements

**Product:** Polaris (Digitaro internal HR platform)  
**Status:** Complete — ready for implementation  
**Last updated:** 26 June 2026

---

## Documents in this folder

| Document | Purpose | Status |
|---|---|---|
| [product-brief.md](./product-brief.md) | Executive summary — what, why, who, metrics | ✅ Complete |
| [prd.md](./prd.md) | **Canonical PRD** — full functional requirements (v0.14) | ✅ Complete |
| [srs.md](./srs.md) | Structured Software Requirements Specification | ✅ Complete |
| [system-architecture.md](./system-architecture.md) | NestJS + Next.js technical architecture | ✅ Complete |
| [database-design.md](./database-design.md) | PostgreSQL schema, ERD, indexes, retention | ✅ Complete |
| [api-specification.md](./api-specification.md) | REST API contracts by module | ✅ Complete |
| [user-stories.md](./user-stories.md) | User stories with Given/When/Then criteria | ✅ Complete |
| [enterprise-readiness.md](./enterprise-readiness.md) | Scale path T1→T3 — UX patterns, technical seams, phased delivery | ✅ Complete |

---

## Reading order

### For product context
1. [product-brief.md](./product-brief.md) — 10 min read
2. [prd.md](./prd.md) — full detail as needed

### For engineering
1. [system-architecture.md](./system-architecture.md) — stack and module structure
2. [database-design.md](./database-design.md) — entities and relationships
3. [api-specification.md](./api-specification.md) — endpoints and contracts
4. [user-stories.md](./user-stories.md) — acceptance criteria for testing

### For compliance
1. [../compliance/iso-soc-framework.md](../compliance/iso-soc-framework.md)
2. [../compliance/feature-flows.md](../compliance/feature-flows.md)
3. [../compliance/tax-compliance-boundary.md](../compliance/tax-compliance-boundary.md)
4. Cross-reference PRD §6 with flow IDs

---

## Polaris-specific notes

### Stack adaptation

The original PRD (§10) referenced .NET 9 + Angular. Implementation uses the **fullstack-starter-kit** stack:

- **Backend:** NestJS 10 + TypeORM + PostgreSQL
- **Frontend:** Next.js 16 + Tailwind + Better Auth
- **Auth:** Better Auth + Entra OIDC (employees) + email auth (contractors)

[system-architecture.md](./system-architecture.md) is the authoritative technical document.

### Country-first design

Pakistan, UAE, and Singapore are first-class configuration dimensions — not code branches. See PRD §7 and `country-config` module in architecture doc.

### Compliance embedded

Every module implements controls from [feature-flows.md](../compliance/feature-flows.md). Evidence is produced in-system (audit logs, acknowledgements, sealed PDFs).

### Phased delivery

| Phase | Focus | Gate |
|---|---|---|
| 0 | Foundations, auth, worker records, **T1 enterprise seams** | Entra SSO + CRUD + audit + pagination |
| 1 | MVP daily employee flows + e-sign, **T1 UX scale** | Policy ack 100%, pre-boarding + day-1 onboarding E2E |
| 2 | Payroll, contractor portal, operations, **T2 governance** | Finance export packs + access review |
| 3 | Analytics, **T3 productization** | Tenant control plane / SOC 2 trigger |

Scale detail: [enterprise-readiness.md](./enterprise-readiness.md) · Build checklist: [../generated/tasks.md](../generated/tasks.md)

---

## What happens next

1. Open [../generated/tasks.md](../generated/tasks.md)
2. Begin Phase 0 infrastructure tasks
3. Use [../PROMPTS.md](../PROMPTS.md) for AI-assisted implementation
4. Verify each feature against [user-stories.md](./user-stories.md) acceptance criteria
