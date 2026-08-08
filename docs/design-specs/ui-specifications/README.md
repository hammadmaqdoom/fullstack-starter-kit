# UI Specifications

Per-screen UI specifications for Polaris, built on **PrimeReact (Styled mode)**. Each file gives, per screen: the exact PrimeReact components, layout (desktop + mobile), key props, and the five states.

Read these alongside the canonical UX spec ([../ux-design-specs.md](../ux-design-specs.md) §6) and the component mapping ([../component-mapping.md](../component-mapping.md)).

### Files

| File | Covers (UX §) |
|---|---|
| [shared-components.md](./shared-components.md) | App shell, CheckInHero, StatusTracker, RequestCard, Hub primitives, the five states (§3.2, §5) |
| [employee.md](./employee.md) | Login, Home, Check-in, Calendar, Leave, Payslips, Documents, Profile, Help (§6.1) |
| [manager.md](./manager.md) | The Hub, Cockpit, Approvals queue, Team calendar (§6.2, §5.1) |
| [people-ops.md](./people-ops.md) | HR dashboard, Worker mgmt, Onboarding, Separation, Templates, Leave admin (§6.3) |
| [finance.md](./finance.md) | Benefit types, Pay runs, Contractor batches, FX, Statutory rates, Reports (§6.4) |
| [contractor.md](./contractor.md) | 4-tab portal: Home, Invoices, Documents, Me (§6.5) |
| [admin-setup.md](./admin-setup.md) | Guided setup wizard, config surfaces, roles & access (§6.6, §7, §8) |

End-to-end flows: **[../ux-design-specs.md](../ux-design-specs.md) §10** (minute-level journey traces).

### How to use

1. Find the screen's role file above.
2. Cross-check the functional spec in [../../project-requirements/prd.md](../../project-requirements/prd.md) (PRD §6.x).
3. Verify control points in [../../compliance/feature-flows.md](../../compliance/feature-flows.md).
4. Build with the components named, themed per [../primereact-setup.md](../primereact-setup.md).

Add page-specific wireframe/screenshot images to [../wireframes/](../wireframes/) as they are produced.
