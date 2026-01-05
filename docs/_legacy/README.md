# Legacy Documentation (Deprecated)

⚠️ **This folder contains deprecated documentation from the old website-specific system.**

## What's Here

- `website-guidelines/` - Old product brief and website-specific guidelines
- `website-sections/` - Old section-by-section specifications for websites

## Why It's Deprecated

The documentation system has been upgraded to a **universal project requirements system** that works for all types of projects (not just websites).

## New Structure

Use the new documentation system instead:

```
docs/
├── project-requirements/    # ✅ Use this (for ALL projects)
│   ├── product-brief.md
│   ├── srs.md
│   ├── database-design.md
│   ├── api-specification.md
│   ├── system-architecture.md
│   └── user-stories.md
│
├── design-specs/           # ✅ Use this (for frontend projects)
│   ├── design-system.md
│   ├── wireframes/
│   └── ui-specifications/
│
└── generated/              # ✅ AI generates these
    ├── TECHNICAL_DOCS.md
    ├── DATABASE_SCHEMA.sql
    ├── API_CONTRACTS.yaml
    └── tasks.md
```

## Migration Guide

### If You Have Existing Content in Legacy Folders:

1. **website-guidelines/product-brief.md** → Migrate to `project-requirements/product-brief.md`
   - The new template is more comprehensive
   - Includes project type selection
   - Supports all project types (not just websites)

2. **website-sections/0.design-moodboard.md** → Migrate to `design-specs/design-system.md`
   - More structured design system
   - Includes component specifications
   - Better organized

3. **website-sections/1-9.*.md** → Migrate to `design-specs/ui-specifications/`
   - Create one file per page/section
   - Use the new template format
   - More detailed specifications

## Should I Delete This Folder?

**Keep it for now** if:
- You have existing projects using the old structure
- You want to reference old specifications
- You're migrating gradually

**Delete it** when:
- All content has been migrated to new structure
- No projects depend on it
- You're starting fresh

---

**Ready to migrate?** Start with the new `project-requirements/` folder and follow the templates there.

