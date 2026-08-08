# Polaris — Documentation System

**Product:** Polaris (Digitaro internal HR platform)  
**Last updated:** 26 June 2026

This folder is the **specification-driven development system** for Polaris. All implementation in `backend/` and `frontend/` follows these documents.

---

## Quick navigation

| I want to… | Go to |
|---|---|
| Understand what we're building | [project-requirements/product-brief.md](./project-requirements/product-brief.md) |
| Read full functional requirements | [project-requirements/prd.md](./project-requirements/prd.md) |
| See structured SRS | [project-requirements/srs.md](./project-requirements/srs.md) |
| Understand technical architecture | [project-requirements/system-architecture.md](./project-requirements/system-architecture.md) |
| Review database schema | [project-requirements/database-design.md](./project-requirements/database-design.md) |
| Review API contracts | [project-requirements/api-specification.md](./project-requirements/api-specification.md) |
| See user stories & acceptance criteria | [project-requirements/user-stories.md](./project-requirements/user-stories.md) |
| Review UX & design | [design-specs/ux-design-specs.md](./design-specs/ux-design-specs.md) |
| Review ISO/SOC compliance | [compliance/iso-soc-framework.md](./compliance/iso-soc-framework.md) |
| See operational flows with controls | [compliance/feature-flows.md](./compliance/feature-flows.md) |
| Track build progress | [generated/tasks.md](./generated/tasks.md) |
| Review deployment / infra decisions | [adr/0001-multi-repo-platform-deployment.md](./adr/0001-multi-repo-platform-deployment.md) |

---

## Folder structure

```
docs/
├── README.md                          # This file
├── GETTING-STARTED.md                 # How to use this doc system
├── PROMPTS.md                         # AI prompts for implementation
├── STRUCTURE.md                       # Documentation organization
│
├── project-requirements/              # Core requirements
│   ├── prd.md                         # Canonical PRD (full detail)
│   ├── product-brief.md               # Executive summary
│   ├── srs.md                         # Software Requirements Specification
│   ├── system-architecture.md         # NestJS + Next.js architecture
│   ├── database-design.md             # PostgreSQL schema & ERD
│   ├── api-specification.md           # REST API contracts
│   └── user-stories.md                # Stories with acceptance criteria
│
├── compliance/                        # ISO/SOC governance
│   ├── iso-soc-framework.md           # Standards mapping & controls
│   ├── feature-flows.md               # Step-by-step auditable flows
│   └── deferred-compliance-work.md    # SOC 2, DSAR, access review backlog
│
├── design-specs/                      # UX & design
│   ├── ux-design-specs.md             # Full UX specification
│   └── design-system.md               # Tokens & components summary
│
├── generated/                         # Build artefacts
│   └── tasks.md                       # Phased implementation checklist
│
└── _legacy/                           # Deprecated boilerplate templates
```

---

## Document hierarchy

```
product-brief.md          ← start here (what & why)
    ↓
prd.md                    ← canonical functional spec
    ├── srs.md            ← structured requirements index
    ├── user-stories.md   ← testable acceptance criteria
    └── compliance/       ← ISO/SOC controls & flows
    ↓
system-architecture.md    ← how we build it (NestJS/Next.js)
database-design.md        ← data model
api-specification.md      ← API contracts
    ↓
ux-design-specs.md        ← how it looks & feels
    ↓
generated/tasks.md        ← what to build, in what order
```

---

## Polaris at a glance

| Attribute | Value |
|---|---|
| **Product** | Polaris — internal HR platform for Digitaro |
| **Users** | ~100–200 workers across Labs & Studio |
| **Countries** | Pakistan, UAE, Singapore |
| **Stack** | NestJS 10 + Next.js 16 + PostgreSQL + Better Auth |
| **Hosting** | Shared VPS via [digitaro-platform](../../digitaro-platform); Azure Blob + Key Vault for HRMS assets |
| **Phases** | 0 Foundations → 1 MVP → 2 Full ops → 3 Strategic |
| **Compliance** | ISO 9001, ISO 30400-series, ISO 27001/27701, SOC 2-ready |

---

## Implementation workflow

1. **Read** `product-brief.md` and `prd.md` for context
2. **Check** `generated/tasks.md` for current phase tasks
3. **Reference** `compliance/feature-flows.md` for the flow you're implementing
4. **Build** against `api-specification.md` and `database-design.md`
5. **Verify** against `user-stories.md` acceptance criteria
6. **Review** UX against `design-specs/ux-design-specs.md`

Use `PROMPTS.md` for AI-assisted implementation prompts.

---

## Local docs archive

Original working documents are preserved in `../local-docs/` at the hrms root. The `docs/` folder is the canonical implementation specification.

---

## Checklist before starting implementation

### Requirements
- [x] Product brief complete
- [x] PRD defines all functional requirements
- [x] SRS indexes all modules with NFRs
- [x] Database schema designed
- [x] API fully specified
- [x] User stories with acceptance criteria
- [x] Compliance flows mapped

### Design
- [x] UX specification complete
- [x] Design system tokens defined
- [x] Responsive breakpoints documented

### Compliance
- [x] ISO/SOC framework mapped
- [x] Feature flows with controls documented
- [x] Deferred compliance work catalogued

### Ready to build
- [x] Architecture adapted to NestJS/Next.js starter kit
- [x] Phased build checklist created
- [ ] Development environment set up
- [ ] Phase 0 tasks identified

---

**Start building:** Open [generated/tasks.md](./generated/tasks.md) and begin Phase 0.
