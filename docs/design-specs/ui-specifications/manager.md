# Manager & Hub — UI Spec (thin)

**Covers:** Hub (UX §5.1), Manager cockpit, team calendar  
**Roles:** Manager, Division Head, People Ops (as allowed)

## Hub `/hub`

| Element | Spec |
|---|---|
| Purpose | Single inbox — Mine / For me — not per-module lists |
| Primary action | Open item; approve/reject when actor can |
| Cards | Clickable; show `StatusChip` + `StatusTracker` |
| Bulk | Bulk actions when API supports |
| Empty | EmptyState without create CTA (inbox is pull, not create) |
| Error | Retry refresh |

**Gap (W2):** Cards currently display-only — must deep-link and support approve/reject.

## Manager cockpit `/manager/cockpit`

| Element | Spec |
|---|---|
| Purpose | Team attendance + approvals queue |
| Dual mode | Manager vs “me” — “me” links clearly to employee home, not a dead end |
| Approvals | Deep-link to Hub items |
| Five states | Skeleton / empty queue / error / offline / success on actions |

## Team calendar `/manager/calendar`

| Element | Spec |
|---|---|
| Purpose | Team leave / attendance visibility |
| Actions | Open leave detail where permitted |
| Five states | Required |

## Components

`PageHeader`, `ApprovalsQueue`, `HubItemCard`, `StatusTracker`, `StatusChip`, `PageSkeleton`, `EmptyState`
