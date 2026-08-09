# People Ops — UI Spec (thin)

**Covers:** PRD §6.1–6.8 admin surfaces, Hub entry for PO  
**Layout:** Desktop-optimised DataTables; five states mandatory  
**Gate:** `RequireRole role="peopleOps"`

## Screen catalogue

| Route | Purpose | Primary action | StatusTracker | Notes |
|---|---|---|---|---|
| `/people-ops/dashboard` | Headcount + ack gaps + onboarding widgets | Drill to workers / compliance | No | Loading skeleton; empty widgets OK |
| `/people-ops/workers` | Worker directory CRUD | Add worker | No | EmptyState CTA; archive action (W1) |
| `/people-ops/workers/[id]` | Worker profile + change requests | Edit / approve | On change requests | Full profile fields (W1) |
| `/people-ops/org` | Divisions, departments, LEs, offices | Create org unit | No | W1 — replace hardcoded pickers |
| `/people-ops/pre-boarding` | Pre-hire packets | Create packet | On detail | EmptyState CTA (W1) |
| `/people-ops/onboarding` | Day-1 boards / cases | Create case | On detail | Already strong |
| `/people-ops/separations` | Clearance board | Initiate separation | On detail | EmptyState CTA (W1) |
| `/people-ops/policies` | Policy versions + compliance | Create / publish | On version flow | Not list-only (W1) |
| `/people-ops/compliance` | Control catalogue (evidence layer) | Open control | On test history | Separate plan |
| `/people-ops/leave` | Leave types + holiday calendars | Create leave type | No | End stub (W1) |
| `/people-ops/documents/register` | Issued documents | Issue / export | When applicable | |
| `/people-ops/templates` | Document templates | Create template | No | |
| `/people-ops/letterheads` | Letterhead versions | Publish version | No | |
| `/people-ops/audit` | Immutable audit search + CSV | Export CSV | No | W1 Super Admin / PO |
| `/people-ops/roles` | Role assignments | Assign role | No | W1 Super Admin |
| `/people-ops/approvals-config` | Delegations + routing | Create rule | No | W1 |
| `/people-ops/performance` (+ OKRs/calibration/pulse) | Cycles / reviews | Create cycle | When workflow | Harden W3 |
| `/people-ops/manpower` | Plans / positions | Create plan | No | Nav + polish W3 |
| `/people-ops/recruitment` | Requisitions / pipeline | Create req | Pipeline stages | Nav + polish W3 |
| `/people-ops/training` | Courses / assignments | Create course | No | Nav + polish W3 |
| `/hub` (from PO nav) | Unified inbox | Act on card | On cards | Actionable W2 |

## Components

- PrimeReact: `DataTable`, `Dialog`, `Button`, `Dropdown`, `Calendar`, `Message`, `TabView`
- Shared: `PageHeader`, `EmptyState`, `PageSkeleton`, `StatusTracker`, `StatusChip`

## Five states (all list screens)

1. Loading → `PageSkeleton variant="table"`
2. Empty → `EmptyState` + CTA if creatable
3. Error → Message + retry
4. Offline → shell offline banner when applicable
5. Success → toast / inline confirm after mutate
