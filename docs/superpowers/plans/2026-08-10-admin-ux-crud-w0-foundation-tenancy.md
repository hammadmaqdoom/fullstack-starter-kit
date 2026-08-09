# Admin UX + CRUD — W0 Foundation & W0b Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the screen contract, thin UI specs, living coverage matrix, and a single session-tenant resolution seam with isolation tests — so W1 CRUD cannot ship without tenant filters.

**Architecture:** Docs-first foundation (matrix + UI-spec stubs + screen contract). Backend tenancy consolidates on `resolveTenantId(session)` in `compliance/tenant-context.util.ts`, required `tenantId` on Polaris service entry points (starting with workers/org/audit), and a cross-tenant isolation Jest suite. Frontend gains a `PageHeader` purpose pattern and people-ops `RequireRole` layout shell (no CMS work yet).

**Tech Stack:** NestJS 10, TypeORM, Jest; Next.js 16, PrimeReact, Vitest; English-only `en.json`.

**Spec:** [../specs/2026-08-10-admin-ux-crud-coverage-design.md](../specs/2026-08-10-admin-ux-crud-coverage-design.md)  
**Matrix:** [../specs/2026-08-10-admin-coverage-matrix.md](../specs/2026-08-10-admin-coverage-matrix.md)  
**Next plan:** W1 People Ops (separate file after this plan completes)

## Global Constraints

- API `/api/v1/`, envelope `{ data, meta, errors }`
- Every mutation → `audit_log` with `tenantId`
- Tenancy: never accept client-supplied `tenantId`; resolve via `resolveTenantId(session)`; services take required `tenantId` (no silent default sprawl for new/changed methods)
- English only — `frontend/src/locales/en.json` only
- Lucide only; no `if (country === 'PK')`
- Conventional Commits: `docs(admin): …`, `feat(core-hr): …`, `feat(frontend): …`, `test(compliance): …`
- Spec is canonical — if plan and spec disagree, follow spec and update plan
- Do not implement W1 CRUD screens in this plan

## File map

| File | Responsibility |
|---|---|
| `docs/superpowers/specs/2026-08-10-admin-coverage-matrix.md` | Living coverage (already seeded; update during W0b) |
| `docs/design-specs/ui-specifications/shared-components.md` | Screen contract + shared primitives |
| `docs/design-specs/ui-specifications/people-ops.md` | Thin People Ops screen specs |
| `docs/design-specs/ui-specifications/manager.md` | Thin manager/Hub specs |
| `docs/design-specs/ui-specifications/admin-setup.md` | Setup + org + roles + audit |
| `docs/design-specs/ui-specifications/finance.md` | Finance five-state stubs |
| `backend/src/modules/compliance/tenant-context.util.ts` | Expand `resolveTenantId` + export helpers |
| `backend/src/modules/compliance/__tests__/tenant-isolation.spec.ts` | Cross-tenant deny tests |
| `backend/src/modules/core-hr/worker.service.ts` | Required `tenantId` (no default) |
| `backend/src/modules/core-hr/worker.controller.ts` | Pass `resolveTenantId(session)` |
| `backend/src/modules/core-hr/org.service.ts` / `org.controller.ts` | Same tenant seam |
| `backend/src/modules/compliance/audit-log.controller.ts` / service | Same tenant seam |
| `frontend/src/components/shared/PageHeader.tsx` | Title + purpose + optional primary action |
| `frontend/src/app/[locale]/(auth)/people-ops/layout.tsx` | `RequireRole` for people-ops capable roles |
| `frontend/src/locales/en.json` | PageHeader / layout copy keys |

---

### Task 1: Thin UI specification stubs

**Files:**
- Create: `docs/design-specs/ui-specifications/shared-components.md`
- Create: `docs/design-specs/ui-specifications/people-ops.md`
- Create: `docs/design-specs/ui-specifications/manager.md`
- Create: `docs/design-specs/ui-specifications/admin-setup.md`
- Create: `docs/design-specs/ui-specifications/finance.md`
- Modify: `docs/design-specs/ui-specifications/README.md` (confirm links resolve)

**Interfaces:**
- Produces: Screen contract text that Task 3 `PageHeader` and all later waves must follow

- [ ] **Step 1: Write** `shared-components.md` with sections:
  - Screen contract (purpose, primary action, five states, StatusTracker, English, no tenant picker)
  - `PageHeader`, `EmptyState`, `PageSkeleton`, `StatusTracker`, `StatusChip`, `RequireRole`, `AuthenticatedShell`
  - CTA rule: empty creatable lists must pass `actionLabel` + `onAction` to `EmptyState`

- [ ] **Step 2: Write** `people-ops.md` — one subsection per route in shell catalog + planned W1 surfaces (workers, leave admin, policies, pre-boarding, separations, audit, org, roles). For each: purpose one-liner, primary action, five-state notes, StatusTracker yes/no.

- [ ] **Step 3: Write** `manager.md` — Hub + cockpit + team calendar (actionable Hub cards).

- [ ] **Step 4: Write** `admin-setup.md` — setup wizard steps, org structure admin, roles, audit.

- [ ] **Step 5: Write** `finance.md` — thin five-state + RBAC notes for existing finance routes.

- [ ] **Step 6: Commit**

```bash
git add docs/design-specs/ui-specifications/
git commit -m "$(cat <<'EOF'
docs(ui-specs): add thin screen specs for admin UX coverage waves

EOF
)"
```

---

### Task 2: Expand tenant resolution seam + isolation test

**Files:**
- Modify: `backend/src/modules/compliance/tenant-context.util.ts`
- Create: `backend/src/modules/compliance/__tests__/tenant-isolation.spec.ts`
- Modify: `backend/src/modules/core-hr/worker.service.ts` (signature: required `tenantId`)
- Modify: `backend/src/modules/core-hr/worker.controller.ts`
- Modify: `backend/src/modules/core-hr/org.service.ts` + `org.controller.ts`
- Modify: `backend/src/modules/compliance/audit-log.service.ts` + `audit-log.controller.ts`
- Test: existing worker service specs if present — update call sites

**Interfaces:**
- Consumes: `DIGITARO_TENANT_ID`, auth session on controllers
- Produces:
  - `resolveTenantId(session?: { user?: { id?: string } }): string`
  - `assertSameTenant(expected: string, actual: string): void` throws `ForbiddenException` on mismatch
  - Worker/org/audit public methods: `tenantId: string` **required** (remove `= DIGITARO_TENANT_ID` defaults on changed methods)

- [ ] **Step 1: Write failing isolation test**

```typescript
// backend/src/modules/compliance/__tests__/tenant-isolation.spec.ts
import { ForbiddenException } from '@nestjs/common';
import { assertSameTenant, resolveTenantId } from '../tenant-context.util';
import { DIGITARO_TENANT_ID } from '../constants/tenant.constants';

const OTHER_TENANT = 'b0000000-0000-4000-8000-000000000099';

describe('tenant-context', () => {
  it('resolveTenantId returns Digitaro tenant in v1', () => {
    expect(resolveTenantId({ user: { id: 'u1' } })).toBe(DIGITARO_TENANT_ID);
  });

  it('assertSameTenant throws when tenants differ', () => {
    expect(() => assertSameTenant(DIGITARO_TENANT_ID, OTHER_TENANT)).toThrow(
      ForbiddenException,
    );
  });

  it('assertSameTenant allows matching tenant', () => {
    expect(() =>
      assertSameTenant(DIGITARO_TENANT_ID, DIGITARO_TENANT_ID),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** (missing `assertSameTenant`)

```bash
cd backend && pnpm exec jest src/modules/compliance/__tests__/tenant-isolation.spec.ts -v
```

Expected: FAIL — `assertSameTenant` not exported / not a function

- [ ] **Step 3: Implement util**

```typescript
// backend/src/modules/compliance/tenant-context.util.ts
import { ForbiddenException } from '@nestjs/common';
import { DIGITARO_TENANT_ID } from './constants/tenant.constants';

/**
 * Single seam for HTTP tenant resolution.
 * v1: Digitaro only. Later: derive from session membership.
 * Never accept client-supplied tenantId.
 */
export function resolveTenantId(_session?: { user?: { id?: string } }): string {
  return DIGITARO_TENANT_ID;
}

export function assertSameTenant(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new ForbiddenException('Tenant mismatch');
  }
}
```

- [ ] **Step 4: Re-run isolation test — expect PASS**

- [ ] **Step 5: Wire workers controller** — obtain session user; `const tenantId = resolveTenantId(session)`; pass `tenantId` into every `workerService.*` call. Remove default `tenantId = DIGITARO_TENANT_ID` from **public** worker service methods touched by the controller (keep private helpers coherent).

- [ ] **Step 6: Same for org + audit-log controllers/services**

- [ ] **Step 7: Fix unit tests** that called services without `tenantId`

```bash
cd backend && pnpm exec jest src/modules/core-hr src/modules/compliance --passWithNoTests
```

Expected: PASS

- [ ] **Step 8: Update matrix** — mark workers/org-read/audit API tenant filter as verified (still `partial`/`orphan` for UI where applicable)

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/compliance/tenant-context.util.ts \
  backend/src/modules/compliance/__tests__/tenant-isolation.spec.ts \
  backend/src/modules/core-hr/worker.service.ts \
  backend/src/modules/core-hr/worker.controller.ts \
  backend/src/modules/core-hr/org.service.ts \
  backend/src/modules/core-hr/org.controller.ts \
  backend/src/modules/compliance/audit-log.service.ts \
  backend/src/modules/compliance/audit-log.controller.ts \
  docs/superpowers/specs/2026-08-10-admin-coverage-matrix.md
git commit -m "$(cat <<'EOF'
feat(compliance): require session tenant on workers org and audit paths

EOF
)"
```

---

### Task 3: PageHeader + people-ops RequireRole layout

**Files:**
- Create: `frontend/src/components/shared/PageHeader.tsx`
- Create: `frontend/src/app/[locale]/(auth)/people-ops/layout.tsx`
- Modify: `frontend/src/locales/en.json` — add `PageHeader` / people-ops layout keys if needed
- Modify: one reference page (e.g. workers list) to use `PageHeader` as pattern example
- Test: optional Vitest for PageHeader render

**Interfaces:**
- Consumes: `RequireRole` from `frontend/src/components/shared/RequireRole.tsx`; `useRequireRole` roles that include people_ops / super_admin / hrbp (check `RequiredPolarisRole` union — use the union value that already treats SA/HRBP as people-ops-capable, or wrap with the correct role prop used elsewhere)
- Produces:

```typescript
type PageHeaderProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};
```

- [ ] **Step 1: Implement PageHeader**

```tsx
// frontend/src/components/shared/PageHeader.tsx
type PageHeaderProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, action, className = '' }: PageHeaderProps) {
  return (
    <div className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
```

- [ ] **Step 2: Create people-ops layout** mirroring finance layout pattern — wrap children in `RequireRole` with the people-ops-capable role. Read `frontend/src/app/[locale]/(auth)/finance/layout.tsx` and `useRequireRole` before choosing the exact `role` prop.

- [ ] **Step 3: Refactor** `people-ops/workers/page.tsx` (or `WorkerList` header) to use `PageHeader` with purpose description from `en.json` (`Workers.page_description`).

- [ ] **Step 4: Typecheck**

```bash
cd frontend && pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | head -50
```

Expected: no new errors in touched files

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shared/PageHeader.tsx \
  frontend/src/app/[locale]/\(auth\)/people-ops/layout.tsx \
  frontend/src/locales/en.json \
  frontend/src/app/[locale]/\(auth\)/people-ops/workers/
git commit -m "$(cat <<'EOF'
feat(frontend): add PageHeader and people-ops role layout gate

EOF
)"
```

---

### Task 4: Tenancy query sweep checklist (docs + critical fixes)

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-admin-coverage-matrix.md`
- Create: `docs/superpowers/specs/2026-08-10-tenant-query-sweep.md` (checklist results)
- Fix only **critical** Polaris module services found without tenant `where` on list/get that W1 will touch: `policy.service.ts`, `leave.service.ts`, `pre-boarding.service.ts`, `separation.service.ts` — pass `resolveTenantId` from their controllers if not already filtering

**Interfaces:**
- Produces: Sweep doc listing each service method: `ok` / `needs-fix` / `fixed-in-W0b`

- [ ] **Step 1: Grep** for default tenant patterns

```bash
cd backend && rg -n "DIGITARO_TENANT_ID|tenantId\\?:|tenantId = " src/modules --glob '*.service.ts' | head -80
```

- [ ] **Step 2: Record findings** in `2026-08-10-tenant-query-sweep.md`

- [ ] **Step 3: Fix controllers for policy, leave, pre-boarding, separation** to call `resolveTenantId(session)` and pass required `tenantId` (same pattern as workers). Prefer minimal signature changes; do not redesign modules.

- [ ] **Step 4: Add one service-level test** proving leave type list filters by tenantId (mock repo `find` called with `{ where: { tenantId } }`).

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(core-hr): close tenant filter gaps on W1-bound services

EOF
)"
```

---

### Task 5: W0 / W0b gate sign-off

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-admin-coverage-matrix.md`
- Modify: `docs/generated/tasks.md` — add a short “Admin UX coverage W0/W0b” checkbox section or tick related items

- [ ] **Step 1: Verify** UI-spec files exist and README links work
- [ ] **Step 2: Verify** isolation Jest passes
- [ ] **Step 3: Verify** people-ops layout blocks a non-people-ops role (manual or Playwright smoke if harness exists)
- [ ] **Step 4: Mark W0/W0b todos complete in Cursor plan; note “ready for W1 plan”
- [ ] **Step 5: Commit docs gate**

```bash
git add docs/superpowers/specs/docs/generated/tasks.md
git commit -m "$(cat <<'EOF'
docs(admin): mark W0 foundation and tenancy gate ready for W1

EOF
)"
```

---

## Self-review (this plan)

| Check | Result |
|---|---|
| Spec coverage | W0 screen contract, matrix, UI stubs, W0b tenancy seam + sweep — covered |
| Placeholders | None; W1 deferred to sibling plan |
| Type consistency | `resolveTenantId` / `assertSameTenant` named consistently |

**Out of scope here:** WorkerForm fields, leave CRUD, policy publish UI, org CRUD APIs, audit UI, CMS removal (W5), Hub actions (W2).
