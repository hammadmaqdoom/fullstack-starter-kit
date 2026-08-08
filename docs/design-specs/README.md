# Polaris — Design Specifications

**Product:** Polaris  
**Last updated:** 26 June 2026

---

## Contents

| Document | Description |
|---|---|
| [ux-design-specs.md](./ux-design-specs.md) | **Canonical UX spec** — philosophy, IA, screens, flows, responsive delivery |
| [design-system.md](./design-system.md) | Design tokens + **PrimeReact component library** (core component → PrimeReact mapping) |
| [primereact-setup.md](./primereact-setup.md) | **PrimeReact setup & integration** — install, provider, Digitaro theme, Tailwind interop, icons, SSR, licensing |
| [component-mapping.md](./component-mapping.md) | Feature/screen → **exact PrimeReact components** quick-reference catalogue |
| [ui-specifications/](./ui-specifications/) | **Per-screen specs** — components, layout, props, states (by role) |

**Frontend UI stack:** PrimeReact (Styled mode) + custom Digitaro theme · Tailwind CSS 4 (layout) · Lucide React (icons) · Next.js 16 App Router. See [primereact-setup.md](./primereact-setup.md).

---

## How to use

1. **Start with** [ux-design-specs.md](./ux-design-specs.md) for the full experience specification
2. **Set up** PrimeReact per [primereact-setup.md](./primereact-setup.md) before building
3. **Reference** [design-system.md](./design-system.md) + [component-mapping.md](./component-mapping.md) for which components to use
4. **Build screens** from [ui-specifications/](./ui-specifications/)
5. **Cross-check** functional requirements in [../project-requirements/prd.md](../project-requirements/prd.md)
6. **Verify flows** against [../compliance/feature-flows.md](../compliance/feature-flows.md) for control points

---

## Key UX decisions (resolved)

| Decision | Resolution | Reference |
|---|---|---|
| Native wrapper | PWA only — no Capacitor | UX §9.1 |
| Languages | English only at launch | PRD §8 |
| WhatsApp | `wa.me` deep links, not Business API | UX §5.3 |
| Theme | Light at launch; dark deferred | [deferred-compliance-work.md](../compliance/deferred-compliance-work.md) §4 |
| Responsive | Desktop + mobile parity mandatory | UX §2.9 |
| Admin surfaces | Desktop-optimised; mobile capable for review/approval | UX §4.3 |

---

## Implementation in frontend

```
frontend/src/
├── components/
│   ├── providers/       # PrimeProvider (PrimeReactProvider + Digitaro theme)
│   ├── ui/              # Composed PrimeReact primitives (RequestCard, StatusChip, Segmented…)
│   ├── hub/             # Unified inbox components
│   ├── attendance/      # CheckInHero, punch UI
│   └── layout/          # AppShell (employee tabs, admin sidebar)
├── styles/
│   ├── polaris-theme.ts # PrimeReact theme preset (definePreset) — design-system.md tokens
│   └── global.css       # Semantic/status CSS variables + Tailwind interop
└── app/
    └── [locale]/        # Role-based routes
```

---

## Review checklist (per screen)

Before sign-off on any screen, verify against UX spec §2 (nine design principles):

- [ ] Common path is one action (if daily/weekly task)
- [ ] Depth hidden behind progressive disclosure
- [ ] Status tracker present (if request-bearing)
- [ ] Works at 375px, 768px, and 1280px
- [ ] Five states defined: loading, empty, error, offline, success
- [ ] Touch targets ≥ 44px on mobile
- [ ] No hover-only or touch-only paths

---

## Wireframes

Formal wireframe images are not yet produced. Screen layouts are specified textually in [ux-design-specs.md](./ux-design-specs.md) §4 (IA), §6 (screen-by-screen), and per-screen with components in [ui-specifications/](./ui-specifications/). Add wireframe/screenshot images to `wireframes/` as they are created.

---

## Related documents

- [../project-requirements/product-brief.md](../project-requirements/product-brief.md)
- [../project-requirements/user-stories.md](../project-requirements/user-stories.md)
- [../generated/tasks.md](../generated/tasks.md) — Phase 1 frontend tasks
