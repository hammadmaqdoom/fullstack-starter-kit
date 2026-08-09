# Tenant query sweep — W0b

**Date:** 2026-08-10  
**Plan:** [../plans/2026-08-10-admin-ux-crud-w0-foundation-tenancy.md](../plans/2026-08-10-admin-ux-crud-w0-foundation-tenancy.md)

## Seam

- `resolveTenantId(session)` + `assertSameTenant` in `backend/src/modules/compliance/tenant-context.util.ts`
- Controllers must call `resolveTenantId(session)` — never hard-code `DIGITARO_TENANT_ID` in HTTP layer

## W0b fixed

| Area | Status | Notes |
|---|---|---|
| Workers controller/service | `fixed-in-W0b` | Required `tenantId` on public methods |
| Org chart/directory | `fixed-in-W0b` | Required `tenantId` |
| Audit log list | `fixed-in-W0b` | Session tenant |
| Leave controller `actor()` + `listTypes` | `fixed-in-W0b` | `resolveTenantId`; listTypes test added |
| Pre-boarding controller `actor()` | `fixed-in-W0b` | |
| Separation controller `actor()` | `fixed-in-W0b` | |
| Policy controller list/create/publish/ack/dashboard | `fixed-in-W0b` | Passes session tenant into service |

## Remaining (defer deepen in W1 when touching methods)

| Area | Status | Notes |
|---|---|---|
| Leave/pre-boarding/separation services | `needs-fix` (low) | Still `actor.tenantId ?? DIGITARO_TENANT_ID` — OK once controllers set actor.tenantId via seam; remove fallbacks when W1 edits those services |
| Other Polaris modules (payroll, talent recruitment, etc.) | `needs-fix` | Sweep in W3 when hardening Phase 2 shells |
| Starter-kit `api/**` | `remove` | No retrofit — W5 |

## global-exempt

- `currency_codes` — ISO reference, no tenant_id
