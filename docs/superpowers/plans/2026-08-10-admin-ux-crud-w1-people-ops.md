# Admin UX + CRUD — W1 People Ops / Super Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Phase 0/1 People Ops and Super Admin UX + CRUD gaps: full worker profile, org structure APIs/UI, leave admin, policy publish + compliance, pre-boarding/separation create CTAs, audit export UI, roles admin, schema-gap profile APIs/UI — all tenant-scoped and RBAC-gated.

**Architecture:** Backend APIs first (TDD) for schema-gap and org CRUD; frontend screens use `PageHeader` + `EmptyState` CTAs + session-tenant APIs (no client `tenantId`, no hardcoded `org.ts` UUIDs). Hub/Phase2 shells are out of scope (W2/W3).

**Tech Stack:** NestJS 10, TypeORM, Jest; Next.js 16, PrimeReact, RHF+Zod, Vitest; English-only `en.json`.

**Depends on:** [2026-08-10-admin-ux-crud-w0-foundation-tenancy.md](./2026-08-10-admin-ux-crud-w0-foundation-tenancy.md) completed  
**Spec:** [../specs/2026-08-10-admin-ux-crud-coverage-design.md](../specs/2026-08-10-admin-ux-crud-coverage-design.md)  
**Matrix:** [../specs/2026-08-10-admin-coverage-matrix.md](../specs/2026-08-10-admin-coverage-matrix.md)

## Global Constraints

- Same as W0 plan Global Constraints
- Every new write path: set `tenantId` from `resolveTenantId(session)`; filter reads by it; cross-tenant negative test
- Replace `frontend/src/libs/constants/org.ts` usage with org admin APIs
- Country options from `country-config` API — never hard-code `PK`/`AE`/`SG` lists in new UI
- Hide mutate CTAs when role cannot mutate; server still enforces `@Roles`
- Conventional Commits scoped: `feat(core-hr):`, `feat(time-leave):`, `feat(documents):`, `feat(frontend):`, `test(…):`

## File map

| File | Responsibility |
|---|---|
| `backend/src/modules/core-hr/org-admin.controller.ts` | Divisions/departments/LE/office CRUD |
| `backend/src/modules/core-hr/org-admin.service.ts` | Tenant-scoped org mutations + list |
| `backend/src/modules/core-hr/dto/org-admin.dto.ts` | Create/update DTOs (no tenantId field) |
| `backend/src/modules/core-hr/worker-profile-extensions.*` | Bank/skills/employment-record nested APIs or extend worker service |
| `backend/src/modules/core-hr/dto/create-worker.dto.ts` | Add missing profile fields |
| `backend/src/modules/time-leave/leave-type-admin.*` | Leave type + holiday calendar admin CRUD |
| `backend/src/modules/compliance/role-assignment.*` | Role assignment admin API |
| `frontend/src/libs/api/org-admin.ts` | Org CRUD client |
| `frontend/src/libs/api/audit-log.ts` | Audit list + CSV |
| `frontend/src/libs/api/leave.ts` | Extend leave-type CRUD |
| `frontend/src/libs/api/policies.ts` | Create/publish helpers |
| `frontend/src/libs/api/pre-boarding.ts` | `createPreBoardingPacket` |
| `frontend/src/components/workers/WorkerForm.tsx` | Full profile fields + nested sections |
| `frontend/src/app/.../people-ops/org/page.tsx` | Org structure admin |
| `frontend/src/app/.../people-ops/audit/page.tsx` | Audit viewer |
| `frontend/src/app/.../people-ops/roles/page.tsx` | Role assignments |
| `frontend/src/app/.../people-ops/leave/page.tsx` | Replace stub |
| `frontend/src/app/.../people-ops/policies/page.tsx` | Publish + compliance |
| Shell catalog + `en.json` | Nav + copy |

---

### Task 1: Org structure admin API

**Files:**
- Create: `backend/src/modules/core-hr/org-admin.service.ts`
- Create: `backend/src/modules/core-hr/org-admin.controller.ts`
- Create: `backend/src/modules/core-hr/dto/org-admin.dto.ts`
- Create: `backend/src/modules/core-hr/__tests__/org-admin.service.spec.ts`
- Modify: `backend/src/modules/core-hr/core-hr.module.ts` (or equivalent module file) — register providers

**Interfaces:**
- Consumes: `resolveTenantId`, `DivisionEntity`, `DepartmentEntity`, `LegalEntityEntity`, `OfficeLocationEntity`, `AuditLogService`
- Produces:
  - `GET/POST/PATCH /api/v1/org/divisions`
  - `GET/POST/PATCH /api/v1/org/departments`
  - `GET/POST/PATCH /api/v1/org/legal-entities`
  - `GET/POST/PATCH /api/v1/org/office-locations`
  - Soft-deactivate via `PATCH` `isActive: false` where entity supports it; no hard delete unless entity already soft-deletes
  - All methods `(…, tenantId: string)`; DTOs must **not** include `tenantId`

- [ ] **Step 1: Failing test** — `listDivisions` calls repository with `{ where: { tenantId } }`

```typescript
it('lists divisions for tenant only', async () => {
  const find = jest.fn().mockResolvedValue([]);
  const service = new OrgAdminService(
    { find, create: jest.fn(), save: jest.fn() } as never,
    /* other repos mocked */,
    { append: jest.fn() } as never,
  );
  await service.listDivisions(DIGITARO_TENANT_ID);
  expect(find).toHaveBeenCalledWith(
    expect.objectContaining({ where: { tenantId: DIGITARO_TENANT_ID } }),
  );
});
```

- [ ] **Step 2: Run — expect FAIL** (service missing)

```bash
cd backend && pnpm exec jest src/modules/core-hr/__tests__/org-admin.service.spec.ts -v
```

- [ ] **Step 3: Implement service + DTOs + controller** with `@Roles(PeopleOps, SuperAdmin)` on mutates; list may include Manager if chart needs it — Prefer PO/SA only for admin list used by forms.

- [ ] **Step 4: Cross-tenant test** — create division under tenant A fixture id; `getDivision(id, OTHER_TENANT)` → NotFound/Forbidden

- [ ] **Step 5: Commit** `feat(core-hr): add tenant-scoped org structure admin APIs`

---

### Task 2: Org admin UI + kill hardcoded org.ts

**Files:**
- Create: `frontend/src/libs/api/org-admin.ts`
- Create: `frontend/src/app/[locale]/(auth)/people-ops/org/page.tsx`
- Modify: `frontend/src/components/workers/WorkerForm.tsx` — load divisions/LEs/offices/departments from org-admin API
- Modify: all imports of `@/libs/constants/org` — replace with API-backed hooks or props
- Delete or deprecate: `frontend/src/libs/constants/org.ts` (leave a re-export throw comment only if transitional; prefer delete after last usage)
- Modify: `backend/src/modules/shell/constants/shell-nav.catalog.ts` — add `org` nav item
- Modify: `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: Task 1 routes
- Produces: `listDivisions()`, `listDepartments()`, `listLegalEntities()`, `listOfficeLocations()`, create/patch helpers

- [ ] **Step 1: API client** via `apiRequest` in `libs/api/client.ts` pattern (read `workers.ts` for envelope unwrap)

- [ ] **Step 2: Org admin page** — `PageHeader` + tabs or sections for Divisions / Departments / Legal entities / Offices; DataTable + Dialog forms; EmptyState with CTA; loading `PageSkeleton` `table`

- [ ] **Step 3: WorkerForm** — `useEffect` load org options; remove `DIVISIONS` / `LEGAL_ENTITIES` constants

- [ ] **Step 4: Shell nav** — `{ id: 'org', href: '/people-ops/org', group: 'people_ops', labelKey: 'org_link' }` + `en.json` `Shell.org_link`

- [ ] **Step 5: Manual/typecheck** — form create worker still works with API options

- [ ] **Step 6: Commit** `feat(frontend): org admin UI and replace hardcoded org constants`

- [ ] **Step 7: Matrix** — mark divisions/departments/legal_entities/office_locations → `partial`/`ok` as appropriate

---

### Task 3: Worker profile completeness (DTO + form + archive)

**Files:**
- Modify: `backend/src/modules/core-hr/dto/create-worker.dto.ts`
- Modify: `backend/src/modules/core-hr/dto/update-worker.dto.ts`
- Modify: `backend/src/modules/core-hr/worker.service.ts` — map new fields; nested bank/skills/employment if separate endpoints preferred
- Create (if needed): nested endpoints under `/api/v1/workers/:id/bank-accounts`, `/skills`, `/employment-records`
- Modify: `frontend/src/components/workers/WorkerForm.tsx`
- Modify: `frontend/src/libs/api/workers.ts` — archive/delete helper if missing
- Modify: workers list/detail — Archive action
- Test: `worker.service.spec.ts` field persistence + tenant filter

**Interfaces:**
- DTO fields to add (match entity columns): `dateOfBirth`, `jobTitle`, `departmentId`, `managerId`, `officeLocationId`, `probationEndDate`, address fields, emergency contact fields, statutory `expiryDate` in statutory map or dedicated DTO
- Nested resources: bank accounts, skills, employment records — CRUD scoped by `worker.tenantId === tenantId`

- [ ] **Step 1: Failing test** — `create` persists `jobTitle` and `departmentId` for tenant

- [ ] **Step 2: Extend DTOs + service mapping**

- [ ] **Step 3: Nested APIs** for bank/skills/employment_records with tenant assert via parent worker

- [ ] **Step 4: WorkerForm sections** — Identity, Employment, Location/Address, Emergency, Statutory (+ expiry), Bank, Skills, Career history; progressive disclosure (tabs or Accordions)

- [ ] **Step 5: Archive UI** — confirm dialog → `DELETE` or existing soft-archive endpoint; StatusChip Archived

- [ ] **Step 6: Commit** `feat(core-hr): complete worker profile fields and archive UI`

---

### Task 4: Manager relationships, projects, delegations, routing, import UI

**Files:**
- Existing APIs under `/api/v1/org/manager-relationships` etc. (confirm paths in controllers)
- Create: `frontend/src/libs/api/org-relationships.ts` (or extend `org-admin.ts`)
- Modify: worker detail page — tabs for Manager relationships / Project assignments
- Create: `frontend/src/app/[locale]/(auth)/people-ops/approvals-config/page.tsx` — delegations + routing configs
- Create: import dialog on workers list using existing import APIs
- Modify: shell nav + `en.json`

- [ ] **Step 1: Confirm backend routes** with `rg "manager-relationships|project-assignments|approval-delegations|workers/import" backend/src`

- [ ] **Step 2: Clients + UI** with PageHeader, EmptyState CTAs, tenant-implicit APIs

- [ ] **Step 3: Tenant isolation tests** only if services still default tenant — align to `resolveTenantId`

- [ ] **Step 4: Commit** `feat(frontend): wire org relationship and worker import admin UIs`

- [ ] **Step 5: Matrix** — mark those API orphans → `ok`/`partial`

---

### Task 5: Leave admin (end stub)

**Files:**
- Create: `backend/src/modules/time-leave/leave-type-admin.service.ts` (+ controller or extend `leave.controller.ts`)
- Holiday calendar admin endpoints if missing (`holiday_calendars` / `holidays` CRUD)
- Modify: `frontend/src/libs/api/leave.ts`
- Modify: `frontend/src/app/[locale]/(auth)/people-ops/leave/page.tsx` — remove stub banner
- Modify: `en.json` LeaveAdmin strings
- Test: leave-type create filters tenant; cross-tenant deny

**Interfaces:**
- `POST/PATCH /api/v1/leave/types` (People Ops / SA)
- `GET/POST/PATCH /api/v1/calendars/holidays` or existing calendar admin paths — discover with rg; create if absent
- UI: leave types table + create/edit dialog; holiday calendar editor per country from config API

- [ ] **Step 1: Failing service test** for `createLeaveType(tenantId, dto)`

- [ ] **Step 2: Implement admin APIs + audit_log append**

- [ ] **Step 3: Replace leave page** — PageHeader, DataTable, EmptyState CTA, no stub Message

- [ ] **Step 4: Commit** `feat(time-leave): people ops leave type and holiday admin`

---

### Task 6: Policies publish + compliance dashboard UI

**Files:**
- Backend already has create/publish — verify tenant on `policy.service.ts`
- Modify: `frontend/src/libs/api/policies.ts` — `createPolicy`, `createVersion`, `publishPolicy`, `getComplianceDashboard`
- Modify: `frontend/src/app/[locale]/(auth)/people-ops/policies/page.tsx`
- Optional detail route: `people-ops/policies/[id]/page.tsx`
- `en.json` PoliciesAdmin keys

- [ ] **Step 1: Wire client methods** matching `policy.controller.ts` routes exactly

- [ ] **Step 2: UI** — list + Create + Publish actions; compliance table (who hasn’t acked) with division/country filters from org-admin + country-config

- [ ] **Step 3: EmptyState CTA** “Create policy”

- [ ] **Step 4: Commit** `feat(frontend): policy publish and compliance dashboard for people ops`

---

### Task 7: Pre-boarding create + separations initiate CTAs

**Files:**
- Modify: `frontend/src/libs/api/pre-boarding.ts` — add `createPreBoardingPacket`
- Modify: `frontend/src/app/[locale]/(auth)/people-ops/pre-boarding/page.tsx`
- Modify: `frontend/src/app/[locale]/(auth)/people-ops/separations/page.tsx` — wire existing `initiateSeparation`
- `en.json` empty CTA labels

- [ ] **Step 1: Client createPacket** → `POST /api/v1/pre-boarding` with body matching `CreatePreBoardingPacketDto`

- [ ] **Step 2: Pre-boarding EmptyState** `actionLabel` + dialog to create packet

- [ ] **Step 3: Separations EmptyState / header** — initiate dialog (worker picker from workers API)

- [ ] **Step 4: StatusTracker** already on detail — ensure create navigates to detail

- [ ] **Step 5: Commit** `feat(frontend): pre-boarding and separation create CTAs`

---

### Task 8: Audit log UI + CSV export

**Files:**
- Create: `frontend/src/libs/api/audit-log.ts`
- Create: `frontend/src/app/[locale]/(auth)/people-ops/audit/page.tsx`
- Modify: audit backend if CSV missing — add `GET /api/v1/audit-log/export` streaming CSV scoped by tenant
- Shell nav + `en.json`
- Test: export only includes `tenantId` rows

**Interfaces:**
- List already: `GET /api/v1/audit-log`
- Export: CSV columns aligned to US-COMP-001 (entity, action, actor, timestamp, field changes summary)

- [ ] **Step 1: Failing test** for export tenant filter (if adding export)

- [ ] **Step 2: Backend export endpoint** (or client-side CSV from paginated list if volume OK for Digitaro ~200 workers — prefer server export)

- [ ] **Step 3: Audit page** — filters, DataTable, Export button, PageHeader purpose, five states

- [ ] **Step 4: Commit** `feat(compliance): audit log people ops viewer and CSV export`

---

### Task 9: Role assignment admin UI

**Files:**
- Create: `backend/src/modules/compliance/role-assignment.controller.ts` + service (if no public CRUD)
- Create: `frontend/src/libs/api/roles.ts`
- Create: `frontend/src/app/[locale]/(auth)/people-ops/roles/page.tsx`
- Super Admin only for mutate; People Ops read optional per PRD §5
- Shell nav + `en.json`
- Test: assignment writes `tenantId`; cross-tenant deny

- [ ] **Step 1: Discover** existing role assignment code paths (`user_role_assignments`)

- [ ] **Step 2: API list/create/patch effective dating**

- [ ] **Step 3: UI table + assign dialog** (user + role + effective_from/to)

- [ ] **Step 4: Commit** `feat(compliance): role assignment admin API and UI`

---

### Task 10: Setup wizard edit surfaces (thin → usable)

**Files:**
- Modify: `frontend/src/components/setup/SetupWizard.tsx` (+ step subcomponents if split)
- Backend setup-wizard already saves — ensure holiday/leave/employment-matrix steps have real editors calling country-config / leave-type-admin / org APIs
- `en.json` setup strings

- [ ] **Step 1: Inventory steps** that are display-only

- [ ] **Step 2: For holidays, leave types, employment×country** — embed editors reusing Task 5 / config APIs

- [ ] **Step 3: Commit** `feat(frontend): deepen setup wizard country and leave edit steps`

---

### Task 11: Legal entity extensions UI (mappings, currencies, signatories)

**Files:**
- Extend org-admin APIs for LE child tables
- UI: on Legal entity detail drawer/page — tabs for mappings, currencies, signatories
- Tests: tenant denormalised on children; parent LE must same tenant

- [ ] **Step 1: APIs + tests**

- [ ] **Step 2: UI tabs**

- [ ] **Step 3: Commit** `feat(core-hr): legal entity mappings currencies and signatories admin`

- [ ] **Step 4: Matrix** update schema-gap LE rows → `ok`

---

### Task 12: W1 story gate + matrix closure

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-admin-coverage-matrix.md`
- Modify: `docs/generated/tasks.md` — setup wizard UI, schema-gap API/UI wiring notes
- Manual checklist against stories: US-HR-001/002/003, US-CFG-001, US-DOC-001/002/005, US-TAL-001/002/005, US-COMP-001, US-AUTH-003

- [ ] **Step 1: Walk matrix** — no Phase 0 W1-target row left as `orphan` without justification

- [ ] **Step 2: Smoke** People Ops: create worker (full fields), create leave type, publish policy, create pre-boarding, initiate separation, view audit export, assign role, edit org

- [ ] **Step 3: Commit** `docs(admin): close W1 coverage matrix and story gate notes`

---

## Self-review (this plan)

| Check | Result |
|---|---|
| Spec W1 coverage | Worker, org, leave, policies, pre-board/sep, audit, roles, setup, schema-gap LE/profile — tasked |
| Tenancy | Every task requires session tenant + isolation test on new writes |
| Out of scope | Hub actions (W2), Phase2 shell polish (W3), CMS remove (W5), evidence CCM catalogue |

## Execution handoff

**Plan complete and saved to:**

- `docs/superpowers/plans/2026-08-10-admin-ux-crud-w0-foundation-tenancy.md`
- `docs/superpowers/plans/2026-08-10-admin-ux-crud-w1-people-ops.md`

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute in this session with executing-plans checkpoints  

**Start with W0 plan first.** W2–W5 plans are written after W1 gate.

Which approach?
