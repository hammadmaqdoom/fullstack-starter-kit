# Finance — UI Spec (thin)

**Covers:** Pay runs, benefits, statutory rates, contractor payments, FX (PRD §6.4 / Phase 2 shells)  
**Gate:** `RequireRole role="finance"` on `finance/layout.tsx`

## Screen catalogue

| Route | Purpose | Primary action | Notes |
|---|---|---|---|
| `/finance/pay-runs` | Pay run list | Create / open run | StatusTracker on detail |
| `/finance/pay-runs/[id]` | Pay run detail | Advance / export | Five states |
| `/finance/benefits` | Benefit types / assignments | Create | |
| `/finance/statutory-rates` | Rate schedules | Create / edit | Config tables — no country hard-code |
| `/finance/contractor-payments` | Contractor batches | Create batch | |
| `/finance/fx` | FX rates / variance | Review / refresh | |

## Five states

All finance list/detail screens: `PageSkeleton` → EmptyState (+ CTA if creatable) → error+retry → offline banner → success toast.

## Harden in W3

- Verify EmptyState CTAs and loading skeletons on every route
- Country/currency pickers from config APIs only
- No dead buttons

## Components

`PageHeader`, `DataTable`, `Dialog`, `StatusTracker`, `StatusChip`, `EmptyState`, `PageSkeleton`
