# RBAC App Shell & Role-Aware Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a role-variant authenticated shell (sidebar, mobile tabs, home redirect, real setup card, full ⌘K search) driven by `GET /api/v1/me/shell` and `GET /api/v1/me/search`.

**Architecture:** New NestJS `shell` module resolves Polaris role codes via `RbacService`, maps them to a primary layout + module catalog, attaches setup progress from `SetupWizardService`, and aggregates role-scoped search (directory, Hub, policies, actions, modules). Frontend replaces probe-based `usePolarisNavAccess` with `usePolarisShell` and rewrites `AppSidebar` / `MobileTabBar` / dashboard redirect to render only server-authored modules.

**Tech Stack:** NestJS 10, TypeORM, Jest; Next.js 16, PrimeReact `Dialog`, Lucide, next-intl, Vitest/Playwright.

**Spec:** `docs/superpowers/specs/2026-08-04-rbac-shell-nav-design.md`  
**UX:** `docs/design-specs/ux-design-specs.md` §4.1–4.4  
**FLW:** existing RBAC / directory access patterns (read-only GETs; no audit_log)

## Global Constraints

- API base `/api/v1/`, envelope `{ data, meta, errors }`
- Auth: Better Auth session + `AuthGuard`; roles from `user_role_assignments` via `RbacService.getAuthContext`
- English only — edit `frontend/src/locales/en.json` only; no `ar.json`/`fr.json`; no LocaleSwitcher in shell
- Lucide icons only; no emoji
- Country rules never hard-coded (`if country === 'PK'`)
- Inaccessible nav items are **absent**, never lock-icon placeholders
- Phase 2 finance/payslip/expense links only for finance/super_admin (or when catalog includes them)
- Conventional Commits: `feat(shell): …`

---

## File map

### Backend create

| File | Responsibility |
|---|---|
| `backend/src/modules/shell/shell.module.ts` | Wire controller + services; import Compliance, CountryConfig, CoreHr, Operations, Documents |
| `backend/src/modules/shell/enums/shell-layout.enum.ts` | `ShellLayout` enum |
| `backend/src/modules/shell/types/shell.type.ts` | `ShellPayload`, `ShellModuleItem`, `ShellSetup`, `ShellSearchHit`, `SecondaryLayout` |
| `backend/src/modules/shell/constants/shell-nav.catalog.ts` | Static module catalogs per layout + action catalog |
| `backend/src/modules/shell/shell-layout.util.ts` | Pure: roleCodes → primaryLayout, homePath, secondaryLayouts |
| `backend/src/modules/shell/shell.service.ts` | `getShell(userId)` |
| `backend/src/modules/shell/shell-search.service.ts` | `search(userId, q, limit)` |
| `backend/src/modules/shell/shell.controller.ts` | `GET me/shell`, `GET me/search` |
| `backend/src/modules/shell/dto/shell-search-query.dto.ts` | `q?`, `limit?` |
| `backend/src/modules/shell/__tests__/shell-layout.util.spec.ts` | Layout priority tests |
| `backend/src/modules/shell/__tests__/shell.service.spec.ts` | Shell + setup card tests |
| `backend/src/modules/shell/__tests__/shell-search.service.spec.ts` | Search scoping tests |

### Backend modify

| File | Change |
|---|---|
| `backend/src/modules/polaris.module.ts` | Import/export `ShellModule` |
| `docs/project-requirements/api-specification.md` | Document `GET /me/shell`, `GET /me/search` |

### Frontend create

| File | Responsibility |
|---|---|
| `frontend/src/libs/api/shell.ts` | Types + `getShell()`, `searchShell()` |
| `frontend/src/libs/hooks/usePolarisShell.ts` | Session-scoped shell fetch |
| `frontend/src/components/nav/shell-nav.icons.ts` | `id → LucideIcon` map |
| `frontend/src/components/nav/CommandPalette.tsx` | ⌘K dialog + search |
| `frontend/src/components/nav/ShellSetupCard.tsx` | Real progress card |
| `frontend/tests/e2e/shell-nav.e2e.ts` | Role smoke (if auth fixtures exist; else document manual) |

### Frontend modify

| File | Change |
|---|---|
| `frontend/src/components/AppSidebar.tsx` | Render from shell modules only; wire setup + ⌘K |
| `frontend/src/components/AuthenticatedShell.tsx` | Top-bar Check-in for employee/manager; CommandPalette host |
| `frontend/src/components/nav/MobileTabBar.tsx` | Layout-aware tabs from shell |
| `frontend/src/app/[locale]/(auth)/dashboard/page.tsx` | Redirect to `homePath` |
| `frontend/src/components/auth/SignInForm.tsx` | Keep `/dashboard` as bounce (redirect resolves home) |
| `frontend/src/locales/en.json` | CommandPalette + cleanup stale CMS/tour keys |
| Delete or stop using: `frontend/src/libs/hooks/usePolarisNavAccess.ts` | Replace all imports |

---

### Task 1: Shell layout util + nav catalog (pure)

**Files:**
- Create: `backend/src/modules/shell/enums/shell-layout.enum.ts`
- Create: `backend/src/modules/shell/types/shell.type.ts`
- Create: `backend/src/modules/shell/constants/shell-nav.catalog.ts`
- Create: `backend/src/modules/shell/shell-layout.util.ts`
- Test: `backend/src/modules/shell/__tests__/shell-layout.util.spec.ts`

**Interfaces:**
- Consumes: `PolarisRoleCode` from `@/modules/compliance/enums/polaris-role-code.enum`
- Produces:
  - `resolveShellLayout(roleCodes: string[]): { primaryLayout: ShellLayout; homePath: string; secondaryLayouts: SecondaryLayout[] }`
  - `modulesForLayout(layout: ShellLayout): ShellModuleItem[]`
  - `actionsForRoles(roleCodes: string[]): ShellSearchHit[]` (type `action`)

- [ ] **Step 1: Write failing tests**

```typescript
// backend/src/modules/shell/__tests__/shell-layout.util.spec.ts
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ShellLayout } from '../enums/shell-layout.enum';
import { resolveShellLayout, modulesForLayout } from '../shell-layout.util';

describe('resolveShellLayout', () => {
  it('prefers admin over people_ops', () => {
    const r = resolveShellLayout([
      PolarisRoleCode.PEOPLE_OPS,
      PolarisRoleCode.SUPER_ADMIN,
    ]);
    expect(r.primaryLayout).toBe(ShellLayout.ADMIN);
    expect(r.homePath).toBe('/people-ops/dashboard');
    expect(r.secondaryLayouts.some((s) => s.layout === ShellLayout.PEOPLE_OPS)).toBe(true);
  });

  it('maps employee-only to employee home', () => {
    const r = resolveShellLayout([PolarisRoleCode.EMPLOYEE]);
    expect(r.primaryLayout).toBe(ShellLayout.EMPLOYEE);
    expect(r.homePath).toBe('/employee/home');
    expect(r.secondaryLayouts).toEqual([]);
  });

  it('maps contractor before falling through to employee', () => {
    const r = resolveShellLayout([PolarisRoleCode.CONTRACTOR]);
    expect(r.primaryLayout).toBe(ShellLayout.CONTRACTOR);
    expect(r.homePath).toBe('/contractor/dashboard');
  });

  it('defaults unknown/empty roles to employee', () => {
    expect(resolveShellLayout([]).primaryLayout).toBe(ShellLayout.EMPLOYEE);
  });
});

describe('modulesForLayout', () => {
  it('keeps employee primary destinations short (no leave top-level)', () => {
    const mods = modulesForLayout(ShellLayout.EMPLOYEE);
    const primary = mods.filter((m) => m.group === 'primary').map((m) => m.id);
    expect(primary).toEqual(
      expect.arrayContaining(['home', 'calendar', 'hub', 'me']),
    );
    expect(primary).not.toContain('leave');
    expect(mods.some((m) => m.id === 'leave' && m.group === 'more')).toBe(true);
  });

  it('includes setup for people_ops', () => {
    const mods = modulesForLayout(ShellLayout.PEOPLE_OPS);
    expect(mods.some((m) => m.id === 'setup' && m.href === '/admin/setup')).toBe(
      true,
    );
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd backend && pnpm exec jest src/modules/shell/__tests__/shell-layout.util.spec.ts --no-cache
```

Expected: FAIL (module not found / cannot resolve)

- [ ] **Step 3: Implement enum, types, catalog, util**

```typescript
// enums/shell-layout.enum.ts
export enum ShellLayout {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  PEOPLE_OPS = 'people_ops',
  FINANCE = 'finance',
  CONTRACTOR = 'contractor',
  ADMIN = 'admin',
}

// types/shell.type.ts — match design spec shapes exactly:
// ShellModuleItem { id, href, group, labelKey }
// SecondaryLayout { layout, homePath, labelKey }
// ShellSetup { showCard, completedSteps, totalSteps, isComplete, href }
// ShellPayload { roles, primaryLayout, homePath, secondaryLayouts, modules, setup }
// ShellSearchHit { type, id, title, subtitle?, href }

// shell-layout.util.ts priority (first match):
// SUPER_ADMIN | IT_ADMIN → ADMIN, home /people-ops/dashboard
// PEOPLE_OPS | HRBP → PEOPLE_OPS, home /people-ops/dashboard
// FINANCE → FINANCE, home /finance/pay-runs
// MANAGER | DIVISION_HEAD → MANAGER, home /employee/home
// CONTRACTOR → CONTRACTOR, home /contractor/dashboard
// else EMPLOYEE, home /employee/home
//
// secondaryLayouts = every *other* layout the roleCodes would qualify for
// (re-run priority candidates excluding primary), with labelKey e.g. 'switch_people_ops'

// constants/shell-nav.catalog.ts — hand-authored lists:
// EMPLOYEE/MANAGER primary: home→/employee/home, calendar→/employee/calendar, hub→/hub, me→/employee/profile
// more: leave, policies, documents, directory, performance, help (Phase 1)
// CONTRACTOR: home, invoices, documents, me
// PEOPLE_OPS/ADMIN groups: people_ops (dashboard, workers, pre-boarding, onboarding, separations, policies, leave_admin, documents_register, templates, letterheads, performance, setup)
// FINANCE: pay_runs, benefits, statutory_rates, contractor_payments, fx
// Do NOT include starter-kit CMS routes
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && pnpm exec jest src/modules/shell/__tests__/shell-layout.util.spec.ts --no-cache
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/shell
git commit -m "$(cat <<'EOF'
feat(shell): add layout resolver and nav catalog

EOF
)"
```

---

### Task 2: `ShellService.getShell` + controller

**Files:**
- Create: `backend/src/modules/shell/shell.service.ts`
- Create: `backend/src/modules/shell/shell.controller.ts`
- Create: `backend/src/modules/shell/shell.module.ts`
- Modify: `backend/src/modules/polaris.module.ts`
- Test: `backend/src/modules/shell/__tests__/shell.service.spec.ts`

**Interfaces:**
- Consumes: `RbacService.getAuthContext`, `SetupWizardService.getState`, `resolveShellLayout`, `modulesForLayout`, `SETUP_WIZARD_STEP_ORDER`
- Produces: `ShellService.getShell(userId: string, tenantId?: string): Promise<ShellPayload>`
- HTTP: `GET /api/v1/me/shell` → `{ data: ShellPayload, meta: {}, errors: [] }` (or project’s existing transform interceptor pattern — match sibling controllers)

- [ ] **Step 1: Write failing service tests**

```typescript
describe('ShellService.getShell', () => {
  it('returns employee modules and null setup for employee-only', async () => {
    rbac.getAuthContext.mockResolvedValue({
      roleCodes: [PolarisRoleCode.EMPLOYEE],
      assignments: [],
      tenantId: DIGITARO_TENANT_ID,
      userId: 'u1',
      broadestScope: 'own',
    });
    const shell = await service.getShell('u1');
    expect(shell.setup).toBeNull();
    expect(shell.primaryLayout).toBe(ShellLayout.EMPLOYEE);
    expect(shell.modules.every((m) => m.href.startsWith('/') )).toBe(true);
    expect(setupWizard.getState).not.toHaveBeenCalled();
  });

  it('attaches setup card when people_ops and wizard incomplete', async () => {
    rbac.getAuthContext.mockResolvedValue({
      roleCodes: [PolarisRoleCode.PEOPLE_OPS],
      /* … */
    });
    setupWizard.getState.mockResolvedValue({
      progress: {
        completedSteps: ['organisation', 'legal_entities'],
        skippedSteps: [],
        isComplete: false,
      },
      steps: Array.from({ length: 10 }, (_, i) => ({
        isComplete: i < 2,
        isSkipped: false,
      })),
      summary: {},
    });
    const shell = await service.getShell('u1');
    expect(shell.setup).toEqual({
      showCard: true,
      completedSteps: 2,
      totalSteps: 10, // SETUP_WIZARD_STEP_ORDER.length
      isComplete: false,
      href: '/admin/setup',
    });
    expect(shell.modules.some((m) => m.id === 'setup')).toBe(true);
  });

  it('hides setup card when wizard complete but keeps setup module', async () => {
    setupWizard.getState.mockResolvedValue({
      progress: { completedSteps: [/* all */], skippedSteps: [], isComplete: true },
      steps: Array.from({ length: 10 }, () => ({ isComplete: true, isSkipped: false })),
      summary: {},
    });
    const shell = await service.getShell('u1');
    expect(shell.setup?.showCard).toBe(false);
    expect(shell.setup?.isComplete).toBe(true);
    expect(shell.modules.some((m) => m.id === 'setup')).toBe(true);
  });
});
```

Use Nest `Test.createTestingModule` with mocked `RbacService` + `SetupWizardService` (same style as `rbac.guard.spec.ts` / setup-wizard specs).

- [ ] **Step 2: Run — expect FAIL**

```bash
cd backend && pnpm exec jest src/modules/shell/__tests__/shell.service.spec.ts --no-cache
```

- [ ] **Step 3: Implement service + controller + module**

```typescript
// shell.service.ts (core logic)
async getShell(userId: string, tenantId = DIGITARO_TENANT_ID): Promise<ShellPayload> {
  const auth = await this.rbacService.getAuthContext(userId, tenantId);
  const { primaryLayout, homePath, secondaryLayouts } = resolveShellLayout(auth.roleCodes);
  const modules = modulesForLayout(primaryLayout);

  const canSetup = auth.roleCodes.some((c) =>
    [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN, PolarisRoleCode.IT_ADMIN, PolarisRoleCode.HRBP]
      .includes(c as PolarisRoleCode),
  );

  let setup: ShellSetup | null = null;
  if (canSetup) {
    const state = await this.setupWizardService.getState(tenantId);
    const totalSteps = SETUP_WIZARD_STEP_ORDER.length;
    const completedSteps = state.steps.filter((s) => s.isComplete || s.isSkipped).length;
    setup = {
      showCard: !state.progress.isComplete,
      completedSteps,
      totalSteps,
      isComplete: state.progress.isComplete,
      href: '/admin/setup',
    };
  }

  return {
    roles: auth.roleCodes as PolarisRoleCode[],
    primaryLayout,
    homePath,
    secondaryLayouts,
    modules,
    setup,
  };
}

// shell.controller.ts
@ApiTags('me')
@Controller({ path: 'me', version: '1' })
@UseGuards(AuthGuard)
export class ShellController {
  constructor(private readonly shellService: ShellService) {}

  @Get('shell')
  @ApiOperation({ summary: 'Role-aware shell capabilities for nav + home' })
  async getShell(@CurrentUserSession() session: CurrentUserSession) {
    return this.shellService.getShell(session.user.id);
  }
}

// shell.module.ts imports: ComplianceModule, CountryConfigModule
// providers: ShellService; controllers: ShellController
// (search service added in Task 3)
```

Register in `polaris.module.ts` imports + exports.

Match response wrapping used by other v1 controllers (if they return the entity directly and an interceptor wraps it, do the same — do not invent a second envelope).

- [ ] **Step 4: Run tests — PASS**

```bash
cd backend && pnpm exec jest src/modules/shell/__tests__/shell.service.spec.ts --no-cache
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/shell backend/src/modules/polaris.module.ts
git commit -m "$(cat <<'EOF'
feat(shell): add GET /api/v1/me/shell capabilities endpoint

EOF
)"
```

---

### Task 3: `GET /api/v1/me/search`

**Files:**
- Create: `backend/src/modules/shell/shell-search.service.ts`
- Create: `backend/src/modules/shell/dto/shell-search-query.dto.ts`
- Modify: `backend/src/modules/shell/shell.controller.ts`
- Modify: `backend/src/modules/shell/shell.module.ts` (import CoreHrModule, OperationsModule, DocumentsModule)
- Test: `backend/src/modules/shell/__tests__/shell-search.service.spec.ts`

**Interfaces:**
- Consumes: `OrgService.getDirectory`, `HubService.getInbox`, `PolicyService.list`, `resolveShellLayout` + catalogs, `RbacService`
- Produces: `search(userId, q: string, limit: number): Promise<ShellSearchHit[]>`
- HTTP: `GET /api/v1/me/search?q=&limit=`

- [ ] **Step 1: Write failing tests**

```typescript
describe('ShellSearchService.search', () => {
  it('browse mode (empty q) returns only action + module hits', async () => {
    const hits = await service.search('u1', '', 20);
    expect(hits.every((h) => h.type === 'action' || h.type === 'module')).toBe(true);
    expect(org.getDirectory).not.toHaveBeenCalled();
  });

  it('full search includes scoped workers', async () => {
    org.getDirectory.mockResolvedValue({
      data: [{ id: 'w1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }],
      meta: { page: 1, limit: 10, total: 1 },
      errors: [],
    });
    // stub hub + policies similarly — map title from `${firstName} ${lastName}`
    const hits = await service.search('u1', 'ada', 20);
    expect(hits.some((h) => h.type === 'worker' && h.href.includes('w1'))).toBe(true);
  });

  it('filters action catalog by role (no setup action for employee)', async () => {
    rbac.getAuthContext.mockResolvedValue({ roleCodes: [PolarisRoleCode.EMPLOYEE], /*…*/ });
    const hits = await service.search('u1', '', 50);
    expect(hits.some((h) => h.id === 'action:setup')).toBe(false);
  });
});
```

Inspect `DirectoryEntry` / `HubItem` / policy entity fields in code and map `title`/`href` accurately (worker href: `/employee/directory` or people-ops worker profile if people_ops — use `/people-ops/workers/{id}` when layout is people_ops/admin else directory search deep-link `/employee/directory?q=`).

- [ ] **Step 2: Run — FAIL**

```bash
cd backend && pnpm exec jest src/modules/shell/__tests__/shell-search.service.spec.ts --no-cache
```

- [ ] **Step 3: Implement**

```typescript
// dto
export class ShellSearchQueryDto {
  @StringFieldOptional()
  q?: string;

  @NumberFieldOptional({ int: true, minimum: 1, maximum: 50 })
  limit?: number;
}

// shell-search.service.ts
async search(userId: string, qRaw: string, limit = 20, tenantId = DIGITARO_TENANT_ID) {
  const q = (qRaw ?? '').trim();
  const auth = await this.rbacService.getAuthContext(userId, tenantId);
  const { primaryLayout } = resolveShellLayout(auth.roleCodes);
  const modules = modulesForLayout(primaryLayout);
  const actions = actionsForRoles(auth.roleCodes);

  if (q.length < 2) {
    return [...actions, ...modules.map(moduleToHit)].slice(0, limit);
  }

  const [directory, inbox, policies] = await Promise.all([
    this.orgService.getDirectory({ q, page: 1, limit: Math.min(limit, 10) } as QueryDirectoryDto, userId, tenantId),
    this.hubService.getInbox(userId, { q, page: 1, limit: Math.min(limit, 10) } as QueryHubDto, tenantId),
    this.policyService.list(tenantId),
  ]);

  const workers = directory.data.map(/* → ShellSearchHit type worker */);
  const hubItems = [...inbox.data.mine, ...inbox.data.forMe]
    .filter((item) => matchesQuery(item, q))
    .map(/* → hub_item, href /hub */);
  const policyHits = policies
    .filter((p) => p.title?.toLowerCase().includes(q.toLowerCase()))
    .map(/* → policy, href /employee/policies or people-ops */);

  const moduleHits = modules.filter((m) => m.id.includes(q.toLowerCase()) || m.labelKey.includes(q.toLowerCase()));
  const actionHits = actions.filter((a) => a.title.toLowerCase().includes(q.toLowerCase()));

  return [...actionHits, ...moduleHits.map(moduleToHit), ...workers, ...hubItems, ...policyHits].slice(0, limit);
}
```

If `QueryHubDto` has no `q`, filter client-side in the service after `getInbox` (acceptable for Digitaro scale). Same for policies.

Add controller method:

```typescript
@Get('search')
@ApiOperation({ summary: 'Role-scoped command palette search' })
async search(
  @Query() query: ShellSearchQueryDto,
  @CurrentUserSession() session: CurrentUserSession,
) {
  return this.shellSearchService.search(
    session.user.id,
    query.q ?? '',
    query.limit ?? 20,
  );
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Document in api-specification.md** under a new `### Me (shell) — /api/v1/me` section with both endpoints.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/shell docs/project-requirements/api-specification.md
git commit -m "$(cat <<'EOF'
feat(shell): add GET /api/v1/me/search for command palette

EOF
)"
```

---

### Task 4: Frontend shell client + hook

**Files:**
- Create: `frontend/src/libs/api/shell.ts`
- Create: `frontend/src/libs/hooks/usePolarisShell.ts`
- Modify: remove usages of `usePolarisNavAccess` in a follow-up task; keep file until Task 5 deletes it

**Interfaces:**
- Produces:
  - `getShell(): Promise<{ data: ShellPayload }>`
  - `searchShell(q: string, limit?: number): Promise<{ data: ShellSearchHit[] }>`
  - `usePolarisShell(): { shell: ShellPayload | null; isLoading: boolean; error: Error | null; refetch: () => void }`

- [ ] **Step 1: Add API client**

```typescript
// frontend/src/libs/api/shell.ts
import { apiRequest } from '@/libs/api/client';

export type ShellLayout =
  | 'employee' | 'manager' | 'people_ops' | 'finance' | 'contractor' | 'admin';

export type ShellModuleItem = {
  id: string;
  href: string;
  group: string;
  labelKey: string;
};

export type ShellSetup = {
  showCard: boolean;
  completedSteps: number;
  totalSteps: number;
  isComplete: boolean;
  href: '/admin/setup';
};

export type ShellPayload = {
  roles: string[];
  primaryLayout: ShellLayout;
  homePath: string;
  secondaryLayouts: Array<{ layout: ShellLayout; homePath: string; labelKey: string }>;
  modules: ShellModuleItem[];
  setup: ShellSetup | null;
};

export type ShellSearchHit = {
  type: 'worker' | 'hub_item' | 'policy' | 'action' | 'module';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function getShell() {
  return apiRequest<ShellPayload>('/api/v1/me/shell');
}

export function searchShell(q: string, limit = 20) {
  return apiRequest<ShellSearchHit[]>('/api/v1/me/search', {
    params: { q, limit },
  });
}
```

- [ ] **Step 2: Implement hook** (mirror `usePolarisNavAccess` lifecycle: mount fetch, cancel on unmount, expose loading)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/libs/api/shell.ts frontend/src/libs/hooks/usePolarisShell.ts
git commit -m "$(cat <<'EOF'
feat(shell): add frontend shell API client and hook

EOF
)"
```

---

### Task 5: Rewrite `AppSidebar` + setup card

**Files:**
- Create: `frontend/src/components/nav/shell-nav.icons.ts`
- Create: `frontend/src/components/nav/ShellSetupCard.tsx`
- Modify: `frontend/src/components/AppSidebar.tsx` (major rewrite)
- Modify: `frontend/src/locales/en.json` (`AppSidebar` keys for groups `primary`, `more`, `people_ops`, `finance`, `switch_*`; update `tour_*` copy to setup language)
- Delete: `frontend/src/libs/hooks/usePolarisNavAccess.ts` after no references remain

**Interfaces:**
- Consumes: `usePolarisShell()`, `ShellSetupCard`, icon map by `module.id`
- Produces: sidebar that renders only `shell.modules` grouped by `group`

- [ ] **Step 1: Icon map** — map known ids (`home`, `hub`, `workers`, `setup`, …) to Lucide icons; fallback `Circle`

- [ ] **Step 2: `ShellSetupCard`**

```tsx
// Props: setup: ShellSetup; onNavigate?: () => void
// Link to setup.href; show t('setup_title') + t('setup_progress', { completed, total })
// Progress bar width = (completed/total)*100%
// Only rendered when setup.showCard === true (parent decides)
```

- [ ] **Step 3: Rewrite SidebarPanel**

Rules:
1. While `isLoading`, show 6 skeleton rows (no mega-nav flash).
2. Group modules by `group`; section label via `t(\`section_${group}\`)` when group !== `primary`.
3. Expandable **More** for `group === 'more'` (collapsed by default).
4. Footer: `ShellSetupCard` if `shell.setup?.showCard`; user menu **without** LocaleSwitcher / changelog / CMS.
5. Quick-actions button opens CommandPalette (Task 6) via callback/`onOpenCommandPalette` prop from shell.
6. Secondary layouts: one link each under More using `secondaryLayouts[].labelKey`.
7. Remove all hardcoded `peopleOpsNav` / `employeeNav` / lock icons / `isAdmin` CMS block.

- [ ] **Step 4: Grep and delete `usePolarisNavAccess`**

```bash
rg usePolarisNavAccess frontend
```

Expected: no hits; then delete the file.

- [ ] **Step 5: Manual smoke** — sign in as employee vs people_ops; confirm nav length differs.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/AppSidebar.tsx frontend/src/components/nav frontend/src/locales/en.json
git add -u frontend/src/libs/hooks/usePolarisNavAccess.ts
git commit -m "$(cat <<'EOF'
feat(shell): render AppSidebar from /me/shell capabilities

EOF
)"
```

---

### Task 6: Command palette (⌘K) with full search

**Files:**
- Create: `frontend/src/components/nav/CommandPalette.tsx`
- Modify: `frontend/src/components/AuthenticatedShell.tsx` (host open state + keyboard)
- Modify: `frontend/src/components/AppSidebar.tsx` (wire quick-actions button)
- Modify: `frontend/src/locales/en.json` — `CommandPalette` namespace

**Interfaces:**
- Consumes: `searchShell(q)`
- Produces: dialog open/close; navigate via `Link` / `router.push(href)`

- [ ] **Step 1: Implement `CommandPalette`**

Behavior:
- Controlled `open` / `onOpenChange`
- On open: call `searchShell('')` for browse mode (actions + modules)
- Input debounce 200ms; on change call `searchShell(q)`
- Group list by `type` with headings (People, Hub, Policies, Actions, Navigation)
- Arrow keys + Enter to select (or PrimeReact ListBox if already used elsewhere — prefer simple `<ul>` + button rows for speed)
- Empty state: `t('no_results')`
- Error + retry on API failure
- `useEffect` register `keydown` for `metaKey/ctrlKey + k` preventDefault → open

- [ ] **Step 2: Host in `AuthenticatedShell`**

```tsx
const [commandOpen, setCommandOpen] = useState(false);
// pass onOpenCommandPalette={() => setCommandOpen(true)} to AppSidebar
// <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
// For employee/manager layouts: sticky desktop top bar with Check-in Button linking to /employee/home#check-in or triggering existing check-in — if home already has the control, top-bar button can `Link` to `/employee/home` with aria-label Check in. Show only when shell.primaryLayout is employee|manager.
```

- [ ] **Step 3: Add en.json strings** (`title`, `placeholder`, `no_results`, `group_worker`, `group_hub_item`, …)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/nav/CommandPalette.tsx frontend/src/components/AuthenticatedShell.tsx frontend/src/components/AppSidebar.tsx frontend/src/locales/en.json
git commit -m "$(cat <<'EOF'
feat(shell): add role-scoped ⌘K command palette

EOF
)"
```

---

### Task 7: Home redirect + mobile tabs + Me account links

**Files:**
- Modify: `frontend/src/app/[locale]/(auth)/dashboard/page.tsx`
- Modify: `frontend/src/components/nav/MobileTabBar.tsx`
- Ensure Me / profile routes still reachable: `/employee/profile` (and dashboard security/sessions linked from Me page or More — add More items `security`→`/dashboard/security`, `sessions`→`/dashboard/sessions` in employee catalog if not present)

- [ ] **Step 1: Dashboard redirect (client or server)**

Preferred client pattern (needs shell):

```tsx
'use client';
export default function DashboardPage() {
  const { shell, isLoading } = usePolarisShell();
  const router = useRouter();
  useEffect(() => {
    if (shell?.homePath) router.replace(shell.homePath);
  }, [shell, router]);
  if (isLoading || !shell) return <Skeleton /*…*/ />;
  return null;
}
```

Keep locale via next-intl navigation (`useRouter` from `@/libs/I18nNavigation`).

- [ ] **Step 2: MobileTabBar from shell**

- If `primaryLayout` is `contractor`: Home, Invoices, Documents, Me
- If `people_ops` | `admin` | `finance`: hide bottom tab bar **or** show top-four from modules `group===primary` (prefer hide on `lg` already; on mobile for admin use hamburger-only — set `return null` when layout is people_ops|admin|finance to avoid wrong employee tabs)
- Else employee/manager: Home, Cal, Hub, Me (Check-in remains top-bar / home CTA for this plan; optional fifth raised tab can be a follow-up)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/[locale]/\(auth\)/dashboard/page.tsx frontend/src/components/nav/MobileTabBar.tsx backend/src/modules/shell/constants/shell-nav.catalog.ts
git commit -m "$(cat <<'EOF'
feat(shell): role home redirect and layout-aware mobile tabs

EOF
)"
```

---

### Task 8: Cleanup + verification

**Files:**
- `frontend/src/locales/en.json` — remove unused CMS/changelog keys if unused
- Spec status update: `docs/superpowers/specs/2026-08-04-rbac-shell-nav-design.md` → Status: Implemented (or leave until done)
- `docs/generated/tasks.md` — optional checkbox note under Phase 0/1 shell if an item exists; do not invent phase 2 work

- [ ] **Step 1: Backend test suite for shell**

```bash
cd backend && pnpm exec jest src/modules/shell --no-cache
```

Expected: all PASS

- [ ] **Step 2: Frontend typecheck**

```bash
cd frontend && pnpm check:types
```

Expected: PASS (fix any breakage from AppSidebar rewrite)

- [ ] **Step 3: Playwright smoke** (if auth helpers exist)

```typescript
// frontend/tests/e2e/shell-nav.e2e.ts
test('people ops does not see contractor invoices nav', async ({ page }) => {
  // use existing login helper
  await page.goto('/people-ops/dashboard');
  await expect(page.getByRole('navigation', { name: /main/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /workers/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /contractor invoices/i })).toHaveCount(0);
});
```

If no stable auth in CI, skip and record manual checklist in PR description.

- [ ] **Step 4: Manual checklist**

1. Employee: short sidebar; no People Ops; ⌘K finds self/directory; no setup card  
2. People Ops: HR modules + Setup; setup card shows real N/M; complete wizard → card hides, Setup nav remains  
3. `/dashboard` lands on role home  
4. No changelog / CMS / LocaleSwitcher in shell  

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(shell): verify RBAC shell nav and remove starter-kit chrome

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| `GET /me/shell` | 2 |
| Layout priority + secondaryLayouts | 1–2 |
| Module catalogs per layout | 1 |
| Real setup card + persistent Setup | 2, 5 |
| `GET /me/search` full + browse | 3, 6 |
| Hide inaccessible nav | 5 |
| Remove probes / placeholders | 5, 8 |
| Home redirect | 7 |
| Mobile layout-aware | 7 |
| English-only / no LocaleSwitcher | 5 |
| Tests | 1–3, 8 |

## Out of scope (do not expand)

- Sticky preferred-layout preference in DB  
- Full raised centre Check-in mobile tab (optional follow-up)  
- Rebuilding employee Today or People Ops dashboard widgets  
- CMS admin revival  
