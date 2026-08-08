# Polaris — Design System (PrimeReact)

**Product:** Polaris
**Canonical spec:** [ux-design-specs.md](./ux-design-specs.md)
**Setup & theming:** [primereact-setup.md](./primereact-setup.md)
**Screen specs:** [ui-specifications/](./ui-specifications/)
**Last updated:** 30 June 2026

> This file defines design tokens and the **component library** for Polaris. The UI is built on **PrimeReact (Styled mode)** themed with a custom Digitaro preset; **Tailwind CSS 4** handles layout; **Lucide React** is the app icon set. Full screen specs are in [ui-specifications/](./ui-specifications/).

---

## Design philosophy

Polaris optimises for the **95% of human-hours** spent by ordinary employees — not the admin who configures the system. Three governing principles:

1. **The common path is one action** — daily tasks cost one click/tap.
2. **Depth is earned, not displayed** — power lives one layer down.
3. **It should feel human** — warmth and delight are features.

How this shapes component choices: prefer the *simplest* PrimeReact component that does the job; lean on smart defaults and `value`/`onChange` controlled inputs; reserve heavy components (`DataTable`, `Stepper`, `Chart`) for admin/finance depth, never the employee daily path.

---

## Brand tokens

Source: **Digitaro brand refresh** (updated typeface + palette; logo mark retained). Implemented as a PrimeReact theme preset — see [primereact-setup.md §4](./primereact-setup.md).

| Token group | Rule | PrimeReact theme token |
|---|---|---|
| **Typeface** | Digitaro refresh primary; display weight for headers, readable text weight, tabular figures for numbers | `--p-font-family`; tabular nums via Tailwind `tabular-nums` |
| **Colour — brand** | Primary, secondary, accent from refreshed palette | `semantic.primary.*`, custom `secondary`/`accent` |
| **Colour — semantic** | Success, Warning, Danger, Info, Neutral surfaces | `--color-success/warning/danger/info`, `--p-surface-*` |
| **Colour — status** | In = green, Out = neutral, On leave = amber, Missing punch = red, Pending = blue | `--status-in/out/on-leave/missing/pending` |
| **Spacing** | 4px base scale: 4 / 8 / 12 / 16 / 24 / 32 | Tailwind scale (`gap-1`…`gap-8`) |
| **Radius** | Soft, consistent — friendly not corporate-sharp | `borderRadius.sm/md/lg` = 6/10/16px |
| **Elevation** | Minimal purposeful shadows; depth via layering | theme shadow tokens; avoid heavy drop-shadows |

**Themes:** Light at launch (default). Dark mode deferred — `colorScheme.dark` reserved in the preset, toggled via `.app-dark` selector for the future fast-follow.

> Token definitions, the `definePreset` theme, and the CSS-variable bridge to Tailwind live in [primereact-setup.md §4–5](./primereact-setup.md). This avoids drift between two files — the theme file is the implementation; this table is the contract.

---

## Component library — Polaris core → PrimeReact

The UX spec (§3.2) names a small set of **core components built once, used everywhere**. Each maps to a PrimeReact component (used directly or composed). Bespoke ones are built headless — see [ui-specifications/shared-components.md](./ui-specifications/shared-components.md).

| Polaris core component (UX §3.2) | Built with | Bucket |
|---|---|---|
| **Card** (request / person / day card) | `Card` + `Tag` + `Button` → composed `RequestCard`, `PersonCard`, `DayCard` | Composed |
| **Status chip** | `Tag` (severity mapped to status colour) → `StatusChip` | Composed |
| **Status tracker** (horizontal stepper) | **Bespoke** (`@primereact/hooks`) or `Stepper` (read-only) → `StatusTracker` | Bespoke |
| **Bottom sheet** (mobile) | `Drawer` (`position="bottom"`) → `ActionSheet` | Composed |
| **Right panel / dialog** (desktop) | `Drawer` (`position="right"`) / `Dialog` | Direct |
| **Swipe-action row** | **Bespoke** (`@primereact/hooks` + touch) → `SwipeRow` | Bespoke |
| **Avatar + presence dot** | `Avatar` + `Badge`/overlay dot → `PresenceAvatar` | Composed |
| **Segmented control** (Me/Team, Mine/For me) | `SelectButton` → `Segmented` | Composed |
| **Empty state** | **Bespoke** (Lucide icon + copy + `Button`) → `EmptyState` | Bespoke |
| **Skeleton loader** | `Skeleton` | Direct |
| **Toast + undo** | `Toast` (with action template) → `useToastUndo` | Composed |
| **Hub item card** | composed `RequestCard` variant | Composed |
| **Pull-to-refresh** | **Bespoke** (`@primereact/hooks`) → `PullToRefresh` | Bespoke |

### Full PrimeReact component catalogue (by use in Polaris)

> New-generation naming (with legacy alias where helpful): `Select` (Dropdown), `DatePicker` (Calendar), `Drawer` (Sidebar), `Popover` (OverlayPanel), `ToggleSwitch` (InputSwitch), `Tabs` (TabView).

**Forms & inputs**
`InputText` · `InputNumber` (currency/amounts, tabular) · `InputMask` (IDs, phone) · `Textarea` · `Password` · `AutoComplete` (people/search) · `Select` · `MultiSelect` · `SelectButton` (segmented) · `Checkbox` · `RadioButton` · `ToggleSwitch` · `DatePicker` (leave dates, ranges) · `Slider` · `Rating` · `FloatLabel` / `IftaLabel` / `IconField` (labelled fields) · `FileUpload` (documents, receipts) · `Editor` (rich-text templates).

**Buttons & actions**
`Button` · `SplitButton` · `SpeedDial` (mobile "+" quick actions).

**Data**
`DataTable` (worker lists, pay-run grids, invoices) · `DataView` (card/list of requests) · `TreeTable` (org/division hierarchy) · `Tree` · `Timeline` (status history, audit) · `OrganizationChart` (reporting lines) · `Paginator` · `VirtualScroller` (long lists).

**Panels & layout**
`Card` · `Panel` · `Fieldset` · `Accordion` (progressive disclosure / "More") · `Divider` · `Splitter` (master-detail) · `ScrollPanel` · `Stepper` (setup wizard, onboarding) · `Tabs` · `Toolbar`.

**Overlays**
`Dialog` · `Drawer` (bottom sheet / right panel) · `Popover` · `Tooltip` · `ConfirmDialog` / `ConfirmPopup` (destructive only).

**Menu & navigation**
`Menubar` · `TabMenu` (mobile bottom tab bar base) · `PanelMenu` (admin sidebar groups) · `Breadcrumb` · `ContextMenu` (desktop right-click) · `Dock` · `TieredMenu` / `Menu` (overflow, row actions).

**Messages & feedback**
`Toast` · `Message` (inline) · `ProgressBar` · `ProgressSpinner` (avoid as first-load; use `Skeleton`) · `Badge` (counts) · `Chip` · `Tag` (status) · `MeterGroup` (leave balances, headcount mix) · `BlockUI` (optimistic lock).

**Media & misc**
`Avatar` / `AvatarGroup` · `Image` · `Chart` (HR/finance dashboards, Chart.js) · `Skeleton` · `Inplace` (inline edit).

---

## Status & severity mapping

One mapping, used everywhere a status appears (`Tag`, `Toast`, `Message`, presence dot).

| Polaris status | Colour token | PrimeReact severity | Icon (Lucide) |
|---|---|---|---|
| In / Approved / Checked-in | `--status-in` (green) | `success` | `Check`, `LogIn` |
| Pending / With manager | `--status-pending` (blue) | `info` | `Clock` |
| On leave / Expiring | `--status-on-leave` (amber) | `warn` | `Plane`, `AlertTriangle` |
| Rejected / Overdue / Missing punch | `--status-missing` (red) | `danger` | `X`, `AlertCircle` |
| Out / Inactive | `--status-out` (neutral) | `secondary` | `LogOut` |

Rule (UX §3.5): status is **always label + icon**, never colour alone.

---

## Interaction standards

| Viewport | Pattern | PrimeReact realisation |
|---|---|---|
| **Mobile** (< 768px) | Bottom tab bar, bottom sheets, swipe, pull-to-refresh, 44px targets | `TabMenu`-based bottom bar; `Drawer position="bottom"`; bespoke `SwipeRow`/`PullToRefresh`; `Button` min-h 44px |
| **Tablet** (768–1279px) | Sidebar for admin, tabs for employee | `PanelMenu` / `TabMenu` |
| **Desktop** (≥ 1280px) | Persistent sidebar, ⌘K command bar, keyboard shortcuts, hover hints | `PanelMenu` sidebar; `AutoComplete`/`Dialog` command bar; `Tooltip`; `ContextMenu` |

**Universal rules:**
- No hover-only interactions; no touch-only gestures without a visible button equivalent.
- Optimistic UI with rollback `Toast` on failure (no pre-action confirm except destructive).
- `ConfirmDialog`/`ConfirmPopup` **only** for destructive/irreversible actions.
- Respect `prefers-reduced-motion` (disable ripple/animations).
- Five states on every screen: loading (`Skeleton`), empty (`EmptyState`), error (`Message` + retry), offline (cached + banner), success/populated.

---

## Navigation structure

### Employee (5 destinations)
Home · Calendar · **Check-in** (centre/primary) · Hub · Me
→ Mobile: bespoke bottom tab bar (on `TabMenu`) with raised centre Check-in. Desktop: `PanelMenu` sidebar + top bar with persistent Check-in button + ⌘K.

### Contractor (4 destinations)
Home · Invoices · Documents · Me

### Admin (sidebar modules)
Worker management · Onboarding · Separation · Templates · Leave/calendar admin · Pay runs · Reports · Settings
→ `PanelMenu` with expandable groups (desktop-first); off-canvas `Drawer` on mobile.

See [ui-specifications/shared-components.md](./ui-specifications/shared-components.md) for the app-shell build.

---

## Icons

**App icon set:** [Lucide React](https://lucide.dev) (`lucide-react`) — unchanged. **PrimeIcons** is present only for PrimeReact's internal glyphs; override visible/branded affordances with Lucide via component `icon` props or PassThrough.

| Rule | Detail |
|---|---|
| **Import** | Named imports from `lucide-react` — `import { Check, ChevronDown } from 'lucide-react'` |
| **No alternatives** | No emoji-as-icon, inline SVGs, Font Awesome, Heroicons, react-icons |
| **Sizing** | Tailwind `size-*`: inline 16px (`size-4`), default UI 20px (`size-5`), card 24px (`size-6`), nav/hero 32px (`size-8`) |
| **Colour** | Inherit via `currentColor` / semantic classes (`text-primary`, `text-[var(--status-in)]`) |
| **Accessibility** | Decorative: `aria-hidden`. Meaningful: `aria-label` on the control, not the SVG |

```tsx
import { Button } from 'primereact/button';
import { LogOut } from 'lucide-react';

<Button text aria-label="Sign out">
  <LogOut className="size-5" aria-hidden />
</Button>
```

---

## Sidebar (authenticated app shell)

Minimal, condensed left sidebar — desktop (≥ 1024px). Mobile uses the same panel as an off-canvas `Drawer`. Built on `PanelMenu` with custom item templates (Lucide icons).

| Token | Value |
|---|---|
| **Width** | 240px fixed |
| **Background** | `--p-surface-0` (white) |
| **Border** | Right edge `--p-surface-200` |
| **Nav item** | 13px medium, `py-1.5 px-2`, 18px Lucide icon |
| **Active state** | Semibold + 2px left indicator bar (`--p-primary-500`) |
| **Search** | 32px, rounded, ⌘K hint (`AutoComplete` or `Dialog` command bar) |
| **Sections** | `Divider` between groups |
| **Footer** | Onboarding card, changelog link, user profile row (`Avatar`) |

Implementation: `frontend/src/components/layout/AppSidebar.tsx`

---

## Accessibility

- WCAG 2.1 AA on core flows (PrimeReact ships ARIA + keyboard nav; do not break it with PassThrough).
- 4.5:1 text contrast minimum.
- Status: label + icon, never colour alone.
- Full screen-reader labels; label every input (`FloatLabel`/`IftaLabel` or `htmlFor`).
- Dynamic type / OS font scaling support; 44px touch targets on mobile.

---

## Motion

- Standard transitions 150–250ms (PrimeReact defaults are close; keep subtle).
- Expressive motion reserved for human moments (approval checkmark, anniversary card) — bespoke, not component default.
- Respect `prefers-reduced-motion` (disable ripple + animations).

---

## Related documents

- [primereact-setup.md](./primereact-setup.md) — install, provider, theme, Tailwind interop
- [component-mapping.md](./component-mapping.md) — every screen/feature → exact PrimeReact components
- [ui-specifications/](./ui-specifications/) — per-screen specs
- [ux-design-specs.md](./ux-design-specs.md) — full UX specification (screens, flows, IA)
- [../project-requirements/prd.md](../project-requirements/prd.md) — functional requirements
- [../compliance/feature-flows.md](../compliance/feature-flows.md) — auditable operational flows
