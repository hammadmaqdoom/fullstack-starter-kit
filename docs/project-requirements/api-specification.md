# Polaris — API Specification

**Product:** Polaris  
**Status:** Approved for implementation  
**Last updated:** 26 June 2026  
**Companion to:** [system-architecture.md](./system-architecture.md) · [database-design.md](./database-design.md)

---

## 1. API overview

### 1.1 Base information

| Environment | Base URL |
|---|---|
| Development | `http://localhost:3000/api` |
| Staging | `https://polaris-staging.digitaro.co/api` |
| Production | `https://polaris.digitaro.co/api` |

- **Version:** `v1` (URL path: `/api/v1/`)
- **Protocol:** REST over HTTPS
- **Format:** JSON, UTF-8
- **GraphQL:** Available at `/graphql` for starter-kit patterns; REST is primary for Polaris modules

### 1.2 Design principles

- RESTful, resource-based URLs
- Consistent envelope: `{ data, meta, errors }`
- HTTP status codes per RFC 7231
- Idempotent mutations where applicable (`Idempotency-Key` header on pay runs, exports)
- Row-level scope enforced server-side — never trust client filters for authorization
- All mutations write `audit_log` entries
- OpenAPI/Swagger auto-generated from NestJS decorators

### 1.3 Universal controls (all endpoints)

Per [feature-flows.md](../compliance/feature-flows.md) §0.3:

1. Authenticate (Entra OIDC or Better Auth session)
2. Authorise (RBAC + row-level scope)
3. Validate input (DTO + business rules)
4. Persist with audit log entry
5. Return scoped response (field redaction applied)

---

## 2. Authentication

### 2.1 Employee authentication (Entra OIDC)

```http
GET /api/v1/auth/entra/login
→ Redirect to Microsoft Entra OIDC

GET /api/v1/auth/entra/callback?code=...
→ Set session cookie, redirect to app
```

Session: HTTP-only secure cookie via Better Auth. MFA enforced through Entra.

### 2.2 Contractor authentication

```http
POST /api/v1/auth/contractor/login
Content-Type: application/json

{
  "email": "contractor@example.com",
  "password": "..."
}

POST /api/v1/auth/contractor/magic-link
Content-Type: application/json

{
  "email": "contractor@example.com"
}
```

Rate-limited: 5 attempts per 15 minutes per IP.

### 2.3 Session management

```http
GET /api/v1/auth/session
→ { user, worker, roles, scopes }

POST /api/v1/auth/logout
→ Clear session
```

### 2.4 E-sign token (contractors / external)

```http
GET /api/v1/esign/sign/{token}
→ Validate email-verified signing token (time-limited, single-envelope scoped)
```

---

## 3. Common patterns

### 3.1 Request headers

```http
Authorization: Bearer {session_token}   # or cookie-based session
Content-Type: application/json
Accept: application/json
X-Correlation-Id: {uuid}               # optional, echoed in audit log
Idempotency-Key: {uuid}                 # required on pay run approve, export
```

### 3.2 Pagination

```http
GET /api/v1/workers?page=1&limit=25&sort=-created_at

Response:
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "totalPages": 6
  }
}
```

### 3.3 Filtering

Query params: `?status=active&country_code=PK&employment_type=CONTRACTOR&division_id={uuid}`

### 3.4 Error responses

```json
{
  "errors": [{
    "code": "LEAVE_INSUFFICIENT_BALANCE",
    "message": "Insufficient annual leave balance. Available: 2.5 days.",
    "field": "end_date",
    "status": 422
  }]
}
```

| Status | Usage |
|---|---|
| 400 | Malformed request |
| 401 | Unauthenticated |
| 403 | Forbidden (RBAC/scope) |
| 404 | Resource not found (or not visible in scope) |
| 409 | Conflict (duplicate, state transition invalid) |
| 422 | Business rule validation failed |
| 429 | Rate limited |
| 500 | Internal error |

---

## 4. API modules

### 4.1 Core HR — `/api/v1/workers`

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | `/workers` | List workers (scoped) | HR, Manager+, Finance (limited) |
| POST | `/workers` | Create worker | People Ops, Super Admin |
| GET | `/workers/{id}` | Get worker profile | Scoped |
| PATCH | `/workers/{id}` | Update worker (HR direct) | People Ops, Super Admin |
| DELETE | `/workers/{id}` | Soft-delete / archive | People Ops, Super Admin |
| GET | `/workers/{id}/audit-log` | Field change history | HR, Super Admin |
| GET | `/workers/{id}/documents` | Attached documents | Scoped |
| POST | `/workers/{id}/documents` | Upload attachment | HR, scoped self |
| GET | `/workers/directory` | Searchable directory | All authenticated |
| GET | `/workers/org-chart` | Org chart data | Scoped |

**Profile change requests:**

| Method | Path | Description |
|---|---|---|
| POST | `/workers/{id}/change-requests` | Submit change request |
| GET | `/workers/{id}/change-requests` | List requests |
| POST | `/change-requests/{id}/approve` | Approve |
| POST | `/change-requests/{id}/reject` | Reject with reason |

**Passport & visa / work-pass (UAE & Singapore):**

| Method | Path | Description |
|---|---|---|
| GET | `/workers/{id}/passports` | List passport records | People Ops |
| POST | `/workers/{id}/passports` | Add passport (renewal) | People Ops |
| PATCH | `/workers/{id}/passports/{passportId}` | Update passport | People Ops |
| GET | `/workers/{id}/visa-records` | List visa/work-pass records (`previous` + `current`) | People Ops |
| POST | `/workers/{id}/visa-records` | Add record (e.g. new `current` when visa issued) | People Ops |
| PATCH | `/workers/{id}/visa-records/{recordId}` | Update application status, dates, numbers | People Ops |
| POST | `/workers/{id}/visa-records/{recordId}/attachments` | Upload visa/passport document | People Ops |
| POST | `/pre-boarding/session/passport` | Candidate passport fields | Pre-boarding auth |
| POST | `/pre-boarding/session/visa-record` | Candidate previous visa/pass fields | Pre-boarding auth |
| POST | `/pre-boarding/session/attachments` | Upload passport/visa docs | Pre-boarding auth |

### 4.2 Organisation — `/api/v1/org`

| Method | Path | Description |
|---|---|---|
| GET/POST/PATCH | `/divisions` | Division CRUD |
| GET/POST/PATCH | `/departments` | Department CRUD |
| GET/POST/PATCH | `/legal-entities` | Legal entity CRUD |
| GET/POST | `/manager-relationships` | Reporting lines |
| GET/POST/DELETE | `/project-assignments` | Matrix assignments |

### 4.3 Country config — `/api/v1/config`

| Method | Path | Description |
|---|---|---|
| GET/POST/PATCH | `/countries` | Country configurations |
| GET/POST/PATCH | `/employment-types` | Employment type definitions |
| GET/POST/PATCH | `/employment-type-country-configs` | Type × country rules matrix |
| GET/POST/PATCH | `/currencies` | Currency catalog |
| GET | `/exchange-rates` | List rates (filter by date, pair) |
| POST | `/exchange-rates/override` | Manual rate override | Finance |
| GET | `/exchange-rates/fetch-status` | Last Frankfurter job status |
| GET/POST/PATCH | `/holiday-calendars` | Holiday management |
| GET/POST/PATCH | `/work-week-patterns` | Work week definitions |
| GET/POST/PATCH | `/statutory-rate-schedules` | Statutory rates | Finance |

### 4.4 Leave — `/api/v1/leave`

| Method | Path | Description |
|---|---|---|
| GET | `/leave-types` | Leave types (country-filtered) |
| GET | `/leave-balances` | Own or team balances |
| GET/POST | `/leave-requests` | List / create request |
| GET | `/leave-requests/{id}` | Request detail + status tracker |
| POST | `/leave-requests/{id}/approve` | Approve | Manager+ |
| POST | `/leave-requests/{id}/reject` | Reject | Manager+ |
| POST | `/leave-requests/{id}/cancel` | Cancel own request |
| GET | `/leave/team-calendar` | Team availability view |
| POST | `/comp-off-credits` | Credit comp-off | Manager+ |

### 4.5 Attendance — `/api/v1/attendance`

| Method | Path | Description |
|---|---|---|
| POST | `/punches/check-in` | One-tap check-in |
| POST | `/punches/check-out` | One-tap check-out |
| GET | `/punches` | Punch history (scoped) |
| GET | `/punches/today` | Today's status for worker/team |
| GET | `/attendance/day-summaries` | Daily summaries |
| POST | `/punch-corrections` | Request correction |
| POST | `/punch-corrections/{id}/approve` | Approve correction |
| GET/POST/PATCH | `/shift-rosters` | Roster management |
| GET/POST | `/shift-assignments` | Assign shifts |

### 4.6 Calendar — `/api/v1/calendars`

| Method | Path | Description |
|---|---|---|
| GET | `/calendars/me` | Own calendar: holidays, leave, attendance cells (`from`/`to` optional → current week Mon–Sun) |
| GET | `/calendars/staff/{workerId}` | Staff calendar for worker (RBAC scoped) |
| GET | `/calendars/team` | Team heatmap (`from`/`to`, optional `divisionId`) — Manager+ |
| GET | `/calendars/staff` | Legacy holidays + leave only (deprecated) |
| GET | `/holidays` | Holidays for country/year |

**Query rules:** `from` / `to` as ISO `YYYY-MM-DD`; both required together or both omitted (defaults to current week in acting worker timezone). Max span 62 days. Unknown params such as `month` are rejected (`forbidNonWhitelisted`).

### 4.7 Documents & policies — `/api/v1/documents`

| Method | Path | Description |
|---|---|---|
| GET/POST/PATCH | `/policies` | Policy CRUD | HR |
| POST | `/policies/{id}/versions` | New policy version |
| POST | `/policies/{id}/acknowledge` | Acknowledge current version |
| GET | `/policies/acknowledgement-status` | Compliance dashboard |
| GET/POST/PATCH | `/templates` | Document templates | HR |
| POST | `/templates/{id}/versions` | New template version |
| POST | `/templates/{id}/preview` | Preview with merge data |
| POST | `/documents/generate` | Create draft document from template |
| POST | `/documents/{id}/issue` | Issue draft — assign `document_number`, set `Issued` | HR |
| GET | `/documents/{id}` | Generated document detail |
| POST | `/documents/{id}/preview` | Preview PDF for render profile (`?renderProfile=`) |
| GET | `/documents/{id}/download` | Download PDF (`?renderProfile=full_digital\|print_on_letterhead\|informational`) |
| GET | `/documents/register` | Document register (filter: entity, type, status, signing method) | HR |
| PATCH | `/legal-entities/{id}/document-output` | Stamp config, default render profile | Admin |
| GET/POST/PATCH | `/letterhead-configs` | Letterhead layout + physical-stock margins | Admin |

### 4.8 E-sign — `/api/v1/esign`

| Method | Path | Description |
|---|---|---|
| POST | `/envelopes` | Create envelope |
| GET | `/envelopes/{id}` | Envelope detail + status tracker |
| POST | `/envelopes/{id}/send` | Send to signatories |
| POST | `/envelopes/{id}/void` | Void with reason | HR |
| GET | `/envelopes/{id}/audit` | Audit trail |
| GET | `/envelopes/{id}/certificate` | Certificate of completion PDF |
| POST | `/envelopes/{id}/fields` | Place signature fields |
| POST | `/sign/{token}/complete` | Complete signing (token auth) |
| POST | `/envelopes/{id}/manual-upload` | Upload signed copy |
| POST | `/envelopes/{id}/manual-upload/confirm-stamp` | Confirm wet stamp verified (when entity requires) | HR |
| GET | `/envelopes/{id}/export-pdf` | Export for wet signature (`?renderProfile=`) |

### 4.9 Talent — `/api/v1/talent`

| Method | Path | Description |
|---|---|---|
| GET/POST/PATCH | `/onboarding` | Onboarding instances |
| GET/POST/PATCH | `/onboarding-templates` | Template management |
| POST | `/onboarding/{id}/tasks/{taskId}/complete` | Complete task |
| POST | `/pre-boarding` | Create pre-boarding packet (People Ops) |
| POST | `/pre-boarding/{id}/invite` | Resend magic link to personal email |
| GET/PATCH | `/pre-boarding/{id}` | Packet detail (People Ops / Finance review) |
| POST | `/pre-boarding/auth/magic-link` | Candidate requests link | Public, rate-limited |
| POST | `/pre-boarding/auth/verify` | Exchange token for session | Public |
| GET/PATCH | `/pre-boarding/session/fields` | Candidate form (session-scoped) | Pre-boarding auth |
| POST | `/pre-boarding/session/submit` | Candidate submit packet | Pre-boarding auth |
| POST | `/pre-boarding/{id}/merge` | Force merge to worker profile | People Ops |
| GET | `/entra-provisioning-jobs` | List scheduled/failed jobs | IT Admin |
| POST | `/entra-provisioning-jobs/{id}/retry` | Retry failed Graph job | IT Admin |
| POST | `/entra-provisioning-jobs/{id}/complete-manual` | Mark manually provisioned | IT Admin |
| GET/POST | `/separations` | Separation workflows |
| POST | `/separations/{id}/clearance/{taskId}` | Clearance sign-off |
| GET/POST/PATCH | `/requisitions` | Job requisitions | Phase 2 |
| GET/POST/PATCH | `/candidates` | Candidate pipeline | Phase 2 |
| GET/POST/PATCH | `/performance-cycles` | Performance cycles | Phase 2 |
| GET/POST/PATCH | `/training/courses` | Training catalog | Phase 2 |
| GET/POST/PATCH | `/manpower-plans` | Manpower plans | Phase 2 |

### 4.10 Operations — `/api/v1/ops`

| Method | Path | Description |
|---|---|---|
| GET/POST | `/expenses` | Expense claims | Phase 2 |
| POST | `/expenses/{id}/approve` | Approve expense |
| GET/POST | `/travel-requests` | Travel requests | Phase 2 |
| GET/POST/PATCH | `/tickets` | Help desk tickets | Phase 2 |
| POST | `/tickets/{id}/comments` | Add comment |
| GET/POST | `/contractor-invoices` | Contractor invoices | Phase 2 |
| POST | `/contractor-invoices/{id}/approve` | Approve invoice |

### 4.11 Payroll — `/api/v1/payroll`

| Method | Path | Description |
|---|---|---|
| GET/POST/PATCH | `/benefit-types` | Benefit type catalog | Finance |
| GET/POST/PATCH | `/employee-benefits` | Benefit assignments |
| POST | `/pay-runs` | Create pay run | Finance |
| GET | `/pay-runs/{id}` | Pay run detail + anomalies |
| POST | `/pay-runs/{id}/calculate` | Run calculation |
| POST | `/pay-runs/{id}/approve` | Approve pay run |
| POST | `/pay-runs/{id}/export` | Generate PDF/Excel export pack |
| POST | `/pay-runs/{id}/release-payslips` | Release to employees |
| POST | `/pay-run-lines/{id}/remittance-documents` | Upload SWIFT / bank proof | Finance |
| GET | `/pay-run-lines/{id}/remittance-pack` | Remittance pack for payroll line | Finance |
| GET | `/payslips/{id}/remittance-pack` | Pack on payslip | Employee (scoped) |
| GET | `/payslips/{id}/remittance-pack/download` | ZIP download | Employee |
| POST | `/payslips/{id}/remittance-documents` | Employee upload extra doc | Employee |
| GET | `/payslips` | Own payslips (employee) |
| GET | `/payslips/{id}/download` | Download payslip PDF |
| POST | `/contractor-payment-batches` | Create payment batch |
| POST | `/contractor-payment-batches/{id}/export` | Export batch |
| POST | `/contractor-payment-lines/{id}/mark-paid` | Mark paid + payment ref | Finance |
| POST | `/contractor-payment-lines/{id}/remittance-documents` | Upload SWIFT / bank proof | Finance |
| GET | `/contractor-payment-lines/{id}/remittance-pack` | Remittance pack detail | Finance |
| GET/POST/PATCH | `/remittance-corridors` | Corridor config CRUD | Finance, Super Admin |
| GET | `/contractor-invoices/{id}/remittance-pack` | Pack for invoice | Contractor (scoped) |
| GET | `/contractor-invoices/{id}/remittance-pack/download` | ZIP download | Contractor |
| POST | `/contractor-invoices/{id}/remittance-documents` | Contractor upload extra doc | Contractor |

### 4.12 Hub (unified inbox) — `/api/v1/hub`

| Method | Path | Description |
|---|---|---|
| GET | `/hub` | Unified inbox (mine + for-me) |
| GET | `/hub/counts` | Badge counts (action-required only) |
| POST | `/hub/{itemId}/approve` | Quick approve from Hub |
| POST | `/hub/{itemId}/reject` | Quick reject from Hub |

Aggregates: leave requests, expenses, travel, invoices, e-sign envelopes, tickets, onboarding tasks, clearance items.

### 4.13 Automation — `/api/v1/automation`

| Method | Path | Description |
|---|---|---|
| GET/POST/PATCH | `/alert-rules` | Custom alert rules |
| GET | `/alerts` | Active compliance alerts |
| GET/POST/PATCH | `/scheduled-reports` | Report subscriptions |
| POST | `/scheduled-reports/{id}/run` | Trigger report now |

### 4.14 Reports — `/api/v1/reports`

| Method | Path | Description |
|---|---|---|
| GET | `/reports/headcount` | Headcount by division/country/FTE |
| GET | `/reports/attrition` | Attrition metrics |
| GET | `/reports/leave-liability` | Leave liability |
| GET | `/reports/visa-expiry` | Upcoming visa expiries |
| GET | `/reports/entra-coverage` | Entra provisioning status |
| GET | `/reports/policy-compliance` | Acknowledgement gaps |
| GET | `/reports/payroll-register` | Pay register | Finance |
| POST | `/reports/{type}/export` | Async export (CSV/PDF) |

### 4.15 Admin — `/api/v1/admin`

| Method | Path | Description |
|---|---|---|
| GET/POST/PATCH | `/roles` | Role management | Super Admin |
| GET/POST/DELETE | `/user-roles` | Role assignments |
| GET | `/audit-log` | Global audit search | Super Admin |
| GET/POST | `/setup-wizard` | Guided setup state |
| POST | `/setup-wizard/seed` | Apply PK/UAE/SG seeds |

### 4.16 Compliance exports — `/api/v1/compliance`

| Method | Path | Description |
|---|---|---|
| GET | `/evidence/audit-log` | Audit log export |
| GET | `/evidence/access-review` | Role assignment export |
| GET | `/evidence/policy-acknowledgements` | Acknowledgement report |
| POST | `/dsar/export` | Data subject access request export |

### 4.17 Me (shell) — `/api/v1/me`

Role-aware app shell capabilities and command-palette search. Authenticated; scoped by `user_role_assignments`.

| Method | Path | Description |
|---|---|---|
| GET | `/me/shell` | Primary layout, home path, nav modules, setup progress |
| GET | `/me/search?q=&limit=` | Role-scoped search (workers, hub, policies, actions, modules). Empty/`q` &lt; 2 → browse mode (actions + modules only) |

---

## 5. Webhooks & integrations

### 5.1 Entra provisioning webhook

```http
POST /api/v1/webhooks/entra
X-Entra-Signature: {hmac}

{ "event": "user.provisioned", "entraObjectId": "...", "email": "..." }
→ Update worker.entra_status = provisioned
```

### 5.2 Microsoft Graph (application permissions)

Polaris calls Graph as a **daemon service** (FLW-SEC-006). Credentials stored in Azure Key Vault.

| Operation | Graph endpoint | When |
|---|---|---|
| Create user | `POST /users` | Entra provisioning job |
| Assign license | `POST /users/{id}/assignLicense` | After user create |
| Add to group | `POST /groups/{id}/members/$ref` | Division/country group mapping |
| Disable user | `PATCH /users/{id}` `{ "accountEnabled": false }` | Separation LWD |

Every request logs `graph_correlation_id`, HTTP status, and worker ID to `audit_log` — never client secrets or passwords.

### 5.3 Teams notification callback

Outbound only — Polaris sends adaptive cards via Microsoft Graph API. No inbound webhook v1.

---

## 6. File uploads

```http
POST /api/v1/files/upload
Content-Type: multipart/form-data

file: (binary)
classification: internal | confidential
entity_type: worker | expense | invoice | document
entity_id: {uuid}

Response: { "blobUrl": "...", "fileId": "..." }
```

- Max size: 25MB (documents), 10MB (receipts)
- Allowed types: PDF, PNG, JPG, DOCX, XLSX
- Virus scan via Azure Defender (production)
- Stored in Azure Blob with tenant-scoped paths

---

## 7. Real-time (optional v1.1)

WebSocket via starter kit socket module:

- `team.status` — live check-in status for manager cockpit
- `hub.update` — inbox badge count changes
- `envelope.status` — e-sign status updates

Not required for Phase 1 MVP; polling acceptable.

---

## 8. OpenAPI generation

OpenAPI 3.1 spec generated at build time:

```
backend/dist/openapi.yaml
```

Frontend types generated from spec for type-safe API client.

---

## 9. Related documents

- [database-design.md](./database-design.md) — entity schemas
- [../compliance/feature-flows.md](../compliance/feature-flows.md) — operational flows per endpoint
- [../generated/API_CONTRACTS.yaml](../generated/API_CONTRACTS.yaml) — generated OpenAPI (post-implementation)
