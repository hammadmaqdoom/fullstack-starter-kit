# Admin Setup — UI Spec (thin)

**Covers:** Guided setup wizard (§7), org structure, roles & access, audit (§8)

## Setup wizard `/admin/setup`

| Element | Spec |
|---|---|
| Purpose | First-run tenant configuration (countries, holidays, leave types, employment matrix, seeds) |
| Primary action | Save step / Apply seed |
| Per-step editors | Holidays, leave types, employment×country must be editable — not display-only (W1) |
| Progress | Stepper; skip logic preserved |
| Five states | Loading wizard state; error on save; success toast |

## Org structure `/people-ops/org` (W1)

| Element | Spec |
|---|---|
| Purpose | Manage divisions, departments, legal entities, office locations |
| Primary action | Create unit |
| Pickers | All worker/forms load options from org APIs — never hardcoded seed UUIDs |
| LE detail | Tabs: mappings, currencies, signatories |

## Roles `/people-ops/roles` (W1)

| Element | Spec |
|---|---|
| Purpose | Assign Polaris roles with effective dating |
| Mutate | Super Admin (People Ops read optional) |
| Primary action | Assign role |
| Audit | Every assignment → `audit_log` |

## Audit `/people-ops/audit` (W1)

| Element | Spec |
|---|---|
| Purpose | Search immutable audit log; CSV export (US-COMP-001) |
| Filters | Entity, actor, date range |
| Primary action | Export CSV |
| Tenancy | Session tenant only; no client tenantId |

## Components

`PageHeader`, `Steps` (wizard), `DataTable`, `Dialog`, `EmptyState`, `PageSkeleton`
