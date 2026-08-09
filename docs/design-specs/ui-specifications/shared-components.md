# Shared Components — UI Spec (thin)

**Product:** Polaris  
**Status:** Thin stub for Admin UX coverage waves  
**Canonical UX:** `../ux-design-specs.md` (restore full depth incrementally)

## Screen contract (every authenticated page)

| Element | Rule |
|---|---|
| Purpose | Title + one-line description of what the screen is for |
| Primary action | Visible when the role can mutate; also on empty state when creatable |
| Five states | Skeleton loading, empty (+ CTA), error (+ retry), offline where applicable, success feedback |
| Workflows | `StatusTracker` on every request-bearing flow |
| Affordance | Row actions usable without hover-only |
| Copy | English only — `frontend/src/locales/en.json` |
| Tenancy | No tenant picker; no `tenantId` in request bodies |

## Primitives

| Component | Path | Usage |
|---|---|---|
| `PageHeader` | `frontend/src/components/shared/PageHeader.tsx` | Title + description + optional primary action slot |
| `EmptyState` | `frontend/src/components/shared/EmptyState.tsx` | Dashed empty panel; **must** pass `actionLabel` + `onAction` when the role can create |
| `PageSkeleton` | `frontend/src/components/shared/PageSkeleton.tsx` | Variants: `list` \| `table` \| `detail` |
| `StatusTracker` | `frontend/src/components/shared/StatusTracker.tsx` | Multi-step workflow progress |
| `StatusChip` | `frontend/src/components/shared/StatusChip.tsx` | Status label |
| `RequireRole` | `frontend/src/components/shared/RequireRole.tsx` | Client route gate (`peopleOps`, `manager`, `finance`, …) |
| `AuthenticatedShell` | `frontend/src/components/AuthenticatedShell.tsx` | Sidebar + top bar + main |

## Empty-state CTA rule

Creatable lists must not show a bare empty message. Use:

```tsx
<EmptyState
  icon={…}
  title={t('empty_title')}
  description={t('empty_description')}
  actionLabel={t('create_cta')}
  onAction={() => setCreateOpen(true)}
/>
```

## Shell

- Nav from `/api/v1/me/shell` (`shell-nav.catalog.ts`)
- People Ops layout: `RequireRole role="peopleOps"`
- Finance layout: `RequireRole role="finance"`
- Lucide icons only
