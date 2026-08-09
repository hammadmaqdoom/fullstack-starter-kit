# Design: Schema Gap Closure (tables + columns)

**Date:** 2026-08-10  
**Status:** Approved  
**Plan:** [../plans/2026-08-10-schema-gap-closure.md](../plans/2026-08-10-schema-gap-closure.md)  
**Product:** Polaris (Digitaro HRMS)  
**Related:** [database-design.md](../../project-requirements/database-design.md), [prd.md](../../project-requirements/prd.md) §6.1 / §6.4 / §6.6 / §6.8 / §6.12 / §6.13 / §6.21, audit canvas `prd-phase-db-gap-audit`

## Problem

A field-level audit of `database-design.md` vs TypeORM entities found ~109 missing columns across 22 tables: 10 tables absent entirely and 12 existing tables incomplete. PRD profile/attendance/payroll datapoints (emergency contact, skills, career history, geofence fields, bank for pay-register export) are also missing. `tasks.md` / PRD §15 overstate completeness relative to the actual schema.

## Goals

1. Make PostgreSQL + TypeORM entities match the canonical data model (updated `database-design.md`).
2. Close all audited gaps in this pass **except** intentional deferrals listed under Non-goals.
3. Migrate `workers.statutoryFields` JSONB → normalized `worker_statutory_ids` with per-field `expiry_date`.
4. Add `worker_bank_accounts` so payroll export can resolve bank details (Finance-redacted).
5. Keep the system compiling: temporary read shim from normalized statutory IDs where services still expect a map.

## Non-goals (this pass)

- API / DTO / UI / Hub wiring for new fields (second pass — vertical slices)
- App-layer encryption service for bank/statutory (columns named `*_encrypted` / ready; encrypt before Finance UAT)
- Background job to populate `staff_calendar_days`
- Changing Better Auth `user` table (`workers.userId` remains the link)
- Project timesheet feature (separate Phase 2 product work)
- Dropping renamed-table aliases in application code beyond entity registration

## Decisions (confirmed)

| Topic | Choice |
|---|---|
| Delivery shape | Schema + entities + migrations only; APIs/UI later |
| Statutory IDs | Normalize to `worker_statutory_ids`; backfill; drop JSONB |
| Optional tables | Include `staff_calendar_days` + `tenant_currencies` |
| Bank data | Separate `worker_bank_accounts` table (not columns on `workers`) |
| Packaging | Spec-sync first (`database-design.md`), then entities/migrations |
| Migration layout | Domain-ordered migrations in one PR |
| Address on worker | Structured address columns on `workers` |
| Job title | `job_title` on `workers` |
| Emergency contact | Three columns on `workers` |

## Delivery order

1. Update `database-design.md` (canonical) — new tables, altered columns, document implemented renames.
2. TypeORM entities + domain migrations matching the doc.
3. Data migration: `statutoryFields` → `worker_statutory_ids`; drop `statutoryFields`.
4. Register entities in module `TypeOrmModule.forFeature`; statutory read shim so existing code compiles.
5. Checklist note in `docs/generated/tasks.md`.

## Data model

### New tables

| Table | Module | Key columns |
|---|---|---|
| `office_locations` | core-hr | tenant_id, name, country_code, address, latitude, longitude, geofence_radius_m, ip_allowlist |
| `work_week_patterns` | time-leave | tenant_id, scope_type, scope_id, country_code, days_json, effective_from, effective_to |
| `company_closures` | time-leave | tenant_id, name, start_date, end_date, division_id, country_code |
| `staff_calendar_days` | time-leave | tenant_id, worker_id, calendar_date, day_type, leave_request_id, source |
| `worker_statutory_ids` | core-hr | tenant_id, worker_id, country_code, field_key, field_value, expiry_date — UNIQUE (tenant_id, worker_id, field_key) |
| `worker_bank_accounts` | core-hr | tenant_id, worker_id, bank_name, account_holder_name, account_number_encrypted, iban_encrypted, swift_bic, bank_country_code, is_primary, effective_from, effective_to — partial unique one primary per worker |
| `employee_skills` | core-hr | tenant_id, worker_id, skill_name, proficiency, visibility |
| `employment_records` | core-hr | tenant_id, worker_id, title, department_id, division_id, effective_from, effective_to, change_type, notes, source_document_id |
| `legal_entity_division_mappings` | core-hr | tenant_id, legal_entity_id, division_id, country_code, is_default, priority, effective_from, effective_to |
| `legal_entity_currencies` | core-hr | tenant_id, legal_entity_id, currency_code, is_default, is_active |
| `legal_entity_signatories` | core-hr | tenant_id, legal_entity_id, worker_id, name, title, email, signature_image_blob_url, is_default, is_active, effective_from, effective_to |
| `signing_certificates` | esign | tenant_id, legal_entity_id, key_vault_secret_name, certificate_subject, issuer, serial_number, valid_from, valid_to, thumbprint, status, last_reviewed_at |
| `tenant_currencies` | country-config | tenant_id, currency_code, is_active, is_reporting_currency |

### Alter existing tables

| Table | Add / change |
|---|---|
| `workers` | office_location_id, job_title, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, address_line1, address_line2, city, state_province, postal_code, address_country_code; **drop** statutoryFields after backfill |
| `attendance_punches` | work_mode, accuracy_meters, office_match, device_info |
| `attendance_day_summaries` | total_hours, lop_days |
| `leave_requests` | is_half_day (boolean, default false) |
| `legal_entities` | logo_blob_url, page_numbering_enabled, payroll_export_profile_id (nullable FK) |
| `esign_envelopes` | legal_entity_id, generated_document_id |
| `esign_audit_events` | ip_address, user_agent |
| `esign_fields` | value (nullable text) |
| `document_templates` | requires_signature (boolean, default false) |
| `policy_versions` | requires_reacknowledgement (boolean, default false) |
| `finance_export_profiles` | export_type, version |
| `clearance_items` | tenant_id, owner_worker_id, due_at, is_blocking |
| `separation_cases` | initiation_type, notice_date, settlement_notes, exit_interview_id, letter_document_id |

### Doc renames (already in code — sync design text)

| Design name (old) | Implemented table |
|---|---|
| `separations` | `separation_cases` |
| `clearance_tasks` | `clearance_items` |
| `onboarding_instances` | `onboarding_cases` |

## Migration waves (one PR)

1. **Currency + legal entity graph** — tenant_currencies; legal_entity_division_mappings, legal_entity_currencies, legal_entity_signatories, signing_certificates; legal_entities alters  
2. **Core HR profile** — office_locations; workers alters; worker_statutory_ids + backfill + drop JSONB; worker_bank_accounts; employee_skills; employment_records  
3. **Time / leave / calendar** — work_week_patterns, company_closures, staff_calendar_days; attendance_punches / day_summaries / leave_requests alters  
4. **Documents / e-sign / policy / finance export** — column alters listed above  
5. **Separation / clearance** — separation_cases + clearance_items alters  

## Statutory backfill

For each worker with non-empty `statutoryFields` JSON object, insert one `worker_statutory_ids` row per key:

- `country_code` = `workers.countryCode`
- `field_key` = JSON key
- `field_value` = string value
- `expiry_date` = null

Then drop `workers.statutoryFields`. Provide a small helper used by core-hr (and any readers) to load statutory map from the new table so existing unit tests can be pointed at the helper without full API rewrite.

## Bank accounts

- Sensitive numbers stored as `BYTEA` columns `account_number_encrypted` / `iban_encrypted` (same pattern as `pre_boarding_field_values.value_encrypted`).
- Until encryption service exists, local/dev may write UTF-8 bytes of plaintext into those columns; production Finance UAT requires real encryption.
- Payroll export (later pass) reads primary active account for worker; redaction unchanged.

## Testing (this pass)

- Migration up/down smoke on local Docker Postgres
- Unit test: statutory backfill helper (sample JSON → rows)
- Entity registration compile (`tsc` / Jest affected modules)
- No UI e2e

## Success criteria

- [ ] `database-design.md` documents every table/column in this design
- [ ] Migrations create/alter all listed objects
- [ ] Entities exist and are registered
- [ ] No remaining `statutoryFields` column; data preserved in `worker_statutory_ids`
- [ ] Field-level re-audit script reports 0 missing columns for in-scope tables
- [ ] Existing backend tests that touched statutory JSON still pass via shim

## Follow-up (explicit next pass)

Vertical slices: office geofence + punch matching; worker profile/bank CRUD + redaction; legal-entity resolve via mappings; calendar using `work_week_patterns`; separation clearance owners; encrypt-at-rest for bank/statutory.
