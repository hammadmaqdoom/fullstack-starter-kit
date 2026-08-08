# Dual Auth + Dev Demo Role Testing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable email/password + Microsoft sign-in for every role, and add an idempotent local demo org so each Polaris persona can be smoke-tested without Entra.

**Architecture:** Keep Better Auth as the single session layer. Extend sign-in UX so password works for all users and Microsoft appears only when configured. Enable Better Auth account linking by email. Add a tracked TypeORM demo seed that creates credential users (via `hashPassword` from `better-auth/crypto`), RBAC assignments, workers, manager relationships, leave balances/requests, and a sample policy — Hub “for me” is derived from pending leave, not a separate inbox table.

**Tech Stack:** NestJS 10, TypeORM, typeorm-extension seeders, Better Auth (`better-auth/crypto`), Next.js 16, next-intl (`en.json` only), Vitest/Jest.

**Spec:** `docs/superpowers/specs/2026-08-08-dual-auth-demo-role-testing-design.md`

## Global Constraints

- API base `/api/v1/`, envelope `{ data, meta, errors }`
- Auth: Better Auth session; access via `user_role_assignments` + row scope — never from login provider alone
- English only — edit `frontend/src/locales/en.json` only; do not edit `ar.json` / `fr.json`
- Lucide icons only; no emoji
- No country hard-coding (`if country === 'PK'`) — resolve employment types / leave types from seeded config
- Demo seed: for local/dev use; do **not** hard-block in production (ops discipline)
- Conventional Commits: `feat(auth): …`, `feat(seed): …`, `docs(auth): …`

---

## File map

### Backend create

| File | Responsibility |
|---|---|
| `backend/src/modules/compliance/constants/demo-persona.constants.ts` | Demo emails, stable UUIDs, password constant, role/scope map |
| `backend/src/database/seeds/1783038400000-demo-org.seed.ts` | Idempotent demo users, accounts, roles, workers, relationships, leave, policy |

### Backend modify

| File | Change |
|---|---|
| `backend/src/config/auth/better-auth.config.ts` | Enable `accountLinking` for Microsoft ↔ credential by email |
| `backend/src/auth/entities/account.entity.ts` | Widen `providerId` beyond literal `'credential'` |
| `backend/package.json` | Add `seed:demo` script (runs typeorm-extension seed; document that demo seeder is part of `seed:run` once registered) |
| `backend/.env.example` | Comment: demo seed is local-only; optional note on Entra |

### Frontend create

| File | Responsibility |
|---|---|
| (none required beyond edits) | — |

### Frontend modify

| File | Change |
|---|---|
| `frontend/src/libs/Env.ts` | Optional `NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED` |
| `frontend/.env.example` (or project env docs) | Document the flag |
| `frontend/src/components/auth/SignInForm.tsx` | Password for all; Microsoft conditional; contractor keeps magic link |
| `frontend/src/locales/en.json` | Dual-auth copy under `SignIn` |

### Docs create

| File | Responsibility |
|---|---|
| `docs/superpowers/specs/2026-08-08-demo-accounts.md` | Credentials sheet + role smoke checklist |

---

### Task 1: Sign-in UX — dual path for everyone

**Files:**
- Modify: `frontend/src/libs/Env.ts`
- Modify: `frontend/src/components/auth/SignInForm.tsx`
- Modify: `frontend/src/locales/en.json` (`SignIn` keys only)
- Test: manual browser check (and optional Vitest if a SignInForm test already exists)

**Interfaces:**
- Consumes: `authClient.signIn.email`, `signInWithMicrosoft`, `sendContractorMagicLink` from `@/libs/BetterAuth`
- Produces: Sign-in screen where password works on employee tab; Microsoft only when `Env.NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED === 'true'`

- [ ] **Step 1: Add public Microsoft-enabled flag to Env**

In `frontend/src/libs/Env.ts`, extend the Zod schema and `createEnv` runtime env:

```typescript
NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED: z
  .enum(['true', 'false'])
  .optional()
  .default('false'),
```

Wire `process.env.NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED` into the env object the same way as other `NEXT_PUBLIC_*` keys.

Document in `frontend/.env.example` (create if missing) or README note:

```bash
# Set true only when backend ENTRA_CLIENT_ID + ENTRA_CLIENT_SECRET are configured
NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED=false
```

- [ ] **Step 2: Update `SignIn` English copy**

Replace the `SignIn` block in `frontend/src/locales/en.json` with dual-auth wording (keep existing keys that still apply; add/adjust):

```json
"SignIn": {
  "meta_title": "Sign in",
  "meta_description": "Sign in to your account.",
  "title": "Sign in",
  "subtitle": "Use email and password, or Microsoft when it is configured.",
  "employee_tab": "Staff",
  "contractor_tab": "Contractor",
  "employee_help": "Sign in with email and password. Microsoft is available when your organisation has connected Entra.",
  "microsoft_button": "Sign in with Microsoft",
  "microsoft_unavailable": "Microsoft sign-in is not configured in this environment.",
  "password_sign_in": "Sign in",
  "contractor_sign_in": "Sign in",
  "email_label": "Email",
  "email_placeholder": "you@example.com",
  "password_label": "Password",
  "password_placeholder": "Enter your password",
  "magic_link_button": "Email me a login link",
  "magic_link_sent": "Check your email for a sign-in link.",
  "signing_in": "Signing in...",
  "entra_error": "Microsoft sign-in is unavailable. Contact IT if this persists.",
  "contractor_error": "Sign in failed. Check your email and password.",
  "sign_in_error": "Sign in failed. Check your email and password.",
  "magic_link_error": "Could not send magic link.",
  "email_required": "Enter your email address first.",
  "forgot_password_link": "Forgot password?",
  "signup_prompt": "Have an invite?",
  "signup_link": "Create an account"
}
```

- [ ] **Step 3: Rewrite employee tab to include password + conditional Microsoft**

In `SignInForm.tsx`:

1. Import `Env` from `@/libs/Env`.
2. `const microsoftEnabled = Env.NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED === 'true';`
3. On the **staff** tab (`activeTab === 'employee'`), render the same email/password form as contractor (reuse `register` / `handleSubmit(onSubmit)`), with submit label `t('password_sign_in')`.
4. Below the password form, if `microsoftEnabled`, show the Microsoft button; else show a muted line with `t('microsoft_unavailable')` (no clickable dead button).
5. On the **contractor** tab, keep password form + magic link button.
6. Use `t('sign_in_error')` for password failures on both tabs (or keep `contractor_error` as alias — prefer one key).

Skeleton for staff tab body:

```tsx
{activeTab === 'employee' ? (
  <div className="space-y-4">
    <p className="text-sm text-gray-600">{t('employee_help')}</p>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* same email + password fields as contractor tab */}
      <button type="submit" disabled={isLoading} className="...">
        {isLoading ? t('signing_in') : t('password_sign_in')}
      </button>
    </form>
    {microsoftEnabled ? (
      <button type="button" onClick={handleMicrosoftSignIn} disabled={isLoading} className="...">
        {isLoading ? t('signing_in') : t('microsoft_button')}
      </button>
    ) : (
      <p className="text-sm text-gray-500">{t('microsoft_unavailable')}</p>
    )}
  </div>
) : (
  /* existing contractor form + magic link */
)}
```

- [ ] **Step 4: Manual verify**

Run frontend (`pnpm --dir frontend dev`) with `NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED` unset/false:

- Staff tab shows email/password and the “not configured” message (no Microsoft button).
- Contractor tab still has magic link.

Expected: UI matches; no TypeScript errors from Env.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/libs/Env.ts frontend/src/components/auth/SignInForm.tsx frontend/src/locales/en.json
git commit -m "$(cat <<'EOF'
feat(auth): allow email/password sign-in for all roles

Show Microsoft only when NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED is true.
EOF
)"
```

---

### Task 2: Account linking + account provider typing

**Files:**
- Modify: `backend/src/config/auth/better-auth.config.ts`
- Modify: `backend/src/auth/entities/account.entity.ts`
- Test: `backend/src/auth/__tests__/account-linking.config.spec.ts` (new lightweight unit test on exported options helper if easy; otherwise document manual check)

**Interfaces:**
- Consumes: existing `getConfig()` Better Auth options builder
- Produces: `accountLinking.enabled === true` with trusted Microsoft provider so OIDC can attach to an existing credential user with the same email

- [ ] **Step 1: Widen `providerId` type**

In `backend/src/auth/entities/account.entity.ts`, change:

```typescript
@Column({ type: 'varchar' })
providerId: string;
```

(Remove the `'credential'` literal so Microsoft accounts are valid TypeScript.)

- [ ] **Step 2: Enable account linking in Better Auth options**

In `getConfig()` return object in `better-auth.config.ts`, add (alongside `emailAndPassword` / `socialProviders`):

```typescript
accountLinking: {
  enabled: true,
  trustedProviders: ['microsoft'],
},
```

This allows a user who already has a `credential` account to sign in with Microsoft using the same email without creating a duplicate `user` row.

- [ ] **Step 3: Sanity check**

Confirm Microsoft social provider still only registers when `authConfig.entra?.clientId && authConfig.entra?.clientSecret` (existing conditional). Linking config must be present even when Entra is unset (no-op until Entra is configured).

- [ ] **Step 4: Commit**

```bash
git add backend/src/config/auth/better-auth.config.ts backend/src/auth/entities/account.entity.ts
git commit -m "$(cat <<'EOF'
feat(auth): enable Microsoft account linking by email

Widen account.providerId typing so credential and microsoft providers coexist.
EOF
)"
```

---

### Task 3: Demo persona constants

**Files:**
- Create: `backend/src/modules/compliance/constants/demo-persona.constants.ts`
- Test: `backend/src/modules/compliance/__tests__/demo-persona.constants.spec.ts`

**Interfaces:**
- Consumes: `PolarisRoleCode`, `ScopeType`, `SYSTEM_ROLES` ids via role codes
- Produces: `DEMO_PASSWORD`, `DEMO_PERSONAS[]` with stable ids used by the seed

- [ ] **Step 1: Write failing constant shape test**

```typescript
import {
  DEMO_PASSWORD,
  DEMO_PERSONAS,
} from '../constants/demo-persona.constants';
import { PolarisRoleCode } from '../enums/polaris-role-code.enum';

describe('DEMO_PERSONAS', () => {
  it('includes one account per required role plus second employee', () => {
    const emails = DEMO_PERSONAS.map((p) => p.email);
    expect(DEMO_PASSWORD).toBe('PolarisDemo!2026');
    expect(emails).toContain('employee.demo@digitaro.local');
    expect(emails).toContain('employee2.demo@digitaro.local');
    expect(emails).toContain('manager.demo@digitaro.local');
    expect(emails).toContain('contractor.demo@digitaro.local');
    expect(DEMO_PERSONAS.some((p) => p.roleCode === PolarisRoleCode.SUPER_ADMIN)).toBe(
      true,
    );
    expect(new Set(DEMO_PERSONAS.map((p) => p.userId)).size).toBe(
      DEMO_PERSONAS.length,
    );
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && pnpm test -- demo-persona.constants.spec.ts
```

Expected: FAIL (module missing).

- [ ] **Step 3: Implement constants**

```typescript
import { PolarisRoleCode } from '../enums/polaris-role-code.enum';
import { ScopeType } from '../enums/scope-type.enum';

export const DEMO_PASSWORD = 'PolarisDemo!2026';

export type DemoPersona = {
  key: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  userId: string;
  workerId: string;
  roleCode: PolarisRoleCode;
  scopeType: ScopeType;
  /** For division_head: Labs division id from org seed */
  scopeId: string | null;
  employeeNumber: string;
  countryCode: 'PK' | 'AE' | 'SG';
  employmentTypeCode: 'FULL_TIME' | 'CONTRACTOR';
  reportsToKey: string | null;
};

/** Stable UUIDs — do not change after first local DBs exist. */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    key: 'superadmin',
    email: 'superadmin.demo@digitaro.local',
    username: 'superadmin.demo',
    firstName: 'Super',
    lastName: 'Admin',
    userId: 'a1000000-0000-4000-8000-000000000001',
    workerId: 'a2000000-0000-4000-8000-000000000001',
    roleCode: PolarisRoleCode.SUPER_ADMIN,
    scopeType: ScopeType.ALL,
    scopeId: null,
    employeeNumber: 'DEMO-001',
    countryCode: 'PK',
    employmentTypeCode: 'FULL_TIME',
    reportsToKey: null,
  },
  {
    key: 'peopleops',
    email: 'peopleops.demo@digitaro.local',
    username: 'peopleops.demo',
    firstName: 'People',
    lastName: 'Ops',
    userId: 'a1000000-0000-4000-8000-000000000002',
    workerId: 'a2000000-0000-4000-8000-000000000002',
    roleCode: PolarisRoleCode.PEOPLE_OPS,
    scopeType: ScopeType.ALL,
    scopeId: null,
    employeeNumber: 'DEMO-002',
    countryCode: 'PK',
    employmentTypeCode: 'FULL_TIME',
    reportsToKey: null,
  },
  {
    key: 'hrbp',
    email: 'hrbp.demo@digitaro.local',
    username: 'hrbp.demo',
    firstName: 'HR',
    lastName: 'BP',
    userId: 'a1000000-0000-4000-8000-000000000003',
    workerId: 'a2000000-0000-4000-8000-000000000003',
    roleCode: PolarisRoleCode.HRBP,
    scopeType: ScopeType.COUNTRY,
    scopeId: null,
    employeeNumber: 'DEMO-003',
    countryCode: 'PK',
    employmentTypeCode: 'FULL_TIME',
    reportsToKey: null,
  },
  {
    key: 'itadmin',
    email: 'itadmin.demo@digitaro.local',
    username: 'itadmin.demo',
    firstName: 'IT',
    lastName: 'Admin',
    userId: 'a1000000-0000-4000-8000-000000000004',
    workerId: 'a2000000-0000-4000-8000-000000000004',
    roleCode: PolarisRoleCode.IT_ADMIN,
    scopeType: ScopeType.ALL,
    scopeId: null,
    employeeNumber: 'DEMO-004',
    countryCode: 'SG',
    employmentTypeCode: 'FULL_TIME',
    reportsToKey: null,
  },
  {
    key: 'finance',
    email: 'finance.demo@digitaro.local',
    username: 'finance.demo',
    firstName: 'Fin',
    lastName: 'Ance',
    userId: 'a1000000-0000-4000-8000-000000000005',
    workerId: 'a2000000-0000-4000-8000-000000000005',
    roleCode: PolarisRoleCode.FINANCE,
    scopeType: ScopeType.ALL,
    scopeId: null,
    employeeNumber: 'DEMO-005',
    countryCode: 'AE',
    employmentTypeCode: 'FULL_TIME',
    reportsToKey: null,
  },
  {
    key: 'divhead',
    email: 'divhead.demo@digitaro.local',
    username: 'divhead.demo',
    firstName: 'Division',
    lastName: 'Head',
    userId: 'a1000000-0000-4000-8000-000000000006',
    workerId: 'a2000000-0000-4000-8000-000000000006',
    roleCode: PolarisRoleCode.DIVISION_HEAD,
    scopeType: ScopeType.DIVISION,
    scopeId: 'd0000000-0000-4000-8000-000000000001', // Labs
    employeeNumber: 'DEMO-006',
    countryCode: 'PK',
    employmentTypeCode: 'FULL_TIME',
    reportsToKey: null,
  },
  {
    key: 'manager',
    email: 'manager.demo@digitaro.local',
    username: 'manager.demo',
    firstName: 'Team',
    lastName: 'Manager',
    userId: 'a1000000-0000-4000-8000-000000000007',
    workerId: 'a2000000-0000-4000-8000-000000000007',
    roleCode: PolarisRoleCode.MANAGER,
    scopeType: ScopeType.TEAM,
    scopeId: null,
    employeeNumber: 'DEMO-007',
    countryCode: 'PK',
    employmentTypeCode: 'FULL_TIME',
    reportsToKey: 'divhead',
  },
  {
    key: 'employee',
    email: 'employee.demo@digitaro.local',
    username: 'employee.demo',
    firstName: 'Emp',
    lastName: 'One',
    userId: 'a1000000-0000-4000-8000-000000000008',
    workerId: 'a2000000-0000-4000-8000-000000000008',
    roleCode: PolarisRoleCode.EMPLOYEE,
    scopeType: ScopeType.OWN,
    scopeId: null,
    employeeNumber: 'DEMO-008',
    countryCode: 'PK',
    employmentTypeCode: 'FULL_TIME',
    reportsToKey: 'manager',
  },
  {
    key: 'employee2',
    email: 'employee2.demo@digitaro.local',
    username: 'employee2.demo',
    firstName: 'Emp',
    lastName: 'Two',
    userId: 'a1000000-0000-4000-8000-000000000009',
    workerId: 'a2000000-0000-4000-8000-000000000009',
    roleCode: PolarisRoleCode.EMPLOYEE,
    scopeType: ScopeType.OWN,
    scopeId: null,
    employeeNumber: 'DEMO-009',
    countryCode: 'PK',
    employmentTypeCode: 'FULL_TIME',
    reportsToKey: 'manager',
  },
  {
    key: 'contractor',
    email: 'contractor.demo@digitaro.local',
    username: 'contractor.demo',
    firstName: 'Con',
    lastName: 'Tractor',
    userId: 'a1000000-0000-4000-8000-000000000010',
    workerId: 'a2000000-0000-4000-8000-000000000010',
    roleCode: PolarisRoleCode.CONTRACTOR,
    scopeType: ScopeType.OWN,
    scopeId: null,
    employeeNumber: 'DEMO-010',
    countryCode: 'AE',
    employmentTypeCode: 'CONTRACTOR',
    reportsToKey: 'manager',
  },
];
```

For HRBP, set `scopeCountryCode: 'PK'` in the seed when creating the assignment (constants keep `scopeId: null` because country scope uses `scopeCountryCode` on the entity).

- [ ] **Step 4: Run test — expect PASS**

```bash
cd backend && pnpm test -- demo-persona.constants.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/compliance/constants/demo-persona.constants.ts backend/src/modules/compliance/__tests__/demo-persona.constants.spec.ts
git commit -m "$(cat <<'EOF'
feat(seed): add demo persona constants for local role testing
EOF
)"
```

---

### Task 4: Demo org seed — users, credentials, roles, workers

**Files:**
- Create: `backend/src/database/seeds/1783038400000-demo-org.seed.ts`
- Modify: `backend/package.json` (add `seed:demo` alias)
- Depends on: Task 3; prior seeds (tenant, roles, country-config, org-structure)

**Interfaces:**
- Consumes: `DEMO_PERSONAS`, `DEMO_PASSWORD`, `hashPassword` from `better-auth/crypto`, `SYSTEM_ROLES`, `DIGITARO_TENANT_ID`, `EMPLOYMENT_TYPE_SEED`, `DIVISION_SEED` / Labs id, `LEGAL_ENTITY_SEED`
- Produces: Idempotent users with verified email + credential password; role assignments; workers with `userId` linked; manager_relationships for reports

- [ ] **Step 1: Implement seeder skeleton with user + account upsert**

```typescript
import { hashPassword } from 'better-auth/crypto';
import { AccountEntity } from '@/auth/entities/account.entity';
import { UserEntity } from '@/auth/entities/user.entity';
import { Role } from '@/api/user/user.enum';
import {
  DEMO_PASSWORD,
  DEMO_PERSONAS,
} from '@/modules/compliance/constants/demo-persona.constants';
import { SYSTEM_ROLES } from '@/modules/compliance/constants/role.constants';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { UserRoleAssignmentEntity } from '@/modules/compliance/entities/user-role-assignment.entity';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { EMPLOYMENT_TYPE_SEED } from '@/modules/country-config/constants/country-config.seed-data';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ManagerRelationshipEntity } from '@/modules/core-hr/entities/manager-relationship.entity';
import { RelationshipType } from '@/modules/core-hr/enums/org.enum';
import {
  EntraStatus,
  WorkMode,
  WorkerStatus,
} from '@/modules/core-hr/enums/worker.enum';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

/**
 * LOCAL/DEV demo org for role testing.
 * Do not run against production Digitaro data.
 */
export class DemoOrgSeed1783038400000 implements Seeder {
  track = true;

  public async run(
    dataSource: DataSource,
    _: SeederFactoryManager,
  ): Promise<void> {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const userRepo = dataSource.getRepository(UserEntity);
    const accountRepo = dataSource.getRepository(AccountEntity);
    const assignmentRepo = dataSource.getRepository(UserRoleAssignmentEntity);
    const workerRepo = dataSource.getRepository(WorkerEntity);
    const mgrRelRepo = dataSource.getRepository(ManagerRelationshipEntity);

    const byKey = new Map(DEMO_PERSONAS.map((p) => [p.key, p]));

    for (const persona of DEMO_PERSONAS) {
      let user = await userRepo.findOne({ where: { id: persona.userId } });
      if (!user) {
        user = await userRepo.findOne({ where: { email: persona.email } });
      }
      if (!user) {
        user = await userRepo.save(
          userRepo.create({
            id: persona.userId,
            email: persona.email,
            username: persona.username,
            displayUsername: persona.username,
            firstName: persona.firstName,
            lastName: persona.lastName,
            isEmailVerified: true,
            role: Role.User,
          }),
        );
      } else {
        user.isEmailVerified = true;
        user.firstName = persona.firstName;
        user.lastName = persona.lastName;
        await userRepo.save(user);
      }

      let account = await accountRepo.findOne({
        where: { userId: user.id, providerId: 'credential' },
      });
      if (!account) {
        await accountRepo.save(
          accountRepo.create({
            accountId: user.id,
            userId: user.id,
            providerId: 'credential',
            password: passwordHash,
          }),
        );
      } else if (!account.password) {
        account.password = passwordHash;
        await accountRepo.save(account);
      }

      const role = SYSTEM_ROLES.find((r) => r.code === persona.roleCode);
      if (!role) {
        throw new Error(`Missing SYSTEM_ROLES entry for ${persona.roleCode}`);
      }

      const existingAssignment = await assignmentRepo.findOne({
        where: {
          tenantId: DIGITARO_TENANT_ID,
          userId: user.id,
          roleId: role.id,
        },
      });
      if (!existingAssignment) {
        await assignmentRepo.save(
          assignmentRepo.create({
            tenantId: DIGITARO_TENANT_ID,
            userId: user.id,
            roleId: role.id,
            scopeType: persona.scopeType,
            scopeId: persona.scopeId,
            scopeCountryCode:
              persona.scopeType === ScopeType.COUNTRY
                ? persona.countryCode
                : null,
            effectiveFrom: null,
            effectiveTo: null,
            assignedBy: null,
          }),
        );
      }

      const employmentType = EMPLOYMENT_TYPE_SEED.find(
        (t) => t.code === persona.employmentTypeCode,
      );
      if (!employmentType) {
        throw new Error(`Missing employment type ${persona.employmentTypeCode}`);
      }

      const legalEntityId =
        persona.countryCode === 'PK'
          ? 'e0000000-0000-4000-8000-000000000001'
          : persona.countryCode === 'AE'
            ? 'e0000000-0000-4000-8000-000000000002'
            : 'e0000000-0000-4000-8000-000000000003';

      const divisionId = 'd0000000-0000-4000-8000-000000000001'; // Labs

      let worker = await workerRepo.findOne({
        where: { id: persona.workerId },
      });
      if (!worker) {
        worker = await workerRepo.findOne({
          where: {
            tenantId: DIGITARO_TENANT_ID,
            employeeNumber: persona.employeeNumber,
          },
        });
      }

      const managerWorkerId = persona.reportsToKey
        ? byKey.get(persona.reportsToKey)?.workerId ?? null
        : null;

      if (!worker) {
        worker = await workerRepo.save(
          workerRepo.create({
            id: persona.workerId,
            tenantId: DIGITARO_TENANT_ID,
            legalEntityId,
            userId: user.id,
            employmentTypeId: employmentType.id,
            divisionId,
            departmentId: null,
            managerId: managerWorkerId,
            countryCode: persona.countryCode,
            workCountryCode: persona.countryCode,
            email: persona.email,
            employeeNumber: persona.employeeNumber,
            firstName: persona.firstName,
            lastName: persona.lastName,
            status: WorkerStatus.ACTIVE,
            workMode: WorkMode.OFFICE,
            entraStatus:
              persona.employmentTypeCode === 'CONTRACTOR'
                ? EntraStatus.NOT_REQUIRED
                : EntraStatus.PENDING,
            startDate: '2024-01-01',
            // set remaining required columns per WorkerEntity
          } as Partial<WorkerEntity>),
        );
      } else {
        worker.userId = user.id;
        worker.managerId = managerWorkerId;
        await workerRepo.save(worker);
      }

      if (managerWorkerId) {
        const existingRel = await mgrRelRepo.findOne({
          where: {
            tenantId: DIGITARO_TENANT_ID,
            workerId: worker.id,
            managerId: managerWorkerId,
          },
        });
        if (!existingRel) {
          await mgrRelRepo.save(
            mgrRelRepo.create({
              tenantId: DIGITARO_TENANT_ID,
              workerId: worker.id,
              managerId: managerWorkerId,
              relationshipType: RelationshipType.LINE,
              effectiveFrom: '2024-01-01',
              effectiveTo: null,
            }),
          );
        }
      }
    }

    console.log(
      `\nDemo org ready. Password for all *.demo@digitaro.local: ${DEMO_PASSWORD}\n` +
        'Do not run this seed against production.\n',
    );
  }
}
```

**Important:** When implementing, open `WorkerEntity` and fill every non-nullable column exactly (do not leave `as Partial` if TypeORM/create requires fields). Match patterns from worker service create tests.

- [ ] **Step 2: Add package script**

In `backend/package.json`:

```json
"seed:demo": "pnpm seed:run"
```

Add a one-line comment in `backend/.env.example`:

```bash
# Demo personas (*.demo@digitaro.local) come from DemoOrgSeed — use locally only; do not seed production.
```

Note: `typeorm-extension seed:run` runs all seeders with `track = true` that have not run; after first run, re-running is a no-op unless the seed track row is cleared. For **idempotent re-apply** of demo data after partial deletes, the seeder body itself must upsert (as above). If operators need force re-run, document deleting the corresponding row from the seed tracking table — out of scope to automate.

- [ ] **Step 3: Run migrations + foundation seeds + demo**

```bash
cd backend && pnpm migration:up && pnpm seed:run
```

Expected: console prints demo password line; no FK errors.

- [ ] **Step 4: Verify one login via API**

```bash
curl -s -X POST http://localhost:8000/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"employee.demo@digitaro.local","password":"PolarisDemo!2026"}'
```

Expected: session / user payload (not 401). Exact Better Auth path may be `/api/auth/sign-in/email` — confirm against `/api/auth/reference`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/database/seeds/1783038400000-demo-org.seed.ts backend/package.json backend/.env.example
git commit -m "$(cat <<'EOF'
feat(seed): add demo org users, roles, and workers

Idempotent local personas with shared password for role smoke testing.
EOF
)"
```

---

### Task 5: Demo sample leave + policy (Hub fodder)

**Files:**
- Modify: `backend/src/database/seeds/1783038400000-demo-org.seed.ts` (extend same seeder)
- Uses: `LeaveTypeEntity` (lookup `code = 'ANNUAL'` for PK), `LeaveBalanceEntity`, `LeaveRequestEntity`, `PolicyEntity`, `PolicyVersionEntity`, population/ack entities as required by schema

**Interfaces:**
- Consumes: demo `employee` + `manager` worker ids from constants
- Produces: leave balance for employee; one `submitted` leave request with `approverId = manager.workerId`; one active policy version that surfaces as pending ack for employee (enough for Hub / policy UI)

- [ ] **Step 1: After workers exist, seed leave balance + pending request**

Look up leave type:

```typescript
const leaveTypeRepo = dataSource.getRepository(LeaveTypeEntity);
const annual = await leaveTypeRepo.findOne({
  where: { tenantId: DIGITARO_TENANT_ID, code: 'ANNUAL', countryCode: 'PK' },
});
```

If `annual` is null (setup-wizard leave types not seeded yet), `console.warn` and skip leave section — do not fail the whole demo seed.

Otherwise upsert balance for `employee.demo` worker for current year and create one leave request if none exists for that worker with status `submitted`:

```typescript
// LeaveRequestEntity fields — match entity:
// workerId, leaveTypeId, startDate, endDate, days, status: SUBMITTED,
// approverId: manager.workerId, reason: 'Demo pending leave'
```

- [ ] **Step 2: Seed one active policy + version requiring ack**

Follow patterns in `policy.service.ts` / policy tests:

- Policy code `DEMO_CODE_OF_CONDUCT`
- One published version
- Population rule covering all employees or specific demo workers
- Do not create acknowledgement rows for `employee.demo` (so Hub / ack modal can show pending)

If policy tables or required enums make this heavy, minimum viable: create policy + version + population rule only; skip if entities missing columns you cannot satisfy — warn and continue.

- [ ] **Step 3: Re-run seed (or clear track + run) and confirm DB rows**

```bash
# If track prevents re-run, upserts inside already-run seed won't execute.
# For iteration during implementation: temporarily set track = false OR delete seed history row, then:
pnpm seed:run
```

Verify with SQL or TypeORM query: one submitted leave for DEMO-008; policy `DEMO_CODE_OF_CONDUCT` exists.

- [ ] **Step 4: Commit**

```bash
git add backend/src/database/seeds/1783038400000-demo-org.seed.ts
git commit -m "$(cat <<'EOF'
feat(seed): add demo leave request and sample policy

Gives manager Hub approvals and employee policy ack something to click.
EOF
)"
```

---

### Task 6: Demo accounts doc + manual path note

**Files:**
- Create: `docs/superpowers/specs/2026-08-08-demo-accounts.md`
- Optional touch: `docs/GETTING-STARTED.md` — one paragraph linking to the demo doc (only if a “local login” section already exists; otherwise skip to avoid doc sprawl)

**Interfaces:**
- Consumes: credentials and smoke table from the design spec
- Produces: operator-facing checklist

- [ ] **Step 1: Write demo accounts doc**

Include:

1. Warning: local/dev only — do not run demo seed on production  
2. How to seed: `cd backend && pnpm migration:up && pnpm seed:run`  
3. Shared password `PolarisDemo!2026`  
4. Full email/role table from the design  
5. Suggested smoke order (super_admin → people_ops → employee → manager → contractor → others)  
6. Per-role land-on / must-do / must-not table (copy from design §3)  
7. Dual auth note: password always; set `NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED=true` + Entra env when testing Microsoft  
8. Manual production path (brief): People Ops / IT creates real user → password or invite → assign Polaris role → link `workers.userId` — Microsoft optional later via same email (account linking)

- [ ] **Step 2: Spot-check manual path gaps (no large feature)**

Verify existing sign-up / invite / role-assignment APIs can create a non-demo user with password. If password cannot be set without email reset:

- Document: use Better Auth forgot-password / admin reset for first password  
- Only if a one-line fix exists (e.g. seed path already hashes password), apply it; otherwise file a follow-up note in the demo doc under “Known gaps” — do not build a full invite redesign in this plan

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-08-08-demo-accounts.md
git commit -m "$(cat <<'EOF'
docs(auth): add demo account credentials and role smoke checklist
EOF
)"
```

---

### Task 7: End-to-end verification pass

**Files:** none (verification only)

- [ ] **Step 1: Fresh local stack**

```bash
# API + frontend + redis/postgres running
cd backend && pnpm migration:up && pnpm seed:run
```

- [ ] **Step 2: Password sign-in without Entra**

For each of: `employee`, `manager`, `peopleops`, `contractor`, `superadmin` demo emails:

1. Open `/en/sign-in`  
2. Staff or Contractor tab as appropriate  
3. Sign in with `PolarisDemo!2026`  
4. Confirm redirect to role home (via `/dashboard` → shell `homePath`)

Record pass/fail in a short note (chat or checklist tick in demo-accounts.md).

- [ ] **Step 3: Cross-role workflow**

1. As `employee.demo`: open Hub / leave — see own pending or create leave if seed leave missing  
2. As `manager.demo`: Hub “for me” shows leave to approve; approve  
3. As `peopleops.demo`: open workers list; open one demo worker  

- [ ] **Step 4: Microsoft UI gate**

With flag false: no Microsoft button. With flag true but Entra unset: expect Better Auth/provider error — operators should only enable flag when Entra is real.

- [ ] **Step 5: Done when success criteria from spec §6 are met**

- Every demo persona can password-login without Entra  
- `seed:run` does not duplicate personas on second apply of upsert logic (or track prevents duplicate inserts)  
- Employee → manager leave path works with demo data  

No commit required unless checklist markdown was updated.

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| Email/password for anyone | Task 1 |
| Microsoft when configured; no dead button | Task 1 (`NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED`) |
| Contractor magic link kept | Task 1 |
| Account linking by email | Task 2 |
| Manual + Microsoft same RBAC | Tasks 2, 4, 6 |
| Demo seed personas + workers + org | Tasks 3–4 |
| Leave / Hub / policy sample | Task 5 |
| Credentials + smoke checklist doc | Task 6 |
| No hard prod block on seed | Tasks 4–6 (docs only) |
| Verification | Task 7 |

No TBD placeholders remain. Password hashing uses `hashPassword` from `better-auth/crypto` (verified present in this repo’s Better Auth install).
