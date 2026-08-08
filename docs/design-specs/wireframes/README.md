# Wireframes

Low-fidelity wireframes for every Polaris screen, expressed as **annotated ASCII layouts** (text-based, version-controlled, diff-able). Each screen is drawn at **mobile (375px)** and **desktop (1280px)**; tablet (768px) follows the nearest pattern noted per screen.

These pair with the per-screen component specs in [../ui-specifications/](../ui-specifications/) and the canonical UX spec [../ux-design-specs.md](../ux-design-specs.md) §6. Component names are PrimeReact (Styled mode) — see [../primereact-setup.md](../primereact-setup.md).

> High-fidelity rendered mockups/screenshots (PNG) can be dropped alongside these files later using the naming convention below; the ASCII wireframes remain the source of truth for layout + components.

---

## Files

| File | Screens |
|---|---|
| [employee-screens.md](./employee-screens.md) | Login, Home (Today), Check-in, Calendar, Leave, Payslips, Documents & signing, Me/Profile, Ask/Help, The Hub |
| [manager-screens.md](./manager-screens.md) | Manager cockpit, Approvals queue, Team calendar & people |
| [people-ops-screens.md](./people-ops-screens.md) | HR dashboard, Worker management, Onboarding board, Separation board, Templates & letters, Leave/calendar admin |
| [finance-screens.md](./finance-screens.md) | Benefit types, Pay runs, Contractor invoices & batches, FX rates, Statutory rates, Payroll reports |
| [contractor-screens.md](./contractor-screens.md) | Contractor portal: Home, Invoices, Documents, Me |
| [admin-setup-screens.md](./admin-setup-screens.md) | Guided setup wizard, Config surfaces, Roles & access |

---

## ASCII legend

```
┌─┐ └─┘  container / card / panel        [ Button ]      button
│   │    region border                    ( Segmented )  segmented control / toggle
├───┤    divider                          [▼ Select  ]   dropdown / select
●━━○      status tracker (done/todo)       [▢] [▣]        checkbox (off/on)
🟢🟡🔴⚪    status colours (in/leave/missing/out)  «swipe»  swipe-action row
[# icon] Lucide icon slot                 …              overflow / more
{Comp}   PrimeReact component annotation   ▭▭▭            Skeleton block
```

Each screen block lists, beneath the wireframe: **Components** (PrimeReact), **Responsive** notes, and **States** (loading / empty / error / offline / populated) where they differ from the default in [../ui-specifications/shared-components.md](../ui-specifications/shared-components.md).

---

## Naming convention (for future PNG mockups)

```
{role}-{screen}-{viewport}.png

employee-home-mobile.png
employee-home-desktop.png
admin-pay-run-review-desktop.png
contractor-invoices-mobile.png
```

Viewports: mobile 375px · tablet 768px · desktop 1280px. Every employee-facing screen reviewed at all three before sign-off (UX §2.9).
