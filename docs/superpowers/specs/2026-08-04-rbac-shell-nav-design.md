# Design: RBAC App Shell & Role-Aware Navigation

**Date:** 2026-08-04  
**Status:** Implemented — see `docs/superpowers/plans/2026-08-04-rbac-shell-nav.md`  
**Product:** Polaris (Digitaro HRMS)  
**Related:** UX §4.1–4.4, design-system §Navigation, `AppSidebar` / `AuthenticatedShell`

## Problem

The authenticated left nav shows every role section to every user. Access is faked with lock icons and crude API probes (`usePolarisNavAccess`). The shell still carries starter-kit placeholders (fake setup progress, changelog link, CMS links, dead ⌘K, LocaleSwitcher). `/dashboard` is a generic account page instead of a role home.

## Goals

1. Role-variant navigation per UX §4 — inaccessible items are **absent**, not locked.
2. Single source of truth: shell capabilities API driven by `user_role_assignments`.
3. Real setup progress card + persistent Setup nav (People Ops / Admin).
4. Working ⌘K command palette with **full, role-scoped search**.
5. Post-login / `/dashboard` redirect to the correct role home.

## Non-goals

- Rebuilding every module page content (employee home and people-ops dashboard already exist).
- Mobile bottom-tab polish beyond wiring the correct five/four destinations (full raised Check-in tab can follow in the same plan if cheap).
- Changing backend RBAC enforcement on domain APIs (already `RbacGuard` + row scope).
- Multi-language / LocaleSwitcher in shell (English-only product).

## Approach

**Shell capabilities API + role-variant sidebar** (chosen over per-role Next.js layout trees or frontend-only filtering).

---

## 1. API: `GET /api/v1/me/shell`

Authenticated. Response envelope `{ data, meta, errors }`.

### `data` shape

```ts
{
  roles: PolarisRoleCode[];
  primaryLayout:
    | 'employee'
    | 'manager'
    | 'people_ops'
    | 'finance'
    | 'contractor'
    | 'admin';
  homePath: string;
  /** Other layouts the user may switch into (multi-role). Empty for single-role users. */
  secondaryLayouts: Array<{
    layout: 'employee' | 'manager' | 'people_ops' | 'finance' | 'contractor' | 'admin';
    homePath: string;
    labelKey: string;
  }>;
  modules: Array<{
    id: string;       // stable key, e.g. 'workers', 'leave', 'hub'
    href: string;
    group: string;    // i18n section key, e.g. 'primary' | 'people_ops' | 'more'
    labelKey: string; // frontend translation key under AppSidebar
  }>;
  setup: {
    showCard: boolean;      // true when role may setup AND !isComplete
    completedSteps: number;
    totalSteps: number;
    isComplete: boolean;
    href: '/admin/setup';
  } | null;
}
```

### Layout priority (first match)

`super_admin` | `it_admin` → `admin`  
→ `people_ops` | `hrbp` → `people_ops`  
→ `finance` → `finance`  
→ `manager` | `division_head` → `manager`  
→ `contractor` → `contractor`  
→ default `employee`

### Module lists (server-authored)

| Layout | Top-level destinations | Notes |
|---|---|---|
| employee / manager | Home, Calendar, Hub, Me; **More** group: leave, policies, documents, performance, help (Phase 1). Expenses, travel, payslips only when those modules are enabled for the tenant / phase | Leave/expenses/etc. never top-level (UX §4.1) |
| contractor | Home, Invoices, Documents, Me | No Check-in |
| people_ops / admin | Grouped: Workers, Pre-boarding, Onboarding, Separations, Policies, Leave admin, Documents/register, Templates, Letterheads, Performance…, **Setup** | Phase 2 modules omitted unless role warrants |
| finance | Pay runs, Benefits, Statutory rates, Contractor payments, FX | Only for finance / super_admin |

Multi-role users get one `primaryLayout`. `secondaryLayouts` drives a single “Switch workspace” control under More / Settings — not a merged mega-nav. Switching is client-side navigation to that layout’s `homePath` (shell refetch optional if we later support sticky layout preference; v1 = navigate only).

### Setup field

Reuse existing `SetupWizardService` state.  
`setup === null` when the caller lacks People Ops / Admin / Super Admin.  
`showCard === true` only when setup is incomplete.

### Replaces

`usePolarisNavAccess` and its four probe calls.

---

## 2. API: `GET /api/v1/me/search?q=`

Authenticated command-palette search. Role-scoped results.

### Query

- `q` optional (trim). Empty / length &lt; 2 → **browse mode**: return role-filtered `action` + `module` items only (no worker/hub/policy hits).
- Length ≥ 2 → full search across all sources below.
- Optional `limit` (default 20, max 50).

### Result item

```ts
{
  type: 'worker' | 'hub_item' | 'policy' | 'action' | 'module';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}
```

### Sources (v1)

| Type | Source | Scope |
|---|---|---|
| worker | org directory / workers search | row scope |
| hub_item | Hub inbox search (id/title) | own + for-me |
| policy | published policies the user may see | acknowledgement population |
| action | static action catalog filtered by roles (e.g. “Request leave”, “Open setup”) | role codes |
| module | intersection of query with `modules` from shell | same as shell |

No hits → empty `data[]` (UI shows empty state, not error). Never 4xx for “nothing found”.

---

## 3. Frontend shell

### `AppSidebar` / `AuthenticatedShell`

1. Fetch `/api/v1/me/shell` once per session (hook `usePolarisShell`, replace `usePolarisNavAccess`).
2. Render **only** returned modules by `group`. Skeleton while loading.
3. Employee/manager desktop: primary four + More expandable; Check-in button in top bar.
4. Admin layouts: section headers from `group`; persistent **Setup** item always present when `setup !== null`.
5. Setup **card** in footer when `setup.showCard`; progress from API; link to `setup.href`; hidden when complete.
6. Remove: fake 2/7 card, changelog link, CMS admin block, LocaleSwitcher, lock icons.

### ⌘K command dialog

- Affordance in sidebar + keyboard `Meta+K` / `Ctrl+K`.
- Dialog with search input; debounce ≥200ms; call `/api/v1/me/search`.
- Group results by `type`; navigate via `href` on select.
- Also list matching `modules` and role-allowed actions when query is short / empty (browse mode: show common actions + modules).

### Home redirect

- `/dashboard` and default post-login target → `homePath` from shell.
- Account surfaces (profile, security, sessions) live under **Me**, not as top-level primary peers of Hub.

| primaryLayout | homePath |
|---|---|
| employee / manager | `/employee/home` |
| people_ops / admin | `/people-ops/dashboard` |
| finance | `/finance/pay-runs` |
| contractor | `/contractor/dashboard` |

### i18n

All labels via `locales/en.json` only (`AppSidebar`, `CommandPalette`, `SetupWizard` as needed).

---

## 4. Compliance

- Authenticate every shell/search call.
- Authorise via existing role assignments + row scope on search sources.
- No new PII in client beyond what directory/Hub already return; do not surface compensation in search.
- Read-only endpoints — no `audit_log` required for GET shell/search.

Relevant flows: access control / directory (FLW-SEC / org directory patterns already in product).

---

## 5. Testing

| Layer | Cases |
|---|---|
| Backend unit | Layout priority matrix; modules filtered by role; setup null vs showCard |
| Backend unit/e2e | Search returns only in-scope workers; actions filtered by role |
| Frontend | Sidebar hides finance for employee; setup card disappears when complete |
| Frontend | ⌘K opens, queries API, navigates on select |
| E2E smoke | Login as People Ops → people-ops home + Setup; login as employee → employee nav only |

---

## 6. Implementation order

1. Backend `me/shell` (+ tests)  
2. Backend `me/search` (+ tests)  
3. Frontend `usePolarisShell` + rewrite `AppSidebar`  
4. Command palette UI wired to search  
5. `/dashboard` redirect + Me account links  
6. Setup card wired to real wizard progress  
7. Remove probes / starter-kit chrome  
8. Playwright smoke for two roles  

---

## Open decisions (resolved in brainstorm)

| Decision | Choice |
|---|---|
| Scope | Full shell overhaul |
| Setup UX | Real progress card + persistent Setup nav |
| Access source | Capabilities API (`/me/shell`) |
| Architecture | Approach 1 — shell API + role-variant sidebar |
| ⌘K | Full role-scoped search (not a dead stub) |
