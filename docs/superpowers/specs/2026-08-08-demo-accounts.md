# Demo accounts — local role testing

**Warning:** For local/dev only. Do **not** run the demo seed against production Digitaro data.

**Spec:** [2026-08-08-dual-auth-demo-role-testing-design.md](./2026-08-08-dual-auth-demo-role-testing-design.md)  
**Plan:** [../plans/2026-08-08-dual-auth-demo-role-testing.md](../plans/2026-08-08-dual-auth-demo-role-testing.md)

## How to seed

```bash
cd backend
pnpm migration:up
pnpm seed:run   # or pnpm seed:demo (alias)
```

Demo personas are created by `DemoOrgSeed1783038400000`. Shared password for all `*.demo@digitaro.local` accounts:

```
PolarisDemo!2026
```

## Dual auth

- **Email/password** works for every role (Staff and Contractor tabs).
- **Microsoft** appears only when `NEXT_PUBLIC_MICROSOFT_AUTH_ENABLED=true` **and** backend `ENTRA_CLIENT_ID` / `ENTRA_CLIENT_SECRET` are set.
- Contractors also have magic link on the Contractor tab.
- When Entra is added later, Better Auth account linking attaches Microsoft to the same email user.

## Accounts

| Email | Role |
|---|---|
| `superadmin.demo@digitaro.local` | super_admin |
| `peopleops.demo@digitaro.local` | people_ops |
| `hrbp.demo@digitaro.local` | hrbp |
| `itadmin.demo@digitaro.local` | it_admin |
| `finance.demo@digitaro.local` | finance |
| `divhead.demo@digitaro.local` | division_head |
| `manager.demo@digitaro.local` | manager |
| `employee.demo@digitaro.local` | employee |
| `employee2.demo@digitaro.local` | employee |
| `contractor.demo@digitaro.local` | contractor |

Org: Labs division; manager reports to divhead; employee, employee2, and contractor report to manager. Sample data: pending leave for manager Hub, policy `DEMO_CODE_OF_CONDUCT` for PK ack. `employee.demo` has `dateOfBirth` set to today’s month/day (year 1995) so Employee Home shows the birthday card after seeding.

## Suggested smoke order

1. `superadmin` — sanity / setup  
2. `peopleops` — workers list  
3. `employee` → `manager` — leave / Hub approve  
4. `contractor` — contractor portal  
5. `finance`, `itadmin`, `hrbp`, `divhead` — nav + scope  
6. **Performance:** `employee` → `manager` → `peopleops` → `divhead` (see below)

## Performance smoke (IPMS)

| Role | Land on | Must do |
|---|---|---|
| employee | `/employee/performance` | See seeded goals/feedback/1:1/OKRs; add goal; check-in; feedback via WorkerPicker; self-assessment; view manager feedback after manager submit; sign off; Hub `?reviewId=` / `?developmentActionId=`; pulse at `/employee/performance/pulse` |
| manager | `/manager/performance` | See team board; submit manager review (incl. probation outcome on probation cycles); sign off; feedback via WorkerPicker; schedule/complete 1:1; Hub `?reviewId=` / `?developmentActionId=`; start separation after terminate |
| people_ops | `/people-ops/performance` | Create cycle with calibration flag; OKRs at `/people-ops/performance/okrs`; pulse admin at `/people-ops/performance/pulse` |
| division_head | `/people-ops/performance/calibration` | Calibrate seeded `pending_calibration` review |

Seed: `1783040700000-demo-performance.seed.ts` (runs with `pnpm seed:run`).

## Per-role smoke

| Role | Land on | Must do | Must not |
|---|---|---|---|
| employee | `/employee/home` | Check-in, leave, Hub (mine), directory, Me, policy ack | Finance / People Ops admin |
| employee2 | `/employee/home` | Same; on manager team | Manager cockpit |
| manager | manager home | Approve leave, team calendar, Hub for-me | People Ops CRUD unless also assigned |
| division_head | manager-style home | Broader division visibility | Full People Ops unless assigned |
| people_ops | `/people-ops/dashboard` | Workers, policies, audit log, setup | SoD-blocked self-finance |
| hrbp | people-ops–adjacent | HRBP-scoped views | Super-admin / IT-only |
| finance | `/finance/...` | Finance nav that exists | Unrestricted HR edit |
| it_admin | admin layout | Access/admin surfaces | Default manager of everyone |
| super_admin | admin / people-ops | Full access | — |
| contractor | `/contractor/...` | Documents / invoices / Me | Staff check-in |

## Production (manual) path

1. People Ops / IT creates a real user (sign-up / invite).  
2. Set password (sign-up form or forgot-password reset).  
3. Assign Polaris role(s) in `user_role_assignments`.  
4. Link `workers.userId` to the auth user.  
5. Optionally enable Microsoft; same email links via account linking.

### Known gaps

- First password for non-demo users may require Better Auth forgot-password if no admin “set password” UI exists yet.
- Contractor portal may need a `contractor_profiles` row for full invoice flows; demo creates the worker + contractor role only.

## Cross-cutting checks

- Password sign-in works with Entra unset.  
- Nav matches role (no locked ghost items).  
- Direct URL cannot bypass row scope.  
- Required mutations append `audit_log`.  
- Empty/error UI states do not hard-crash.
