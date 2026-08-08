# Polaris — Documentation Structure

**Product:** Polaris  
**Last updated:** 26 June 2026

---

## Complete file structure

```
docs/
├── README.md                          # Documentation system overview
├── GETTING-STARTED.md                 # Step-by-step implementation guide
├── PROMPTS.md                         # AI prompts for implementation
├── STRUCTURE.md                       # This file
│
├── project-requirements/              # Core requirements
│   ├── README.md
│   ├── product-brief.md               # Executive summary
│   ├── prd.md                         # Canonical PRD (full detail)
│   ├── srs.md                         # Software Requirements Specification
│   ├── system-architecture.md         # NestJS + Next.js architecture
│   ├── database-design.md             # PostgreSQL schema & ERD
│   ├── api-specification.md           # REST API contracts
│   └── user-stories.md                # Stories with acceptance criteria
│
├── compliance/                        # ISO/SOC governance
│   ├── README.md
│   ├── iso-soc-framework.md           # Standards mapping & controls
│   ├── feature-flows.md               # Step-by-step auditable flows
│   └── deferred-compliance-work.md    # Deferred compliance backlog
│
├── design-specs/                      # UX & design
│   ├── README.md
│   ├── ux-design-specs.md             # Full UX specification
│   ├── design-system.md               # Tokens + PrimeReact component library
│   ├── primereact-setup.md            # PrimeReact install, theme, Tailwind interop
│   ├── component-mapping.md           # Feature/screen → PrimeReact components
│   ├── ui-specifications/             # Per-screen specs (by role)
│   │   ├── README.md
│   │   ├── shared-components.md
│   │   ├── employee.md
│   │   ├── manager.md
│   │   ├── people-ops.md
│   │   ├── finance.md
│   │   ├── contractor.md
│   │   └── admin-setup.md
│   └── wireframes/                    # Annotated ASCII wireframes (mobile + desktop)
│       ├── README.md                  # Legend + naming conventions
│       ├── employee-screens.md
│       ├── manager-screens.md
│       ├── people-ops-screens.md
│       ├── finance-screens.md
│       ├── contractor-screens.md
│       └── admin-setup-screens.md
│
├── generated/                         # Build artefacts
│   ├── README.md
│   ├── tasks.md                       # Phased implementation checklist
│   ├── TECHNICAL_DOCS.md              # Consolidated technical reference (digest)
│   ├── DATABASE_SCHEMA.sql            # PostgreSQL DDL (spec-derived draft)
│   └── API_CONTRACTS.yaml             # OpenAPI 3.1 (spec-derived draft)
│
├── adr/                               # Architecture decision records
│   ├── README.md
│   └── 0001-multi-repo-platform-deployment.md
│
└── _legacy/                           # Deprecated starter-kit website templates
    └── README.md
```

---

## Document relationships

```
product-brief.md
    ↓
prd.md ──────────────────┬── srs.md
    │                    └── user-stories.md
    ├── compliance/
    │       ├── iso-soc-framework.md
    │       └── feature-flows.md
    ↓
system-architecture.md
database-design.md
api-specification.md
    ↓
design-specs/ux-design-specs.md
    ↓
generated/tasks.md
```

---

## File status legend

| Symbol | Meaning |
|---|---|
| ✅ | Complete — Polaris content |
| 🔄 | Generated during implementation |
| 🗄️ | Deprecated — in `_legacy/` |

---

## Reading order by role

### Product / People Ops
1. `product-brief.md`
2. `prd.md`
3. `compliance/iso-soc-framework.md`

### Backend engineer
1. `system-architecture.md`
2. `database-design.md`
3. `api-specification.md`
4. `compliance/feature-flows.md` (per feature)

### Frontend engineer
1. `design-specs/ux-design-specs.md`
2. `design-specs/primereact-setup.md` (install + theme before building)
3. `design-specs/design-system.md`
4. `design-specs/component-mapping.md`
5. `design-specs/ui-specifications/` (per-screen specs)
6. `api-specification.md`
7. `user-stories.md` (acceptance criteria)

### QA
1. `user-stories.md`
2. `compliance/feature-flows.md`
3. `generated/tasks.md` (phase gates)

---

## Not applicable for Polaris

The following starter-kit documents are **not used** for Polaris (internal HR platform, not a marketing website):

- `CMS-GUIDE.md` — CMS not in scope
- `SEO-GUIDE.md` — Internal app, no public SEO
- `_legacy/website-sections/` — Marketing website templates

---

## Local docs archive

Original working drafts: `../local-docs/` at hrms root.  
**`docs/` is the canonical implementation specification.**
