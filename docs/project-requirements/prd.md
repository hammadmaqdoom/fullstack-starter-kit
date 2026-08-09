# Polaris — Product Requirements Document

**Product name:** Polaris (Digitaro internal HR platform)  
**Document owner:** Hammad (Founder & CEO)  
**Status:** Approved for implementation  
**Version:** v0.14  
**Last updated:** 10 August 2026  
**Audience:** Digitaro Labs engineering, People Ops, Finance, IT, founders  
**Companions:** [product-brief.md](./product-brief.md) · [srs.md](./srs.md) · [system-architecture.md](./system-architecture.md) · [../compliance/feature-flows.md](../compliance/feature-flows.md)

> **Implementation stack note:** §10 describes the original .NET 9 + Angular recommendation. The authoritative implementation stack is **NestJS 10 + Next.js 16 + Better Auth + PostgreSQL** — see [system-architecture.md](./system-architecture.md). Functional requirements in §1–9 and §11–15 remain canonical. Frontend is a responsive **PWA** (not Capacitor); e-sign UI is Next.js, not Angular.

---

## 1. Overview

Product name: **Polaris** — Digitaro's internal HR platform. "HRMS" remains acceptable as a category label (e.g. industry comparisons, code namespaces like `Digitaro.Hrms.*`) but all product-facing references use Polaris.

Digitaro currently runs HR through a combination of Microsoft 365, Xero, manually maintained policy documents, and ad-hoc spreadsheets. As headcount grows across two divisions (Labs and Studio) and three jurisdictions (Pakistan, UAE, Singapore), this stack does not scale: leave is tracked manually, onboarding is inconsistent, employee records live in multiple places, and there is no single source of truth for the ISO-aligned policy suite that staff are expected to follow.

Polaris is Digitaro's internal HR platform — a responsive web application optimised for both desktop browsers and mobile devices — that becomes the single system of record for the workforce. It operationalizes the existing HR policy suite, automates the repetitive People Ops workflows (onboarding, leave, attendance, document acknowledgement, offer/contract/NDA generation with native e-signatures or manual sign-and-upload), calculates payroll inputs with country-aware rules, and integrates with Microsoft Entra ID for identity. Finance outputs (pay runs, contractor batches, expense summaries) export as PDF and Excel for manual entry into Xero — no live Xero API integration.

**Secondary opportunity:** because Digitaro Labs builds custom enterprise SaaS, a well-architected Polaris — including a native e-signature module — is a candidate for productization later. A multi-tenant HR platform with built-in signing tuned for cross-border SMEs (Pakistan/GCC/Singapore) is an underserved niche. This PRD is scoped to the internal build first, but architectural decisions should not preclude a future multi-tenant version.

**Compliance & operational flows:** ISO 9001, ISO 30400-series (HR), ISO 27001/27701 (security & privacy), and SOC 2 controls are mapped to every Polaris module in [compliance/iso-soc-framework.md](../compliance/iso-soc-framework.md) and step-by-step feature flows in [compliance/feature-flows.md](../compliance/feature-flows.md). Deferred compliance work (SOC 2, DSAR, access review): [compliance/deferred-compliance-work.md](../compliance/deferred-compliance-work.md).

---

## 2. Problem statement

**Fragmented records.** Employee data is spread across M365, Xero, signed PDFs, and spreadsheets. There is no authoritative profile per employee.

**Manual leave and attendance.** Leave requests happen over Teams/email; balances are tracked by hand; there is no audit trail, no shared team calendar, and no consistent check-in/check-out for remote or in-office staff.

**Inconsistent onboarding/offboarding.** No standard checklist, no automated provisioning/deprovisioning trigger, no guarantee that policy acknowledgements are captured.

**Policy compliance is unverifiable.** The ISO-aligned policy suite exists as documents, but there is no record of who has read/accepted which version.

**Cross-border complexity is invisible.** Pakistan, UAE, and Singapore have different statutory deductions, leave entitlements, visa/work-permit obligations, and currencies. None of this is currently modelled.

**Manual HR document production.** Offer letters, contracts, and NDAs are drafted in Word with copy-paste from employee records; letterhead varies by entity; there is no template library, version control, audit trail, or in-system signing.

**Payroll is a spreadsheet exercise.** Attendance, leave, and salary adjustments are collated manually each month before Finance re-enters them into Xero; there is no pay register, variance reporting, or single source of truth for what was paid.

**No People analytics.** Leadership cannot answer basic questions: current headcount by division/country, attrition, leave liability, upcoming visa expiries, probation due dates.

---

## 3. Goals & success metrics

| Goal | Metric | Target (6 months post-launch) |
|---|---|---|
| Single source of truth | % of employees with complete profiles | 100% |
| Automate leave | % of leave requests processed in-system | 100% |
| Faster onboarding | Median onboarding cycle time | < 2 business days |
| Policy compliance | % of staff with current-version policy acknowledgements | 100% |
| Reduce People Ops admin | Hours/week spent on manual HR admin | −60% |
| Visa/permit risk | Visa/work-permit expiries missed | 0 |
| Self-service adoption | % of routine queries resolved via self-service | > 70% |
| Daily check-in adoption | % of working days with check-in recorded (remote + in-office) | > 95% |
| Document turnaround | Median time from hire decision to signed offer letter | < 1 business day |
| E-sign completion rate | % of envelopes completed without manual PDF upload fallback | > 90% |
| Payroll accuracy | Pay runs requiring manual correction after Finance review | < 5% |
| Payroll cycle time | Hours from pay-period close to approved export pack | < 4 hours |

---

## 4. Scope

### In scope (this initiative)

- **Core HR** — employee records, org structure, employment types (full-time, part-time, contractor, etc.), skills & career history, profile change approvals, shift rosters
- **Self-service employee portal**
- **Talent** — recruitment, onboarding, separation (multi-dept clearance), performance management, training & learning tracking
- **Leave & absence management** (country-aware, comp-off)
- **Work calendar & holidays** — admin-configured work days, public holidays, and company closures; automated per-employee staff calendars
- **Attendance & daily check-in/check-out** — remote and in-person staff, dynamic team visibility, shift scheduling
- **Document & policy management** with acknowledgements
- **HR letters & contracts** — full letter library for employees and contractors (auto-generated from templates), letterhead, merge fields, native e-signature platform
- **Operations** — expense claims (travel, food, medical, general), contractor invoice submission & payment portal, travel requests & approvals, help desk (HR/IT/admin tickets)
- **Pay & benefits** — payroll calculation, statutory rates, payslip self-service, benefits & allowances tracking, PDF/Excel export for Finance (manual Xero entry)
- **Compliance tracking** (visa/work permit, probation, statutory IDs)
- **Automation** — scheduled compliance alerts, birthdays/anniversaries, custom alert rules, scheduled reports
- **Manpower planning** — headcount plans, vacancy tracking, resource allocation vs actuals
- **Currency management** — dynamic multi-currency catalog, daily FX API auto-fetch, exchange rate overrides, country/entity defaults, conversion rules
- **Reporting & analytics**
- **Identity integration** — Entra ID SSO for employees; Polaris email login for contractors (no Entra required). Entra link status tracked on all profiles for IT record-keeping.

### Out of scope (for now)

- Full statutory filing / remittance (EOBI, CPF, WPS bank submissions remain in dedicated statutory tooling; Polaris calculates, exports payslips, does not remit)
- Multi-tenant productization (explicitly deferred; architecture should not block it)
- Third-party e-sign SaaS (DocuSign, Adobe Sign) — replaced by native platform
- Qualified electronic signatures (QES) / hardware token signing — simple and advanced electronic signatures only
- External counsel / board signers without Polaris or Entra access (deferred; use signed PDF upload)
- External LMS content authoring (training tracks completion; courses may link to M365/external URLs)
- Travel booking / GDS integration (travel module covers request, approval, itinerary — not flight/hotel booking engines)

---

## 5. Users & roles

| Role | Description | Key permissions |
|---|---|---|
| **Employee** | Any staff member, both divisions | View own profile, submit profile change requests, view payslips & benefits, daily check-in/check-out, view personal work calendar, request leave/travel/expenses, raise help desk tickets, complete training assignments, view performance goals, acknowledge policies, sign HR documents |
| **Contractor** | CONTRACTOR / CONSULTANT workers | Contractor portal: submit invoices, view invoice/payment status, download remittance documentation packs (banking compliance), upload supporting docs, sign assigned HR documents (NDA/SOW), optional check-in; no employee-only modules (leave, payslips) unless configured |
| **Manager** | Team/project lead with direct reports | Approve leave/expenses/travel/profile changes, approve contractor invoices, conduct performance reviews, view team calendar and live check-in status, manage shift rosters (where assigned), resolve/help escalate team tickets |
| **Finance** | Finance team | Currency catalog & exchange rates, statutory payroll rates, pay runs, payslip release, benefits/allowance config, expense/travel final approval, contractor invoice final approval & payment batch, remittance documentation packs (SWIFT / payment proof upload), payroll/contractor export packs (PDF/Excel), payroll reports |
| **Super Admin** | System owner | Full configuration, role management, audit log access, country/policy config, base reporting currency, org signing certificate and e-sign settings |
| **People Ops / HR Admin** | HR operators | Full worker CRUD, recruitment pipeline, work calendars & holidays, onboarding/separation workflows, policies, leave types, document templates, e-signatures, training catalog, manpower plans, scheduled alerts & reports, help desk (HR queue), invite contractors to portal |
| **IT Admin** | IT operators (role or delegated) | Help desk IT queue, onboarding/offboarding IT clearance tasks, asset return sign-off, Entra / M365 auto-provisioning (Graph API) configuration and failure remediation, update Entra provisioned status on worker profiles |
| **Division Head** | Ammar (Studio), Hammad (Labs) | Division-scoped analytics, hiring requisition approval, manpower plan approval, performance calibration |

Roles are additive; a person may hold more than one (e.g., a Manager who is also a Division Head). Access is enforced by RBAC plus row-level scoping (own data / team data / division data / all).

---

## 6. Functional requirements

### 6.1 Core HR & employee records

Single worker profile (employees and contractors share the same record shape; behaviour differs by employment type — see §6.1.1): personal details, contact, emergency contact, employment details (division, department, role, manager, location/country, employment type, work mode: remote / hybrid / in-office, start date, end date, probation end where applicable), compensation band (restricted visibility), statutory IDs.

- **Skills & competencies** — taggable skills with proficiency level; visible on profile and directory (configurable visibility).
- **Career history** — internal role changes, promotions, transfers, compensation revisions (timeline view; sourced from HR letters and manual entries).
- **Profile change requests** — employee submits changes (address, phone, emergency contact, bank details); People Ops or manager approves before master record updates.
- **Benefits snapshot on profile** — derived live from active EmployeeBenefit assignments (§6.12.4); employee-visible fields only; read-only for employee; Finance/HR edits via benefit assignment UI.
- **Country-specific ID fields** surfaced conditionally:
  - **Pakistan:** CNIC, EOBI number, provincial social security (SESSI/PESSI) reference, NTN.
  - **UAE:** Emirates ID, labour card number; passport & visa records per §6.1.2 (current + previous visa with attachments).
  - **Singapore:** NRIC/FIN (citizens/PRs), CPF account reference (where applicable); passport & work-pass records per §6.1.2 (current + previous pass with attachments).
- **Passport & visa / work-pass records (UAE & Singapore)** — see §6.1.2. Captured at pre-boarding (§6.3.1) and maintained on the worker profile through employment; supports visa renewal and new-sponsorship processing with full history.
- **Document attachments** per profile (contract, signed offer, ID copies) with version history.
- **Entra ID status** (record-keeping only — does not gate contractor portal): `not_required` | `pending` | `provisioned` | `disabled`; optional `entra_object_id` when IT links account. Visible on profile and filterable in reports (Who has Entra / who doesn't).
- Full audit trail on every field change (who, what, when, old → new value).
- Soft-delete / archival for departed workers (retention-policy aware).

#### 6.1.1 Employment types & worker classification

Every person in Polaris has an employment type that drives entitlements, workflows, document templates, payroll treatment, and portal access. Types are configurable by Super Admin; defaults below ship out of the box.

**Standard employment types**

| Type | Code | Typical use at Digitaro |
|---|---|---|
| Full-time employee | `FULL_TIME` | Permanent staff, standard hours, full benefits |
| Part-time employee | `PART_TIME` | Reduced hours; pro-rated leave and pay |
| Fixed-term employee | `FIXED_TERM` | Contract end date on profile; renewal alerts |
| Contractor (individual) | `CONTRACTOR` | Studio creatives, Labs specialists, freelancers; SOW/project-based |
| Agency / temp worker | `AGENCY` | Staff supplied via agency; agency name on profile |
| Intern | `INTERN` | Trainees; limited entitlements, internship agreement |
| Consultant | `CONSULTANT` | Senior advisory retainers (not typical freelancers) |

**Terminology:** Freelancer is not a separate system type — use `CONTRACTOR`. UI may show the badge label "Freelancer" or "Contractor" interchangeably (configurable display alias). Use `CONSULTANT` only for longer-term advisory engagements on retainer, not project freelancers.

**Per-type configuration (country-aware)**

People Ops configures a matrix: employment type × country → module rules.

| Rule dimension | Full-time / Part-time / Fixed-term | Contractor / Consultant | Agency / Intern |
|---|---|---|---|
| Leave entitlements | Full or pro-rated (part-time) | Usually none; configurable exception | None or limited (intern policy) |
| Daily check-in | Required | Required (billable hours) or optional per config | Per agency agreement |
| Payroll | Monthly pay run + statutory deductions | Contractor payment run (fee, no EOBI/CPF) or excluded | Agency invoice tracking optional |
| Benefits | Eligible per country rules | Typically excluded | Excluded |
| Probation | Yes (configurable period) | No | Intern probation optional |
| Performance reviews | In cycle populations | Optional / excluded by default | Excluded |
| Onboarding template | Employee onboarding | Contractor onboarding (lighter) | Agency + intern variants |
| HR documents | Employment contract, offer | Contractor agreement, SOW, NDA | Internship letter, agency terms |
| Statutory IDs | Full set per country | Tax ID / NTN as needed; no EOBI/CPF enrolment | Minimal |
| Entra ID account | Expected; SSO for employee portal | Not required — `entra_status: not_required` default | Per policy |
| Directory & org chart | Included | Included (badge shows type) | Included |
| Manpower headcount | Counts as FTE (part-time = FTE fraction) | Non-FTE / external capacity | Non-FTE |
| Separation workflow | Full clearance + settlement | Contract end / early termination; simplified clearance | Contract end |

**FTE calculation:** Full-time = 1.0 FTE; part-time = configurable fraction (e.g. 0.5 for 20h/week). Headcount and manpower reports show FTE and total workers separately.

**Employment type on profile:** Required field at hire; changes via HR action (not self-service) with effective date and audit trail. Type change (e.g. contractor → full-time) triggers conversion workflow: new documents, updated entitlements, onboarding tasks for gaps.

**Contractor-specific fields** (surfaced when type = `CONTRACTOR`, `CONSULTANT`, or `AGENCY`):

- Contract/SOW start & end dates, renewal date
- Billing model: `day rate` | `hourly` | `fixed fee` | `retainer`
- Payment currency and terms (net-15, net-30)
- Agency name & contact (for `AGENCY`)
- VAT/GST registration number where applicable
- Whether worker is inside IR35/off-payroll equivalent (SG: not applicable; document for PK/UAE as needed)

**Document & template routing:** Employment type selects default template set (§6.8): e.g. `FULL_TIME` → employment contract; `CONTRACTOR` → contractor services agreement. Offer/hire from recruitment (§6.15) carries employment type from requisition to profile.

**Entra ID tracking (not an access gate)**

Entra is for employees logging into the main portal. Contractors use Polaris email login (§6.20) — independent of Entra.

| `entra_status` | Typical worker | Meaning |
|---|---|---|
| `not_required` | Most contractors | No M365/Entra expected; portal works without it |
| `pending` | New employee | IT task open; account not yet created |
| `provisioned` | Employee (some contractors) | Entra account exists; `entra_object_id` stored |
| `disabled` | Leaver | Account revoked; historical link retained |

People Ops / IT update status via Graph auto-provisioning (FLW-SEC-006), Entra sync webhook, or manual UI override.

Reports: headcount with/without Entra, contractors with Entra (optional), employees still pending after N days.

Provisioning Entra for a contractor is optional (e.g. needs Teams) — never required for invoices or portal access.

**Payroll routing**

- Employees (`FULL_TIME`, `PART_TIME`, `FIXED_TERM`, `INTERN` with pay): included in country pay run (§6.12) with statutory deductions per config.
- Contractors (`CONTRACTOR`, `CONSULTANT`): submit invoices via contractor portal (§6.20); approved invoices included in contractor payment batch — gross fee, optional withholding tax per country, no employer statutory contributions; included in contractor export pack for manual accounting entry.
- Agency (`AGENCY`): payment to agency tracked separately; individual may have zero payroll rows.

**Acceptance criteria (employment types)**

- Given a new Studio contractor, when profile is created with type `CONTRACTOR`, then contractor onboarding template, auto-generated services agreement + SOW + NDA, and contractor payment batch rules apply automatically.
- Given a part-time employee at 0.5 FTE, when leave is accrued, then annual entitlement is 50% of full-time country default.
- Given a contractor with no leave entitlement, when they request annual leave, then the system blocks or routes to exception approval per country config.
- Given headcount report filtered to FTE only, when contractors are active, then they are excluded from FTE total but included in total worker count.

#### 6.1.2 Passport, visa & work-pass records (UAE & Singapore)

For workers in UAE and Singapore, Polaris maintains structured passport data and a visa / work-pass history so People Ops has a complete record before and after new sponsorship — including previous visa status when processing a new visa.

**Scope:** Required for employees and contractors in AE/SG where work authorization applies; surfaced in pre-boarding (§6.3.1), worker profile, compliance alerts (§6.10.1), and reports (§6.11).

**Passport (all AE/SG workers)**

| Field | Notes |
|---|---|
| Passport number | |
| Nationality (passport) | ISO country |
| Issuing country | |
| Place of issue | Optional |
| Issue date | |
| Expiry date | Drives passport-expiry alerts |
| Attachments | Bio page scan (required); full passport copy (optional) |

**UAE — visa records**

Each worker has one or more visa records with `record_type`: `previous` | `current`. Pre-boarding captures at minimum one previous record (or `never_had_uae_visa` status). People Ops adds current when MOHRE/PRO processing completes.

| Field | Applies to | Notes |
|---|---|---|
| `visa_status` | previous | `never_had_uae_visa` \| `cancelled` \| `expired` \| `active_other_employer` \| `visit_visa` \| `other` |
| Visa type | previous / current | `employment` \| `visit` \| `dependent` \| `golden` \| `green` \| `other` |
| Visa number | previous / current | |
| Sponsor / employer name | previous / current | Previous employer or Digitaro entity |
| UID number | current | MOHRE UID where applicable |
| Labour card number | current | Links to Emirates ID workflow |
| Emirates ID number | current | When issued |
| Issue date | previous / current | |
| Expiry date | previous / current | Drives visa-expiry alerts |
| Cancellation date | previous | When prior visa was cancelled |
| Cancellation reason | previous | Free text / picklist |
| Application status | current (pre-issue) | `pending_sponsorship` \| `application_in_progress` \| `approved` \| `stamped` \| `active` |
| Attachments | per record | Previous visa copy, cancellation stamp, entry-permit PDF, labour card copy, Emirates ID copy |

**Singapore — work-pass records**

Same `record_type` pattern: `previous` | `current`. Pre-boarding captures previous pass details; People Ops records new pass when MOM approves.

| Field | Applies to | Notes |
|---|---|---|
| `pass_status` | previous | `never_had_pass` \| `cancelled` \| `expired` \| `active_other_employer` \| `dependent_pass` \| `visit_pass` \| `other` |
| Work pass type | previous / current | `EP` \| `S_Pass` \| `Work_Permit` \| `Dependant_Pass` \| `LOC` \| `TEP` \| `other` |
| FIN / work pass number | previous / current | |
| NRIC | current | Citizens/PR only |
| Previous employer | previous | |
| Issue date | previous / current | |
| Expiry date | previous / current | Drives work-pass expiry alerts |
| Cancellation date | previous | |
| IPA reference | current (pre-issue) | In-Principle Approval ref while pending |
| Application status | current (pre-issue) | `pending_sponsorship` \| `ipa_approved` \| `issued` \| `active` \| `renewed` |
| Attachments | per record | Passport (linked), previous work-pass copy, IPA letter, cancellation letter, MOM approval PDF |

**Lifecycle & audit**

- Pre-boarding merge creates `worker_passports` row + `worker_visa_records` (previous); current may be stubbed as `pending_sponsorship` until PRO/MOM completes.
- People Ops updates current record when new visa/pass is issued — prior current auto-archives to previous if superseded.
- All record changes append to `audit_log`; attachments versioned in Blob with classification Restricted.
- Compliance alerts (§6.10.1) use `expiry_date` on passport and active current visa/pass.

**Acceptance criteria (visa & passport)**

- Given a UAE hire in pre-boarding, when they submit passport and previous visa details with attachments, then data merges to `worker_passports` and `worker_visa_records` without re-entry.
- Given a SG hire who never held a work pass, when they select `never_had_pass`, then previous-pass fields are optional and current record defaults to `pending_sponsorship`.
- Given People Ops receives a new employment visa, when they update the current visa record with number and expiry, then visa-expiry alerts schedule from the new dates and previous visa remains in history.
- Given passport expiry within 90 days, when the daily compliance job runs, then People Ops and the worker's manager are alerted.

### 6.2 Organization structure & directory

- Org chart auto-generated from manager relationships, filterable by division, department, country.
- Searchable company directory (name, role, division, location, contact, employment type) respecting field-level visibility; type shown as badge (Employee, Contractor, Intern, etc.).
- Support for matrix/project assignments (an engineer in Labs may report to a project lead while sitting under a functional manager) — model reporting lines and project assignments separately.

### 6.3 Onboarding

Onboarding is a two-phase process: **pre-boarding** (between offer acceptance and start date, at the candidate's personal email) and **day-1 activation** (policies, training, assets, live Entra access). Flow references: FLW-TAL-006, FLW-TAL-002, FLW-SEC-006.

#### 6.3.1 Pre-boarding (personal email, pre-hire PII)

Collects HR and payroll data before the start date so Finance and People Ops do not re-key information on day one.

- **Trigger:** Offer accepted (recruitment §6.15.4) or People Ops creates an approved hire with a future start date.
- **Authentication:** Secure magic link to the candidate's personal email — no Entra account required. Session scoped to the pre-boarding packet only (same pattern as contractor magic-link auth §6.20).

**Workflow:**

1. System creates a `pre_boarding_packet` linked to the worker profile (`pre_boarding` status).
2. Magic link sent to personal email (15-minute TTL, rate-limited, invalidatable on resend).
3. Candidate accepts pre-employment data processing notice (lawful basis, purpose limitation, retention, data-subject rights) — consent timestamp stored (ISO 27701).
4. Candidate completes country-conditional fields:
   - **All countries:** personal details, emergency contact, bank details, ID document uploads.
   - **Pakistan:** CNIC, NTN.
   - **UAE:** Emirates ID (if already held); passport details (§6.1.2); previous visa status & history (type, number, sponsor, dates, cancellation); passport bio-page and previous-visa attachments.
   - **Singapore:** NRIC/FIN (if citizen/PR); passport details (§6.1.2); previous work-pass status & history (type, FIN, employer, dates, cancellation); passport and previous-pass attachments.
5. System flags anomalies (duplicate bank account, invalid tax ID format, passport expiry before start date) for Finance / People Ops review.
6. On start date (or People Ops Confirm hire): packet auto-merges into the worker profile — including `worker_passports` and `worker_visa_records` — no re-entry.
7. Triggers day-1 onboarding (§6.3.2) and schedules Entra provisioning (§6.3.2 / FLW-SEC-006).

**Field visibility after merge:** bank and tax IDs restricted to Finance; passport and visa/pass records to People Ops; statutory IDs to People Ops + Finance; standard profile fields per §6.1 redaction rules.

**Offer withdrawn / no-show:** packet cancelled; candidate PII deleted per recruitment retention (12 months) unless legal hold.

#### 6.3.2 Day-1 onboarding (workforce activation)

Begins when pre-boarding is complete (or waived by People Ops with audit reason) and the start date is reached.

- Configurable onboarding templates per employment type, division, and country (employee vs contractor vs intern paths).
- Task checklist with owners (IT provisioning confirmation, HR docs, hardware, accounts), due dates, and status.
- **Entra / M365 auto-provisioning** for employees via Microsoft Graph API (FLW-SEC-006):
  - Job scheduled for `start_date − N` days (default 3 business days, configurable).
  - Creates Entra user, assigns license, enables mailbox, adds security groups / Teams memberships.
  - Stores `entra_object_id`; sets `entra_status: provisioned` on success.
  - On Graph API failure after retries: IT manual task + webhook or UI fallback.
  - Optional IT task for contractors who need M365 access (`entra_status` remains `not_required` by default).
- Mandatory policy acknowledgement bundle on first employee login.
- Auto-generate documents from templates if not already issued at offer stage:
  - **Employees:** offer letter, employment contract, NDA
  - **Contractors:** services agreement, SOW, NDA (configurable bundle per §6.8.3)
- Attach generated docs to onboarding checklist with e-sign tracking; portal invite sent for contractors.
- New hire confirms pre-merged profile data; completes only missing fields (fallback if pre-boarding was waived).
- **Gate:** Onboarding cannot complete until mandatory documents signed, policies acknowledged, and Entra provisioned (employees) or waiver recorded.

#### 6.3.3 Onboarding templates & configuration

- Templates scoped by employment type × country × division.
- Task types: People Ops, IT, Finance, Manager, Employee self-serve.
- Pre-boarding field manifest configurable per template (which PII fields are mandatory pre-hire); AE/SG templates must include passport + previous visa/pass block per §6.1.2.
- Work-email naming rule configurable per legal entity (e.g. `firstname.lastname@digitaro.com`).
- Entra group / license SKU mapping per division and country.

#### 6.3.4 Acceptance criteria (onboarding)

- Given an employee with offer accepted and personal email on file, when pre-boarding is triggered, then a magic link is sent to the personal email and the candidate can submit tax ID, bank, emergency contact, and (for AE/SG) passport and previous visa/pass details without an Entra account.
- Given a UAE pre-boarding packet, when the candidate uploads passport bio page and previous visa copy, then attachments are stored as Restricted and linked to the visa record on merge.
- Given a SG pre-boarding packet with `never_had_pass`, when submitted, then previous-pass fields are optional and a current work-pass stub is created with `pending_sponsorship`.
- Given a submitted pre-boarding packet, when the start date arrives, then fields auto-merge into the worker profile and day-1 onboarding checklist is instantiated.
- Given an employee with start date in 3 days, when the Entra provisioning job runs, then an Entra user is created via Graph API, license assigned, and `entra_status` becomes `provisioned` before start date.
- Given Graph API failure after 3 retries, when IT receives the alert, then a manual provisioning task is open and onboarding cannot complete until `entra_status` is `provisioned` or waived.
- Given a contractor hire, when onboarding starts, then pre-boarding collects tax/bank data at personal email and contractor portal invite is sent; `entra_status` remains `not_required` unless IT optionally provisions M365.
- Given pre-boarding incomplete on start date, when People Ops views the onboarding dashboard, then status is blocked with a clear missing-items list unless waiver is recorded with reason.

### 6.4 Separation & offboarding

Structured exit journey from resignation/termination notice through multi-department clearance to final settlement.

#### 6.4.1 Separation initiation

- Triggered by: resignation (employee), termination (HR), contract end, or mutual agreement.
- Capture: last working day, notice period served/waived, reason code (restricted visibility), handover notes.
- Auto-generate offboarding letters from templates (§6.8): experience letter for employees; contract completion / termination letter for contractors.

#### 6.4.2 Multi-department clearance workflow

Parallel clearance tasks with owners, due dates, and sign-off — separation cannot complete until all mandatory clearances are Cleared or Waived (with approver reason).

| Department | Typical clearance items |
|---|---|
| Manager | Knowledge handover complete, project access revoked, exit interview scheduled |
| People Ops | HR documents returned, policy equipment, final leave balance confirmed |
| IT | Entra ID disable scheduled, laptop/phone returned, account access revoked, MFA reset |
| Finance | Expense/travel claims settled, company card returned, advance recovery |
| Admin/Facilities | ID badge, keys, parking pass returned (in-office hubs) |

- Configurable clearance templates per division/country (Studio may require asset checklist; remote Labs may skip facilities).
- Each task: `Pending` → `In progress` → `Cleared` | `Blocked` | `Waived`; blocked items escalate to People Ops.
- Dashboard: separation pipeline with overdue clearances.

#### 6.4.3 Exit interview & settlement

- Exit interview form (structured questions + free text); stored on employee record (restricted).
- Final settlement worksheet: leave encashment, gratuity/EOS (UAE), notice pay/deductions → feeds payroll (§6.12).
- Trigger Entra ID disable / access revoke on last working day (automated or confirmed task).

#### 6.4.4 Acceptance criteria (separation)

- Given a resignation with last day Friday, when IT clearance is not marked Cleared, then separation status remains In progress and payroll final settlement is blocked.
- Given all clearances Cleared, when People Ops closes separation, then employee status becomes Archived and experience letter is available.

### 6.5 Leave & absence management

- Country- and policy-defined leave types and entitlements (annual, sick, casual, maternity/paternity, bereavement, unpaid). Entitlements are configurable per country and employment type to match local law and the Digitaro policy suite.
- Accrual rules engine: per-annum allotment vs monthly accrual, carry-forward caps, pro-ration for mid-year joiners.
- Request → approval workflow routed to the employee's manager, with delegation when a manager is away.
- Staff calendar (automated): each employee sees a personal calendar auto-built from their work schedule, country/company holidays, approved leave, and check-in/check-out records — no manual calendar maintenance by staff.
- Real-time balance display; team calendar showing availability, leave, holidays, and who's checked in today; clash detection.
- Public and company holidays resolved from admin-managed calendars (see §6.6.1); applied automatically to working-day and leave calculations.
- Leave encashment calculation for offboarding.
- Half-day and hourly leave support.
- Comp-off (compensatory leave) — credit from approved overtime/weekend work; expiry rules configurable per country.
- Tenure-based entitlement tiers — accrual rates or caps that change at tenure milestones (configurable).

### 6.6 Work calendar, holidays & attendance

Digitaro operates a dynamic, distributed team across PK, UAE, and SG — mix of remote and in-office staff, project-based assignments, and shifting team composition. Attendance must work for everyone without office-only assumptions.

#### 6.6.1 Work calendar administration (People Ops / Admin)

Admins configure the calendars that drive all automated staff views and attendance rules.

**Work-week patterns**

- Define standard work days per scope: global default, by country, by division, or by individual employee override.
- Configure expected start/end times and core hours (or flexible window for remote, e.g. "any 8 hours between 06:00–22:00 local").
- Support non-standard weeks (e.g. UAE Sun–Thu, PK/SG Mon–Fri) without hard-coding.

**Holiday & closure management**

- Public holidays per country (PK, UAE, SG) — pre-loaded baseline calendar, editable by admin (add, remove, move observances).
- Company holidays / closures — division-wide or company-wide non-working days (e.g. year-end shutdown) assigned to populations.
- Optional working holidays — mark a public holiday as a working day for specific teams if needed.
- Bulk import holidays via CSV; recurring annual holidays auto-repeat each year unless changed.

**Effective dating**

- All calendar changes are effective-from dated; past attendance records are not retroactively altered.
- Audit trail on holiday and work-week edits.

#### 6.6.2 Automated staff calendar

Each employee's staff calendar is generated automatically — staff never maintain their own work-day grid.

| Calendar layer | Source | Display |
|---|---|---|
| Working days | Employee's work-week pattern + country | Default background |
| Public / company holidays | Admin holiday calendar for employee's country + assignments | Non-working (greyed) |
| Approved leave | Leave module | Leave type colour-coded |
| Pending leave | Awaiting approval | Tentative overlay |
| Check-in/out | Attendance module | Actual hours worked that day |
| Today | System | Highlighted; check-in CTA if not yet punched |

- Month / week / agenda views in employee portal and manager team view.
- Calendar feeds leave accrual, LOP calculation, and "is today a working day?" logic for check-in prompts.
- iCal export (optional v1) for personal Outlook/Google sync of approved leave + holidays only.

#### 6.6.3 Daily check-in & check-out

Every employee — remote and in-person — checks in and out each working day via Polaris on any device (desktop browser, tablet, or phone). The experience is first-class on web and mobile — not a desktop admin tool with a bolted-on mobile view.

**Check-in flow**

- On a working day (per staff calendar), employee sees Check in on dashboard and calendar.
- One tap/action records: timestamp (UTC + employee local timezone), work mode at punch (remote / in-office), optional note, and device + location context (see below).
- Check out records end time; system calculates hours worked for the day. Check-out captures the same device/location context as check-in.
- Single check-in/out pair per day by default; split shifts (check-out + check-in again) supported for Studio client-facing roles if configured.

**Device & location capture (every punch)**

- **Device:** user agent, device type (desktop / tablet / mobile), and client IP address — always logged.
- **Location:** captured on every check-in and check-out when the client can provide it (browser Geolocation API on phone/tablet; coarse IP geolocation fallback on desktop when GPS unavailable).
- Stored per punch: `latitude`, `longitude`, `accuracy_m` (GPS accuracy radius, when available), `location_source` (`gps` | `ip` | `unavailable`), `location_captured_at` (UTC), and `office_match` (advisory boolean — within configured geofence of employee's assigned office or any Digitaro hub when work mode is in-office).
- **Permission UX:** first check-in prompts for location permission once (plain-language: "used to verify office attendance, never blocks remote work"); denial does not block the punch — location fields stored as unavailable with reason.
- **Offline:** queued punches store last-known location at tap time; sync when online.
- Location is audit and advisory only in v1 — never hard-blocks check-in for remote staff or when GPS is denied/unavailable.

**Remote staff (default for Labs)**

- Check-in from any location; no geofence required.
- Work mode defaults to remote from employee profile; can toggle to in-office when visiting a hub.
- Device, IP, and location logged for audit and manager visibility (not used to block remote check-in).

**In-office / hybrid staff**

- Same check-in UI; work mode defaults to in-office (hybrid employees default from profile or last punch).
- Location compared against assigned office location geofence (§6.6.4); optional office IP allowlist as secondary signal.
- If work mode is in-office but punch location is outside the geofence → advisory flag (`office_match: false`) on the punch and in the manager exception queue — not a hard block in v1.
- Managers and People Ops can view punch location on the attendance detail view and monthly summary (map pin or lat/long + accuracy); employees see their own punch location history.

**Missed punch handling**

- No check-in by expected start + grace period → marked absent / missing punch; notification to employee and manager.
- Employee can request punch correction with reason; manager approves.
- Admin can backfill punches with audit trail.

**Dashboard widgets**

- **Employee:** today's status (not checked in / checked in since HH:MM / checked out), week hours summary.
- **Manager:** team roster with live status — In (green), Out (grey), On leave (amber), Missing punch (red) — for direct reports and project team members (see §6.6.5).

#### 6.6.4 Work mode & location

Per employee profile:

- Work mode: `remote` | `hybrid` | `in-office` (drives defaults and optional advisory rules).
- Primary timezone — used for calendar display and "start of working day" notifications (critical for distributed team).
- Office location (optional) — for hybrid/in-office; links to geofence/IP advisory config.

**Office geofence config (admin)**

- Each Digitaro office/hub has: name, address, centre coordinates (lat/lng), radius in metres (default 200m), and optional IP-CIDR allowlist.
- `office_match` on a punch is true when coordinates fall within any configured hub geofence, or within the employee's assigned office geofence.
- Geofence data is versioned and effective-dated; punch evaluation uses the config active at punch time.
- Work mode does not restrict check-in — a remote employee can mark in-office when at a Digitaro hub.

#### 6.6.5 Dynamic & project teams

Digitaro's team composition shifts by project. Managers need visibility beyond strict reporting lines.

- **Direct reports** — from org hierarchy (manager relationship).
- **Project team** — from project assignments (§6.2); manager/project lead sees check-in status and calendar availability for assigned members even if not their direct report.
- Team calendar filter: My team (reports) | Project: {name} | Division | Country.
- Respects privacy: employees see full detail for self; managers see status + leave blocks for team members, not compensation or personal contact unless role permits.

#### 6.6.6 Exceptions, timesheets & payroll hand-off

- Exception flags: late check-in, early check-out, missing checkout, hours below expected, overtime above threshold, checked in away from office (in-office work mode + `office_match: false`).
- Manager review queue for exceptions; bulk approve where appropriate.
- Timesheet capture (Studio / client billing): optional hours tagged to project/client on check-out or weekly timesheet entry.
- Monthly attendance summary auto-generated per employee: working days, holidays, leave days, present days, LOP days/hours → feeds payroll (§6.12).

#### 6.6.7 Notifications

- Morning reminder to check in (local time, only on working days per staff calendar).
- Reminder to check out if still checked in after expected end + grace.
- Manager digest: who hasn't checked in by core hours start.

#### 6.6.9 Shift scheduling & rosters

- Managers or People Ops publish shift rosters for teams requiring fixed shifts (e.g. Studio client support).
- Shift types: morning, evening, night, on-call — with start/end times per country timezone.
- Roster view on staff calendar; conflicts flagged against approved leave.
- Optional: check-in validates employee is on roster that day (advisory or enforced per division config).

#### 6.6.10 Acceptance criteria (calendar & attendance)

- Given a UAE public holiday added by admin, when any UAE employee views their staff calendar, then that day shows as non-working without manual staff action.
- Given a remote employee on a working day, when they check in from the portal, then status shows In on their dashboard and their manager's team view within 5 seconds.
- Given an employee on approved leave, when they attempt check-in, then the system warns leave is active but allows override with reason (or blocks — configurable per leave type).
- Given a manager with project assignments, when they open the project team view, then they see check-in status for all project members regardless of reporting line.
- Given month-end, when attendance summary is generated, then LOP days reflect missing punches and unpaid leave for payroll import.
- Given an employee checks in from a mobile device with location permission granted, when the punch is recorded, then `latitude`, `longitude`, `accuracy_m`, and `location_source` are stored on the AttendancePunch and visible in the punch audit trail.
- Given a hybrid/in-office employee with work mode in-office at punch time, when their location is outside the assigned office geofence, then the punch succeeds but `office_match` is false and an advisory exception appears in the manager review queue.
- Given location permission is denied or unavailable, when the employee checks in, then the punch succeeds with `location_source: unavailable` and device/IP still logged.

### 6.7 Document & policy management

- Central repository for the ISO-aligned policy suite, versioned.
- Assign policies to populations (all staff / by country / by division / by role).
- Capture electronic acknowledgement with timestamp and policy version; re-acknowledgement triggered automatically on new version publication.
- Compliance dashboard: who has/hasn't acknowledged what.

### 6.8 Contract & HR document generation

People Ops currently drafts offer letters, contracts, NDAs, and contractor agreements/SOWs manually in Word, copying worker details and pasting letterhead each time. This is slow, inconsistent across divisions, and hard to audit. Employees and contractors both receive auto-generated PDFs from the same template engine; employment type selects which templates and merge fields apply.

#### 6.8.1 Letterhead & legal-entity configuration

Configure one or more legal entities (e.g. Digitaro Labs PK, Digitaro Studio UAE) with:

- Company logo (upload, stored in Blob)
- Registered name, trading name, address, phone, email, website
- Registration numbers (trade licence, NTN, UEN, etc.) — country-specific fields surfaced conditionally
- Default signatory block (name, title, signature image optional)
- Footer text (confidentiality notice, page numbering)

Letterhead is resolved by the worker's country + division (or explicit entity override per document).

Preview letterhead before saving; changes apply to future generations only (existing issued PDFs are immutable).

#### 6.8.2 Document templates

Template library managed by People Ops / Super Admin. Templates are grouped by audience: employee, contractor, or shared (e.g. NDA).

**Employee document types**

Offer letter, employment contract, increment/salary revision, promotion, probation confirmation/extension, transfer, warning/disciplinary, experience letter

**Contractor document types** (auto-generated from contractor templates — same engine as employees)

- Contractor services agreement — master terms for `CONTRACTOR` / `CONSULTANT`
- Statement of Work (SOW) — project scope, deliverables, timeline, fees (standalone or schedule to agreement)
- NDA (mutual or one-way) — shared template or contractor-specific variant
- Contract renewal / extension letter — new end date, revised fees
- Contract termination / completion letter — early end or natural expiry
- Rate change letter — day-rate or fee revision mid-engagement
- Internship letter — for `INTERN` type

**Scoping & merge fields**

Each template is scoped by document type + country + employment type (and optionally division). E.g. UAE Studio contractor SOW is a separate template from PK Labs contractor services agreement.

Employee merge fields, e.g.:

- `{{employee.full_name}}`, `{{employment.job_title}}`, `{{employment.start_date}}`
- `{{compensation.base_salary}}`, `{{compensation.currency}}`, `{{compensation.pay_frequency}}`
- `{{employment.probation_period}}`, `{{employment.notice_period}}`
- `{{benefits.<type_code>.<field_code>}}`, `{{benefits.total_cash_allowances}}`, `{{benefits.list}}` (§6.12.4.7)

Contractor merge fields (from profile §6.1.1 + project assignment), e.g.:

- `{{contractor.legal_name}}`, `{{contractor.trading_name}}`, `{{contractor.tax_id}}`
- `{{contract.sow_title}}`, `{{contract.scope_of_work}}`, `{{contract.deliverables}}`
- `{{contract.start_date}}`, `{{contract.end_date}}`, `{{contract.billing_model}}`
- `{{contract.day_rate}}`, `{{contract.hourly_rate}}`, `{{contract.fixed_fee}}`, `{{contract.currency}}`
- `{{contract.payment_terms}}`, `{{contract.max_budget}}`, `{{project.name}}`, `{{project.client}}`
- `{{legal_entity.registered_name}}`, `{{signatory.name}}`

Rich-text or Markdown body with a defined merge-field schema per audience; invalid/unresolved fields block generation and surface a validation error.

Template versioning: edits create a new version; previously generated documents retain a snapshot of the template version used.

Optional clause blocks toggled per generation (e.g. IP assignment, confidentiality, UAE governing law, PK withholding tax clause for contractors).

#### 6.8.3 Document generation workflow

1. People Ops selects worker (employee, contractor, intern, or pre-hire candidate), document type, and template version.
2. System pre-fills merge fields from worker profile (and project/SOW fields for contractors); HR can override non-system fields before generation.
3. System renders PDF with letterhead + body → stored in Blob, linked to worker record.
4. Document status lifecycle: `Draft` → `Issued` → `Sent for signature` → `Signed` → `Archived`.
5. On Issued, attach to onboarding checklist (employee or contractor path) when triggered from onboarding workflow.
6. Worker views issued documents in self-service portal (employee portal or contractor portal §6.20); restricted fields redacted where appropriate.
7. E-signature via the native platform (§6.13) or signed PDF upload fallback; original generated PDF retained for audit.

**Contractor onboarding document bundle (auto-generated)**

When contractor onboarding starts, system generates configured document set from templates — same automation as employees:

| # | Default bundle (configurable) |
|---|---|
| 1 | Contractor services agreement |
| 2 | Statement of Work (SOW) |
| 3 | NDA |

Bundle defined per employment type + division + country in onboarding template settings.

Each doc → e-sign envelope (company signatory + contractor; sequential default).

Onboarding cannot complete until mandatory contractor documents are Signed.

SOW renewal: People Ops triggers regeneration from updated template + merge fields; new version linked to profile; optional e-sign.

#### 6.8.4 Acceptance criteria (document generation)

- Given a configured letterhead and country-scoped offer-letter template, when People Ops generates an offer for a PK full-time employee, then a PDF is produced with correct letterhead, merge fields, and stored on the profile within 30 seconds.
- Given a UAE contractor with SOW merge fields complete, when People Ops starts contractor onboarding, then services agreement, SOW, and NDA are auto-generated from contractor templates and attached to the onboarding checklist.
- Given a contractor SOW template update, when a new SOW is generated for an engagement renewal, then the new template version is used and the prior signed SOW remains unchanged on the profile.
- Given missing contractor merge fields (e.g. `contract.day_rate` not set), when generation is attempted, then the system blocks with a clear list of missing fields.
- Given a template version update, when a new document is generated, then the new version is used; previously issued documents are unchanged.
- Given an NDA issued during onboarding, when the worker completes signing (e-sign or uploaded copy), then the onboarding document task auto-completes.

### 6.9 Expense management

Digitized employee claims with policy enforcement and payroll/export hand-off.

- Categories: travel, food, medical, accommodation, transport, office supplies, client entertainment, other — configurable per division.
- Policy limits per category (daily/monthly caps, receipt required above threshold, per-diem rates by country/city).
- Employee submits: amount, currency, category, date, description, receipt upload (required above threshold).
- Travel-linked expenses — auto-associate with approved travel request (§6.17) where applicable.
- Workflow: employee → manager approval → Finance approval → reimburse via payroll or included in expense export summary.
- Multi-currency via currency catalog (§6.21); transaction currency preserved on every claim; conversion at Finance approval using active exchange rate.
- Employee dashboard: pending, approved, rejected, paid; policy violation warnings at submission.
- Approved claims appear in payroll or expense export pack (Excel) for Finance manual processing — no accounting API.

### 6.10 Alerts, reminders & scheduled notifications

#### 6.10.1 Compliance alerts (automated)

Visa/work-permit expiry (UAE/SG), passport expiry, probation end dates, contract end/renewal, document expiry, leave liability thresholds.

Configurable lead time per alert type; routed to People Ops and relevant manager.

#### 6.10.2 People & culture alerts

- Birthdays — notify manager and optional team channel (M365/Teams); employee opt-out supported.
- Work anniversaries — same pattern; milestone years (1, 3, 5, 10) highlighted.
- New joiner — team notification on start date.
- Absence patterns — alert manager if employee has 3+ unplanned absences in rolling 30 days (configurable).

#### 6.10.3 Custom alert rules

People Ops defines rules: trigger (field/date condition) + audience (employee, manager, HR, Finance) + lead time + channel (email, in-app, Teams webhook).

Examples: probation ends in 14 days, compensation review due, training overdue, clearance blocked > 3 days.

Rule library with enable/disable; audit trail on rule changes.

#### 6.10.4 Statutory registration & work-authorization tracking

- EOBI/SESSI (PK), WPS (UAE), CPF (SG) registration checklist per eligible employee.
- UAE / Singapore: passport expiry, visa/work-pass expiry, and application-status pipeline (`pending_sponsorship` → `active`) tracked on worker profile §6.1.2; feeds compliance alerts §6.10.1.

### 6.11 Reporting & scheduled reports

#### 6.11.1 Standard reports

Headcount by division/country/department, joiners/leavers, attrition rate, leave balances & liability, attendance summary, probation pipeline, visa expiry pipeline, Entra provisioned vs not required vs pending, recruitment funnel, training completion, help desk SLA, travel spend, gender/diversity (where lawful).

Payroll reports (§6.12): pay register, deduction summary, net-pay summary, variance vs prior period, cost-by-division/department.

Division-scoped dashboards for Ammar and Hammad.

#### 6.11.2 Scheduled report delivery

- People Ops / Finance / Division Heads subscribe to reports on daily, weekly, or monthly cadence.
- Delivery via email (PDF/Excel attachment) and in-app notification.
- Report parameters saved per subscription (country filter, division, date range).
- Execution log: last run, next run, failure retry.
- Export on-demand to CSV/Excel/PDF in addition to scheduled delivery.

### 6.12 Payroll calculation & finance export

Xero remains Digitaro's accounting tool, entered manually by Finance. Polaris is the system of record for payroll calculation inputs and the pay run itself — Finance exports approved runs as structured PDF and Excel packs; no Xero API integration.

#### 6.12.1 Pay components & employee compensation

- Per-employee compensation record: base salary, pay frequency (monthly), currency (from allowed list per country), effective dates.
- Cash allowances are not hard-coded on the compensation record — they are assigned via benefit types (§6.12.4) whose `payroll_treatment` includes them in gross; active assignments sync to the linked pay component type for pay-run calculation.
- Configurable pay component types per country (earnings, deductions, employer contributions).
- Support pro-ration for mid-period joiners/leavers.
- One-off adjustments (bonus, arrears, recovery) attachable to a specific pay run.

#### 6.12.2 Pay run calculation

- **Employee pay run** (types: `FULL_TIME`, `PART_TIME`, `FIXED_TERM`, paid `INTERN`) — monthly per country.
- **Contractor payment batch** (types: `CONTRACTOR`, `CONSULTANT`) — separate run: pulls approved contractor invoices (§6.20) and/or Finance-entered fees, applies withholding tax if configured; export pack for manual supplier payment processing.
- Monthly (or configurable) pay run per country, with states: `Draft` → `Review` → `Approved` → `Exported` → `Locked`.
- Auto-pull inputs for the pay period:
  - Active employees in scope (country filter)
  - Attendance summary → loss-of-pay (LOP) days/hours
  - Approved unpaid leave → LOP
  - Approved expenses marked "reimburse via payroll"
  - New joiners / leavers (pro-rated salary)
  - Active cash benefit assignments effective on period end (§6.12.4)
  - Offboarding settlements (leave encashment, gratuity/EOS where applicable)
- Country-aware calculation rules (configuration-driven, not hard-coded branches):
  - **Pakistan:** gross salary, allowances, LOP deduction, income tax withholding (configurable slabs/rates), EOBI employee + employer contribution, SESSI/PESSI where applicable.
  - **UAE:** gross salary, allowances, LOP; no income tax; end-of-service accrual tracked (not paid monthly unless offboarding); WPS-compatible net-pay output.
  - **Singapore:** gross salary, allowances, LOP, CPF employee + employer (age-band rates configurable), SDL, SHG levies where applicable.
- Calculation produces per-employee line items: earnings, deductions, employer costs, net pay.
- Pay run review screen for Finance: flag anomalies (zero net pay, large variance, missing bank details), drill down to employee line items.
- Full audit trail on every adjustment and approval.

#### 6.12.3 Payroll reporting & payslips

- **Pay register** — all employees in the run with earnings, deductions, net pay.
- **Deduction summary** — statutory and voluntary deductions aggregated.
- **Employer cost report** — total employer contributions (CPF, EOBI, etc.).
- **Variance report** — compare current run vs prior period (headcount, gross, net, deductions).
- **Bank transfer file** — export for WPS (UAE) and generic CSV for PK/SG bank uploads.
- **Payslip generation** — PDF per employee per pay period from pay run line items; stored in Blob.
- **Payslip self-service** — employees view and download historical payslips in portal (released on Finance approval); cross-border payslips include link to remittance documentation pack (§6.12.9) when payer entity country ≠ bank country.
- All reports exportable to CSV/Excel/PDF; available to Finance and People Ops roles.

#### 6.12.4 Benefits & allowances

Benefits are fully configurable and dynamic — Finance and People Ops define benefit categories, types, custom fields, validation rules, and payroll treatment per country. Nothing is hard-coded in application logic (no fixed "housing" or "medical" tables in code). The team fills in what Digitaro offers; Polaris stores assignments per worker and drives profile snapshot, payslips, letters, and reports from that configuration.

**Design principles**

- **Configuration over code** — new benefit types and fields are created in admin UI; no deploy required.
- **Country-scoped** — each benefit type is tied to one or more countries; only applicable types appear when assigning to a worker.
- **Employment-type aware** — eligibility matrix (§6.1.1) gates which types can be assigned (e.g. contractors excluded by default).
- **Versioned config** — edits to a benefit type create a new config version; existing assignments retain the schema version they were created under until migrated.
- **Full audit trail** — every config change and every assignment field change logged (`AuditLog`).

##### 6.12.4.1 Core entities

| Entity | Purpose |
|---|---|
| `BenefitCategory` | Grouping for UI and reports (e.g. Allowances, Insurance, Wellness) — admin-defined, optional hierarchy |
| `BenefitType` | Template for a benefit: delivery mode, payroll/tax flags, eligibility, linked pay component |
| `BenefitTypeField` | Dynamic field definition on a benefit type (schema) |
| `BenefitTypeValidationRule` | Configurable validation (caps, mutual exclusion, required docs) |
| `EmployeeBenefit` | A worker's enrollment in a benefit type for a date range |
| `EmployeeBenefitFieldValue` | Stored value per dynamic field on an assignment |
| `PayComponentType` | Earnings/deduction line used when a cash benefit feeds payroll (§6.12.1) |

##### 6.12.4.2 Benefit type configuration (admin)

Finance / People Ops (Super Admin override) manage Settings → Benefits → Benefit types, filtered by country.

**System fields on every BenefitType** (fixed; not removable):

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | string | Yes | Stable machine key, e.g. `PK_HOUSING_ALLOWANCE` |
| `name` | string | Yes | Display label shown to HR and (if visible) employee |
| `category_id` | FK | No | Links to BenefitCategory |
| `countries` | country[] | Yes | Where this type can be assigned |
| `employment_types` | enum[] | Yes | Eligible types; default excludes `CONTRACTOR`, `CONSULTANT`, `AGENCY` |
| `status` | enum | Yes | `draft` \| `active` \| `archived` |
| `description` | text | No | Internal guidance for HR when assigning |
| `delivery_mode` | enum | Yes | `cash` \| `in_kind` \| `hybrid` — cash/hybrid can link to payroll |
| `contribution_model` | enum | Yes | `employer_only` \| `employee_only` \| `split` \| `none` — none for reference-only in-kind |
| `payroll_treatment` | enum | Conditional | `include_in_gross` \| `exclude_from_gross` \| `employer_cost_only` \| `informational_only` — required when delivery_mode is cash or hybrid |
| `pay_component_type_id` | FK | Conditional | Required when payroll_treatment is include_in_gross or exclude_from_gross |
| `taxable` | enum | Yes | `yes` \| `no` \| `follow_country_default` |
| `included_in_gross` | boolean | Yes | Whether cash amount counts toward gross for statutory calc (country rules may override via validation) |
| `pro_rate_on_join_leave` | boolean | Yes | Pro-rate cash benefit in partial months |
| `employee_visible` | boolean | Yes | Show on profile Benefits snapshot and self-service |
| `requires_document` | boolean | No | Assignment must have attachment (policy cert, etc.) |
| `renewal_alert_days` | int[] | No | Days before `effective_to` to fire compliance alert (§6.10) |
| `letter_on_change` | boolean | No | Trigger optional increment/revision letter (§6.8) |

Admin can add unlimited custom fields via `BenefitTypeField` (see §6.12.4.3). Seed packs ship suggested types for PK / UAE / SG but teams may rename, extend, or replace them.

##### 6.12.4.3 Dynamic field schema (BenefitTypeField)

Each benefit type has zero or more configurable fields the team defines. Fields drive the assignment form, profile snapshot, merge fields, and exports.

**Supported field types** (extensible enum; v1 ships these):

| Field type | Use for | Stored as |
|---|---|---|
| `text` | Provider name, free notes | string |
| `long_text` | Coverage summary, exclusions | string |
| `number` | Dependent count, units | decimal |
| `currency` | Allowance amount, premium | amount + currency code |
| `percentage` | % of basic salary | decimal 0–100 |
| `date` | Policy start, renewal date | date |
| `date_range` | Coverage period | start + end date |
| `boolean` | Opt-in flag | bool |
| `single_select` | Coverage tier (Basic / Standard / Premium) | option key |
| `multi_select` | Covered dependents categories | option keys[] |
| `provider_reference` | Insurer / vendor ID | string + optional URL |
| `policy_number` | Insurance policy # | string (masked in employee view if configured) |
| `coverage_tier` | Preset tier picker | enum key |
| `document_attachment` | Policy PDF, membership card | blob ref |

**Per-field metadata** (all configurable by admin):

| Property | Description |
|---|---|
| `code` | Machine key for merge fields, e.g. `monthly_amount` |
| `label` | Form label |
| `required` | Block save if empty |
| `employee_visible` | Show on profile snapshot (can differ from type-level default) |
| `employee_editable` | Allow via profile change request (default false) |
| `default_value` | Pre-fill on new assignment |
| `options` | For select types — admin-defined list |
| `display_order` | Form ordering |
| `help_text` | Inline guidance for HR |

**Standard recommended fields** (team adds to types as needed — not baked into code):

| Concept | Suggested field type | Typical code |
|---|---|---|
| Monthly / annual amount | currency | `amount` |
| Employer contribution | currency or percentage | `employer_contribution` |
| Employee contribution | currency or percentage | `employee_contribution` |
| Provider | provider_reference | `provider` |
| Policy number | policy_number | `policy_number` |
| Coverage tier | coverage_tier or single_select | `coverage_tier` |
| Effective period | date_range | `coverage_period` |

##### 6.12.4.4 Employee benefit assignment (EmployeeBenefit)

People Ops / Finance assign benefits to eligible workers.

**System fields on every assignment** (fixed):

| Field | Type | Required | Notes |
|---|---|---|---|
| `worker_id` | FK | Yes | |
| `benefit_type_id` | FK | Yes | Must match worker country + employment type |
| `status` | enum | Yes | `draft` \| `active` \| `suspended` \| `ended` |
| `effective_from` | date | Yes | Inclusive start |
| `effective_to` | date | No | Null = open-ended; required when type has `renewal_alert_days` |
| `currency` | code | Conditional | Required when type has cash currency fields |
| `notes` | text | No | Internal HR notes (never employee-visible unless flagged) |
| `benefit_type_version` | int | Yes | Schema version at assignment time |
| `approved_by` | user | Conditional | Required when type or country config mandates dual control |
| `document_ids` | FK[] | Conditional | When `requires_document` |

Dynamic values stored in `EmployeeBenefitFieldValue` (one row per field per assignment), validated against the type's field schema at save time.

**Lifecycle**

1. HR creates assignment → draft (optional) or active.
2. On active + cash treatment → system syncs amount to linked `PayComponentType` on worker's compensation record for pay runs.
3. Change to amounts or effective dates → audit log + optional letter (§6.8).
4. `ended` / past `effective_to` → removed from active payroll inputs; retained for history and reports.
5. Overlapping active assignments of the same benefit type blocked unless type allows multiples (config flag `allow_multiple_active`).

Profile snapshot (§6.1) is a read-only projection of all active assignments where `employee_visible` is true — grouped by category, showing type name + visible field values. No duplicate manual "snapshot" data entry.

##### 6.12.4.5 Payroll, tax & payslip integration

| delivery_mode | payroll_treatment | Payslip behaviour |
|---|---|---|
| cash | include_in_gross | Earning line via linked pay component; included in gross and statutory base per `included_in_gross` + `taxable` |
| cash | exclude_from_gross | Earning line but excluded from gross/statutory base (e.g. reimbursements) |
| cash | employer_cost_only | Employer cost report only; not on employee payslip |
| in_kind | informational_only | Profile + optional payslip footnote if `employee_visible` |
| hybrid | per field | Cash portion follows pay component; in-kind fields informational |

- Pay run pulls active cash assignments effective on period end date.
- Split contribution model: employer portion → earnings or employer cost per config; employee portion → deduction pay component (admin links deduction type on benefit type).
- Benefit changes mid-period respect `pro_rate_on_join_leave` when enabled.

##### 6.12.4.6 Country validation rules (BenefitTypeValidationRule)

Teams configure rules per benefit type — not hard-coded. Examples teams may enter:

| Rule type | Parameters | Example use |
|---|---|---|
| `max_percent_of_basic` | percent, reference field | UAE housing ≤ 25% of basic |
| `max_fixed_amount` | amount, currency | Transport cap AED 1,500 |
| `min_fixed_amount` | amount, currency | Minimum housing floor |
| `max_total_per_category` | category, amount | Total allowances cap |
| `mutually_exclusive_with` | other benefit type codes | Cannot have two medical plans |
| `requires_field` | field code | Policy number required when amount > 0 |
| `requires_document` | document type | Insurance certificate upload |

Validation runs on assignment save and on pay-run preview (warn/block per severity: `error` | `warning`).

##### 6.12.4.7 Merge fields & reporting

- Template merge namespace: `{{benefits.<type_code>.<field_code>}}` and `{{benefits.<type_code>.amount}}` for primary currency field.
- Aggregate: `{{benefits.total_cash_allowances}}`, `{{benefits.list}}` (formatted table for offer letters).
- Reports: benefits register (all active assignments), employer cost by benefit type, expiring policies (from `effective_to` + `renewal_alert_days`), benefits-by-country export for Finance.

##### 6.12.4.8 Seed defaults (editable by team)

Out-of-the-box seed packs per country give Finance a starting catalog; all types and fields remain fully editable, archivable, and extendable.

| Country | Suggested seed types (examples) |
|---|---|
| Pakistan | Housing allowance, transport allowance, medical insurance (in-kind ref), mobile allowance, EOBI (informational link to statutory) |
| UAE | Housing allowance (with `max_percent_of_basic` rule seed), transport, medical insurance, annual air ticket |
| Singapore | Transport allowance, medical insurance, flex benefits wallet |

Seeds include suggested `BenefitTypeField` rows (`amount`, `provider`, `policy_number`, `coverage_tier`) and example validation rules. Deleting or replacing seeds has no code impact.

##### 6.12.4.9 Acceptance criteria (benefits)

- Given Finance creates a new benefit type for PK with custom fields `amount` (currency) and `provider` (text), when People Ops assigns it to an employee, then the dynamic form renders those fields and values persist without a code change.
- Given an active cash benefit with `include_in_gross` and a linked pay component, when a pay run is calculated for a period covering the assignment, then the allowance appears on the payslip and in gross per `taxable` / `included_in_gross` flags.
- Given a UAE housing benefit type with a configured `max_percent_of_basic` rule of 25%, when HR enters an amount exceeding 25% of basic salary, then save is blocked with a clear validation message.
- Given a medical in-kind benefit with `employee_visible` and policy fields, when the employee opens Me → Benefits, then they see type name, provider, and coverage tier but not internal HR notes.
- Given a benefit assignment change, when saved, then AuditLog records old → new for every system and dynamic field changed.
- Given a benefit type is archived, when HR opens assign UI, then the type no longer appears for new assignments; existing historical assignments remain readable.

#### 6.12.5 Finance export (PDF & Excel — no Xero API)

On Approved, Finance generates an export pack for manual processing in Xero (or other accounting tools):

- **Pay register** — Excel: employee ID, name, earnings, deductions, net pay, bank details, currency, cost centre/division
- **Summary report** — PDF: totals, headcount, variance vs prior period, approver sign-off block
- **Payslip batch** — PDF ZIP or per-employee PDFs (same as self-service payslips)
- **Contractor payment batch** — Excel: contractor, invoice #, amounts, tax, payment reference field (filled by Finance after payment)
- **Expense reimbursement summary** — Excel: approved claims marked reimburse-via-payroll (§6.9)

Export is idempotent — re-export of the same approved run produces the same pack (tracked by `PayRunExportBatch` ID); Finance marks run `Exported` → `Locked` after download.

Finance records external reference manually (optional field: "Xero journal ref" / "payment ref") for traceability.

No automated posting to Xero; no reconciliation API — Finance compares export totals to Xero entries manually.

#### 6.12.6 Acceptance criteria (payroll)

- Given a completed attendance month and approved leave data, when Finance opens a PK pay run for that period, then gross, LOP, tax, and EOBI are calculated for every active PK employee without manual spreadsheet work.
- Given an approved pay run, when Finance downloads the export pack, then Excel pay register and PDF summary are generated within 60 seconds and `PayRunExportBatch` is recorded.
- Given an approved pay run, when payslips are released, then each employee can download their payslip PDF from the self-service portal.
- Given a mid-month joiner, when the pay run is calculated, then salary is pro-rated from start date and reflected in the pay register.
- Given an approved contractor payment batch, when Finance exports, then all approved invoices for the period appear in the Excel batch with correct currency and amounts.

#### 6.12.7 Statutory rate configuration

Tax slabs, CPF rates, EOBI contributions, and other statutory parameters are configured and maintained in Polaris — not hard-coded and not fetched from government APIs in v1. Finance (with Super Admin override) owns keeping rates current when legislation changes.

**Admin UI — country-scoped rate schedules**

- Each rate schedule has an effective-from date (and optional effective-to). Pay runs use the schedule active on the last day of the pay period.
- Schedules are versioned with full audit trail (who changed what, when, old → new value).
- Preview impact: before activating a new schedule, show how a sample employee's net pay would change vs the current schedule.

**Configurable rate types per country**

| Country | Configurable in Polaris |
|---|---|
| Pakistan | Income tax slabs (min/max taxable income, rate %), EOBI employee & employer contribution (fixed amount or %), SESSI/PESSI rates where applicable |
| UAE | End-of-service gratuity formula parameters (days per year of service tiers), WPS field mappings |
| Singapore | CPF employee & employer rates by age band, SDL rate, SHG levy amounts (CDAC, SINDA, ECF, MBMF) |

**Workflow**

1. Finance navigates to Settings → Payroll → Statutory rates filtered by country.
2. Creates a new rate schedule with effective-from date, enters updated slabs/amounts (optionally importing from CSV).
3. System validates overlaps (no two active schedules for the same rate type on the same date).
4. On save, schedule status is `Draft` → `Active` (Super Admin or Finance approval required for activation).
5. Active schedules apply automatically to the next pay run calculation; locked pay runs retain the schedule version used.

**Acceptance criteria (statutory rates)**

- Given an EOBI rate change effective 1 July, when Finance creates and activates a new PK EOBI schedule, then pay runs for periods ending on or after 1 July use the new rate; prior locked runs are unchanged.
- Given overlapping CPF age-band rates, when Finance attempts to save, then the system blocks with a clear validation error.
- Given an active tax slab schedule, when a pay run is calculated, then each employee's withholding uses the slabs effective for that period.

#### 6.12.8 Scope boundary

Polaris calculates pay and exports PDF/Excel packs for Finance; statutory filing and remittance remain outside v1. Rate data is entered and maintained in Polaris by Finance; the system does not auto-sync from FBR, IRAS, CPF Board, or EOBI portals in v1.

Per-country boundary detail: see [tax-compliance-boundary.md](../compliance/tax-compliance-boundary.md) — what Polaris calculates vs what Finance performs in external statutory systems.

#### 6.12.9 Cross-border remittance documentation

When Digitaro pays any worker — FTE, part-time (PTE), fixed-term, paid intern, or contractor — from one country legal entity to a bank account in another country (e.g. SG entity → employee or contractor in Pakistan with a PK bank account), the recipient's bank often requires an inward remittance document pack. Polaris assembles and stores this in one place for both payroll and contractor payments.

**Scope:** Applies when `legal_entity.country` ≠ `worker.bank_country_code` (or corridor explicitly configured). Same engine, different payment source and auto-documents per worker type.

| Worker type | Payment source | Portal access |
|---|---|---|
| `FULL_TIME`, `PART_TIME`, `FIXED_TERM`, paid `INTERN` | `pay_run_line` (monthly pay run) | Employee portal → Payslips → period detail |
| `CONTRACTOR`, `CONSULTANT` | `contractor_payment_line` | Contractor portal → My invoices → invoice detail |

##### 6.12.9.1 Payment corridors (configuration)

Finance / Super Admin configures remittance corridors in Settings → Finance → Remittance corridors:

| Dimension | Example |
|---|---|
| Paying legal entity | Digitaro Labs SG Pte Ltd |
| Payer country | SG |
| Beneficiary bank country | PK |
| Applies to | `all` \| `employee_payroll` \| `contractor_invoice` |
| Required document types | Checklist per corridor |

Corridor match: legal_entity + worker's `bank_country_code` on profile + payment type. Missing `bank_country_code` → block pay run export or payment batch until set.

**Default corridors (seeded) — SG payer → PK bank:**

| Applies to | Auto-included | Finance must upload |
|---|---|---|
| Employee (FTE/PTE) | Payslip PDF, signed employment contract, payment advice, income tax withholding summary | SWIFT copy / MT103, bank payment confirmation |
| Contractor | Invoice PDF, signed SOW, services contract, payment advice, withholding cert (if WHT) | SWIFT / bank proof |

Similar rows seeded for SG→UAE, UAE→PK; domestic corridors may omit SWIFT.

##### 6.12.9.2 Document types

| Type | Employee payroll | Contractor invoice |
|---|---|---|
| `payslip_pdf` | Auto (on payslip release) | — |
| `invoice_pdf` | — | Auto (submission attachment) |
| `signed_employment_contract` | Auto | — |
| `signed_sow` | — | Auto |
| `signed_contract` | Auto (employment) | Auto (services agreement) |
| `salary_confirmation_letter` | Auto-generated (optional per corridor) | — |
| `payment_advice` | Auto-generated | Auto-generated |
| `withholding_certificate` / tax summary | Auto if tax withheld | Auto if WHT |
| `swift_copy` | Finance upload | Finance upload |
| `bank_payment_proof` | Finance upload | Finance upload |
| `wire_confirmation` | Finance upload | Finance upload |
| `tax_remit_form` | Auto or upload | Auto or upload |
| `other_supporting` | Worker or Finance upload | Worker or Finance upload |

All documents: Blob storage, Confidential, versioned, linked to `remittance_pack`.

##### 6.12.9.3 Worker portal experience

**Employees (FTE/PTE):** On Payslips → [period], when pay run is Released and corridor matched:

- Remittance documents panel (same checklist UI as contractors).
- Available after payslip release; complete when Finance uploads SWIFT/proof.
- Download individual PDFs or ZIP for bank submission.

**Contractors:** On My invoices → invoice detail when Queued for payment or Paid — see §6.20.6 (portal pointer).

Copy: "Use these documents if your bank requests proof of inward salary/remittance."

Notification when pack becomes complete.

##### 6.12.9.4 Finance workflow

**Employee pay run:**

1. Approve pay run → export bank file / pay register.
2. Execute cross-border transfers externally.
3. Per pay run line (or bulk): upload SWIFT/proof, enter payment ref + value date.
4. On upload + payslip already released → pack complete; employee notified.

**Contractor batch:** Same as §6.20.3 step 4 — per payment line.

Dashboard: All incomplete packs (employee + contractor) where bank transfer done but SWIFT missing.

##### 6.12.9.5 Acceptance criteria (remittance documentation)

- Given an FTE employee paid from SG entity to PK bank, when payslips are released, then employee portal shows remittance checklist with payslip, contract, and payment advice; SWIFT pending until Finance uploads.
- Given a PTE employee in the same corridor, when Finance uploads SWIFT on the pay run line, then pack completes and employee can download ZIP from payslip detail.
- Given an SG→PK contractor invoice paid, when complete, then contractor portal shows the same SWIFT-inclusive pack (§6.20.6).
- Given corridor requires `swift_copy`, when Finance marks payment complete without upload, then pack stays incomplete and worker sees pending items (Finance alerted).
- Given domestic same-country salary (PK entity → PK bank), when corridor omits SWIFT, then pack completes with payslip + payment advice only.
- Given audit export for a worker, then all remittance packs (payroll and contractor) appear in one history.

### 6.13 Native e-signature platform

Digitaro builds and operates its own e-signature capability inside Polaris — no DocuSign, Adobe Sign, or third-party envelope fees. Documents never leave Digitaro's Azure boundary. The platform provides envelopes, multi-party signing workflows, an immutable audit trail, RFC 3161 timestamps, and tamper-evident PDF sealing suitable for employment contracts across PK, UAE, and SG.

**Legal posture (v1):** Advanced Electronic Signatures (AES) under eIDAS / ESIGN Act equivalents — sufficient for offer letters, employment contracts, and NDAs in all three jurisdictions. Not Qualified Electronic Signatures (QES). Legal review to confirm before launch.

#### 6.13.1 Core concepts

| Concept | Description |
|---|---|
| Envelope | A signing request wrapping one generated PDF, one or more signatories, placed fields, and a lifecycle state |
| Signatory | A person who must sign; linked to a worker record. Employees authenticate via Entra SSO; contractors via email magic link to signing session (no Entra). |
| Signing field | A positioned overlay on the PDF: signature, initials, date, text, checkbox |
| Audit event | Append-only log entry for every envelope action (immutable) |
| Sealed PDF | Final document with embedded signature appearances + PKCS#7 document signature + completion certificate |

#### 6.13.2 Envelope lifecycle

States: `Draft` → `Sent` → `In Progress` → `Completed` | `Declined` | `Voided` | `Expired`

- **Draft** — People Ops creates envelope from a generated document (§6.8); assigns signatories and signing order; places or auto-places fields from document-type presets.
- **Sent** — envelope dispatched; signatories notified via email (M365) and in-app task.
- **In Progress** — at least one signatory has opened or signed; others may be pending (sequential) or signing in parallel.
- **Completed** — all required signatories signed; system seals PDF and generates certificate of completion.
- **Declined** — a signatory refused with mandatory reason; People Ops alerted.
- **Voided** — HR cancels before completion; all parties notified.
- **Expired** — configurable expiry (default 30 days); auto-transition with alert to People Ops.

Signing order: sequential (default for offer → counter-sign) or parallel (e.g. mutual NDA). Configurable per envelope.

#### 6.13.3 Signatory experience (signing UI)

> **Implementation note:** Original PRD referenced an Angular signing UI. Implementation uses the Next.js PWA signing surface — same UX requirements (PDF viewer, canvas pad, mouse/keyboard and touch).

Signatory opens envelope from email deep-link or portal queue.

- **Employees:** authenticate via Entra ID SSO (identity must match assigned signatory).
- **Contractors:** authenticate via email magic link (one-time or short-lived session token sent to email on file; no Entra account needed).
- Read-only PDF viewer with highlighted fields; responsive on desktop and mobile (mouse/keyboard draw on web; touch draw on phone/tablet).
- Signature capture modes: draw (canvas), type (styled font), upload (image of wet signature).
- Optional per-field: initials, date auto-fill, free-text (e.g. job title confirmation).
- Consent screen before first signature: "I agree to sign electronically" with timestamp recorded.
- On submit: field values burned into PDF page layer; audit event recorded; next signatory notified (if sequential).

**Manual sign path** (first-class, not fallback-only): at any stage before completion, People Ops or the signatory may:

- Download PDF — export the generated document (unsigned or partially signed) for printing
- Print — browser print from PDF viewer (print-friendly layout)
- Sign physically (wet ink), then upload signed PDF (§6.13.8) — same audit trail as other completion paths

E-sign and manual upload are peer options; KPI still tracks % completed in-system vs manual upload.

#### 6.13.4 Field placement & templates

- Auto-placement presets per document type (offer letter, employment contract, NDA, contractor agreement, SOW): default signature/date positions on standard Digitaro templates.
- Manual placement in admin UI: drag fields onto PDF preview for non-standard layouts.
- Field assignments tied to specific signatories (employee signs here, company signatory signs there).
- Presets stored per `DocumentTemplateVersion` so regenerated docs get consistent field maps.

#### 6.13.5 Audit trail

Append-only `ESignAuditEvent` table — no updates or deletes.

| Event type | Recorded data |
|---|---|
| `envelope.created` | actor, document hash (SHA-256), template version |
| `envelope.sent` | actor, recipient list, expiry date |
| `envelope.viewed` | signatory, IP address, user agent, timestamp (UTC) |
| `envelope.signed` | signatory, field IDs completed, IP, user agent, timestamp |
| `envelope.declined` | signatory, reason, IP, timestamp |
| `envelope.voided` | actor, reason |
| `envelope.expired` | system, original expiry |
| `envelope.completed` | system, final document hash, seal certificate thumbprint |
| `envelope.reminder_sent` | system, recipient |

Audit log exportable as PDF Certificate of Completion attached to every completed envelope.

People Ops and Super Admin can view full audit timeline per envelope; signatories see their own actions.

#### 6.13.6 Tamper-evident PDF sealing

On envelope completion:

1. Merge all signatory field appearances (signature images, typed text, dates) into the PDF content stream.
2. Compute SHA-256 hash of the merged PDF; store as `documentHashPreSeal`.
3. Apply PKCS#7 detached signature to the PDF using an organisation signing certificate stored in Azure Key Vault (PAdES-B-B baseline; upgrade path to PAdES-B-T with timestamp authority).
4. Request RFC 3161 timestamp from a trusted TSA (configurable; default Azure-compatible or public TSA) and embed as document timestamp (PAdES-B-T).
5. Store sealed PDF in Blob; original unsealed PDF retained immutable for comparison.
6. Generate Certificate of Completion PDF summarising signatories, timestamps, document hash, and seal validity.

**Verification:** any PDF reader with signature panel shows Digitaro org certificate; Polaris provides an in-app Verify document tool that recomputes hash and validates PKCS#7 + timestamp.

**Certificate rotation:** org signing cert in Key Vault with documented rotation procedure; old envelopes remain verifiable with archived cert chain.

#### 6.13.7 Notifications & reminders

- Email + in-app notification on: envelope sent, your turn to sign (sequential), envelope completed, envelope declined/voided/expired.
- Automatic reminders at configurable intervals (default: 3 days, 7 days before expiry).
- People Ops dashboard: envelopes awaiting signature, overdue, expiring this week.

#### 6.13.8 Manual sign — export, print & upload

For wet signatures, external counsel, or signatories who prefer paper:

1. People Ops or signatory exports PDF or prints from the document viewer (unsigned, in-progress, or final draft).
2. Document is signed physically (or scanned wet signature).
3. HR Admin (or signatory, if configured) uploads executed PDF.
4. System stores alongside generated PDF; records `signingMethod: manual_upload` audit event; marks document Signed.
5. Does not produce PKCS#7 seal — flagged clearly in UI and audit vs e-sealed documents.

Available from: onboarding checklist, envelope detail screen, and worker Documents tab — Export PDF, Print, Upload signed copy actions always visible alongside Sign electronically.

#### 6.13.9 Technical implementation

- Domain module: `Digitaro.Hrms.ESign` — isolated bounded context with clear ports for PDF manipulation and sealing. *(Implementation: NestJS `esign` module — see [system-architecture.md](./system-architecture.md).)*
- PDF generation: QuestPDF (MIT) for document body and payslips. *(Implementation may use Node-compatible PDF libraries with the same open-source / no-commercial-license constraint.)*
- PDF manipulation & sealing: open-source stack — PDFsharp 6 (MIT) for field overlay and PDF merge; BouncyCastle (MIT) for PKCS#7 detached signing and PAdES output. No commercial PDF library license required (iText is explicitly out of scope).
- Signing certificate: X.509 key pair in Azure Key Vault; app accesses via managed identity; cert subject = legal entity name.
- Timestamp authority: RFC 3161 TSA endpoint (configurable per environment).
- Storage: Azure Blob — separate containers for `documents/generated`, `documents/sealed`, `documents/certificates`.
- Background jobs: expiry checker, reminder sender, async seal operation for large PDFs.
- API surface: REST endpoints for envelope CRUD, signing session, audit export; signing UI calls same API.

#### 6.13.10 Acceptance criteria (e-sign platform)

- Given a generated offer letter, when People Ops sends an envelope with sequential signing (employee then company signatory), then each party receives notification and can sign only when it is their turn.
- Given all signatories have signed, when sealing completes, then the sealed PDF validates in a standard PDF reader and the Certificate of Completion lists all audit events with UTC timestamps.
- Given a tampered sealed PDF (single byte changed), when verification runs, then the system reports signature invalid / hash mismatch.
- Given an employee opens an envelope, when they have not completed the consent screen, then signing fields are disabled.
- Given an envelope assigned to Employee A, when Employee B (authenticated) opens the signing link, then access is denied.
- Given an NDA envelope during onboarding, when sealing completes, then the onboarding checklist document task auto-completes.

#### 6.13.11 Non-goals (e-sign v1)

- Entra ID required for contractor signers (they use email-verified magic link).
- External counsel / board signers without worker record (use signed PDF upload).
- Bulk send to hundreds of recipients.
- In-person signing on a shared kiosk/tablet mode.
- Blockchain anchoring of document hashes.

### 6.14 Performance management

Single dashboard for goals, reviews, and KPIs — **Phase 2**.

#### 6.14.1 Review cycles

- Configurable cycles: annual, semi-annual, quarterly, probation review (auto-triggered 2 weeks before probation end).
- Cycle states: `Draft` → `Active` → `Manager review` → `Calibration` (optional) → `Completed` → `Locked`.
- Populations: all staff, by division, country, department, or employment type (contractors excluded by default).

#### 6.14.2 Goals & KPIs

- Employee and manager set SMART goals per cycle with weighting (must total 100%).
- Goal types: individual, team, project-aligned.
- Mid-cycle check-ins: progress %, notes, status (on track / at risk / off track).
- KPI library per role template (optional pre-fill for common roles).

#### 6.14.3 Appraisal workflow

- Self-assessment → manager assessment → optional peer/360 feedback (configurable per cycle).
- Rating scale configurable (e.g. 1–5, exceeds/meets/below); forced distribution optional (off by default).
- Competency ratings linked to skills on profile (§6.1).
- Comments and evidence attachments per criterion.
- Manager and employee sign-off; disputes escalated to People Ops.

#### 6.14.4 Outcomes & HR integration

- Review completion triggers optional increment/promotion letter draft (§6.8) when compensation change flagged.
- Probation review outcome: Confirm → generate probation confirmation letter | Extend → extension letter | Terminate → separation workflow (§6.4).
- Performance history on employee timeline; restricted visibility (employee sees own; manager sees reports).

#### 6.14.5 Acceptance criteria (performance)

- Given an active annual cycle, when an employee submits self-assessment, then their manager receives a task to complete manager review.
- Given probation end in 14 days, when alert fires, then probation review cycle is auto-created for employee and manager.

### 6.15 Recruitment management

End-to-end hiring from requisition to offer handoff — **Phase 2**.

#### 6.15.1 Job requisitions & manpower link

- Hiring manager raises requisition linked to manpower plan position (§6.19): role, division, country, employment type, headcount (FTE or contractor slot), budget band, justification.
- Approval chain: hiring manager → Division Head → People Ops.
- On approval, requisition becomes Open.

#### 6.15.2 Job posting & candidates

- Job record: title, description, requirements, location/remote, employment type.
- Post to configurable channels: internal careers page, LinkedIn (manual link or API future), export for external boards.
- Candidate pipeline: `Applied` → `Screening` → `Interview` → `Offer` → `Hired` | `Rejected`.
- Candidate profile: CV upload, contact, source, notes, GDPR consent timestamp.
- Duplicate detection by email.

#### 6.15.3 Screening & evaluation

- Structured scorecards per interview stage (technical, culture, HR) with weighted criteria.
- Interview scheduling notes; calendar integration via M365 (optional).
- Hiring team collaboration: comments, ratings, recommend hire / no hire.
- Real-time pipeline dashboard per requisition.

#### 6.15.4 Offer & hire handoff

- Offer / hire stage: link to document generation (§6.8) — offer letter for employees, services agreement + SOW for contractors — then e-sign envelope (§6.13).
- On Offer accepted: auto-create worker record (`pre_boarding` status), trigger pre-boarding data collection at personal email (§6.3.1 / FLW-TAL-006), and schedule Entra / M365 provisioning (§6.3.2 / FLW-SEC-006).
- On start date: merge pre-boarding packet into profile; trigger day-1 onboarding (§6.3.2).
- Requisition headcount decremented; manpower plan actuals updated.

### 6.16 Training management

Track learning assignments and completion — **Phase 2**. (Course delivery via external links or M365; Polaris tracks obligation and evidence.)

- Training catalog — courses with title, description, type (mandatory/optional), duration, renewal period, external URL or document attachment.
- Assign to populations: all staff, new hires (onboarding bundle), by role/country/division.
- Employee view: assigned, in progress, completed, overdue.
- Completion: self-attest + manager or HR verification; certificate upload optional.
- Compliance training tied to ISO policy suite — overdue triggers alert (§6.10).
- Reports: completion rate by team, overdue list, renewal due in 30 days.

### 6.17 Travel management

Business travel requests through approval — **Phase 2**. (No GDS/booking engine.)

#### 6.17.1 Travel request

- Employee submits: destination(s), dates, purpose, estimated cost, travel type (domestic/international), link to project/client (optional).
- Itinerary fields: flights, hotel, transport (free text or structured legs).
- Per-diem auto-suggested from country/city policy table (§6.9).

#### 6.17.2 Approval workflow

- Employee → manager → Finance (if over threshold) → People Ops (international or visa-sensitive destinations).
- Approved travel unlocks travel expense category on linked expense claims (§6.9).
- Status: `Draft` → `Submitted` → `Approved` → `In progress` → `Completed` → `Reconciled`.

#### 6.17.3 Post-travel

- Employee marks trip completed; submits expenses against travel request ID.
- Finance reconciles estimated vs actual; variance flagged on report.

### 6.18 Help desk management

Centralized HR, IT, and admin requests — **Phase 2**.

#### 6.18.1 Ticketing

- Employee raises ticket: category (IT / HR / Admin / Finance), subject, description, priority, attachments.
- Auto-route to queue by category; assignee pick-up or round-robin (configurable).
- States: `Open` → `In progress` → `Waiting on employee` → `Resolved` → `Closed`.
- SLA targets per category (e.g. IT P1: 4 hours); breach alerts to assignee and supervisor.

#### 6.18.2 Integration with HR workflows

- Onboarding/offboarding IT tasks can spawn or link help desk tickets.
- Separation clearance blocked items can escalate to help desk ticket.
- Employee sees unified My requests (tickets + leave + travel + expenses).

### 6.19 Manpower planning

Strategic staffing visibility — **Phase 2**.

- Manpower plan per division/country/year: budgeted FTE and contractor capacity by role/department, planned hires by employment type, planned attrition assumptions.
- Positions linked to plan: open, filled, frozen; tie to recruitment requisitions (§6.15).
- Actuals vs plan dashboard: current headcount, open reqs, time-to-fill, open positions overdue.
- Resource view: allocation % by project (from project assignments) vs capacity.
- Export for leadership reviews; feeds Division Head dashboards.

### 6.20 Contractor invoicing & self-service portal

Contractors and freelancers (`CONTRACTOR`, `CONSULTANT`) submit invoices for work completed; Finance pays via contractor payment batch (§6.12). Employees use the full portal; contractors use a scoped contractor portal — same Polaris app, different navigation and permissions.

#### 6.20.1 Portal access & login

Contractor portal auth is Polaris-native — no Entra ID, no Azure B2B, no SSO complexity.

| Method | Description |
|---|---|
| Portal invite (standard) | People Ops sends invite to contractor email → contractor clicks link → verifies email → sets password → logs in at `/contractor` |
| Magic link login | Returning contractors request email me a login link (passwordless, expires in 15 minutes) |

Auth is stored in Polaris (hashed credentials or magic-link tokens) — separate from Entra.

Contractor portal URL: same app (e.g. `polaris.digitaro.co/contractor`); employment type + Contractor role control the menu.

Onboarding task: "Portal invite sent" — HR sends invite; not tied to Entra provisioning.

Entra is unrelated to contractor access. If IT later provisions Entra for a contractor (optional), profile `entra_status` updates to `provisioned` for record-keeping only — contractor still uses Polaris email login unless explicitly migrated (not in v1).

#### 6.20.2 Invoice submission (contractor)

Contractor fills Submit invoice form:

| Field | Required | Notes |
|---|---|---|
| Invoice number | Yes | Unique per contractor; duplicate blocked |
| Invoice date | Yes | |
| Service period (from / to) | Yes | Must fall within active SOW/contract dates |
| Description / line items | Yes | One or more lines: description, quantity, unit rate, amount |
| Currency | Yes | Must match SOW currency or be in country's allowed currencies list (§6.21) |
| Subtotal, tax/VAT, total | Yes | Tax fields per contractor country config |
| PDF attachment | Yes | Contractor's own invoice document (PDF/image) |
| Link to project / SOW | Optional | Pulled from active assignments on profile |
| Timesheet / hours reference | Optional | Link to check-in hours or uploaded timesheet |

States: `Draft` → `Submitted` → `Manager approved` → `Finance approved` → `Queued for payment` → `Paid` | `Rejected`

- Contractor can save Draft and return later.
- On Submitted, manager (or project lead) receives approval task.
- Finance reviews tax, bank details on file, SOW budget remaining; Finance approved adds invoice to next contractor payment batch.
- Contractor sees status and payment date in My invoices list.
- Rejected requires reason visible to contractor; resubmit allowed.

#### 6.20.3 Approvals & payment

1. Manager / project lead — confirms work delivered (first approval).
2. Finance — confirms amount, tax, budget, bank details; may adjust withholding.
3. Contractor payment batch — approved invoices auto-included for period; batch Approved → Exported as Excel/PDF pack for manual payment processing.
4. On Paid, contractor notified; Finance enters payment reference and uploads remittance proof — see §6.12.9.
5. System assembles remittance documentation pack for contractor portal (auto docs + Finance uploads) per payment corridor.
6. Finance may also create invoice on behalf of contractor (e.g. agreed fixed fee) with `source: finance_entered` — still flows through same approval.

#### 6.20.4 Contractor portal UI (scoped)

Contractors see only:

- **Dashboard** — outstanding draft invoices, payment status, pending e-sign documents, remittance packs ready indicator
- **My invoices** — submit new, list history; invoice detail → Remittance documents when queued/paid (cross-border)
- **My documents** — SOW, NDA, signed copies
- **My profile** — contact, bank details (change request to Finance), tax ID
- **Check-in** — if enabled for type (§6.1.1)
- **Help** — raise ticket (category: contractor/Finance)

Contractors do **not** see: leave, payslips, org-wide directory (optional: project team only), performance, training (unless assigned).

#### 6.20.6 Contractor remittance documentation (portal)

Cross-border remittance packs apply to contractors and employees — canonical spec §6.12.9. This section covers the contractor portal path only.

- **Trigger:** Invoice Queued for payment or Paid; pack keyed to `contractor_payment_line` + invoice.
- On My invoices → invoice detail:
  - Remittance documents checklist (✅ available · ⏳ pending).
  - Preview / download individual PDFs or ZIP.
  - Upload bank-requested extras (`other_supporting`) — Finance review.
- Finance uploads SWIFT/proof on contractor payment line (§6.12.9.4). See FLW-PAY-005.

**Acceptance criteria (contractor portal)**

- Given an onboarded contractor, when they accept a portal invite and log in, then they see the contractor dashboard and can submit an invoice with PDF attachment — without any Entra account.
- Given a submitted invoice, when the manager approves and Finance approves, then the invoice appears in the next contractor payment batch and contractor status shows Queued for payment.
- Given a worker profile, when IT marks Entra as provisioned, then the Entra status is visible on profile and in the Entra coverage report; contractor portal login is unchanged.
- Given duplicate invoice number from same contractor, when they submit, then the system blocks with a clear error.
- Given Finance exports payment batch, then Excel pack lists each invoice with contractor, amounts, currency, and empty payment-ref column for Finance to complete after manual payment.
- Given a cross-border contractor payment, when the invoice is paid, then remittance documentation pack is complete with SWIFT/proof and visible in contractor portal (§6.12.9).

### 6.21 Currency management

Digitaro operates in PKR, AED, SGD, and USD (and potentially more). Currency is dynamic configuration — not hard-coded. Every monetary amount in Polaris carries a transaction currency; conversions use administrable exchange rates with full audit history.

#### 6.21.1 Currency catalog

- Finance / Super Admin maintains an enabled currencies list (ISO 4217 codes: PKR, AED, SGD, USD, EUR, GBP, …).
- Per currency: symbol, decimal places (e.g. PKR 0, AED 2), display format, active/inactive.
- Inactive currencies cannot be selected on new records; historical data retained.

#### 6.21.2 Country, entity & reporting defaults

| Level | Setting | Example |
|---|---|---|
| Country | Default currency + allowed currencies | PK → PKR default; allow PKR, USD |
| Legal entity | Functional / accounting currency | Digitaro Labs PK → PKR |
| Division | Optional budget currency | Studio UAE → AED |
| Organisation | Reporting currency for consolidated dashboards | USD (configurable) |
| Worker | Compensation & invoice currency | From contract; must be in country's allowed list |

Worker's display currency defaults to compensation currency; portal shows amounts in that currency.

#### 6.21.3 Exchange rates (auto-fetch + override)

Finance manages rates in Settings → Finance → Exchange rates. Primary source: external FX API — not manual entry.

| Rate type | Use |
|---|---|
| Spot | Daily API fetch; used for ad-hoc conversion on approval date |
| Monthly average | Computed from daily spot rates (or month-end API rate); payroll reporting, dashboards |
| Budget rate | Manual entry only — annual plan; not API-sourced |

**Automated fetch (default path)**

- Provider: Frankfurter (free ECB rates, no API key required).
- Scheduled job (daily, configurable time UTC) fetches spot rates for all enabled currency pairs (base: reporting currency or per-pair config).
- Fetched rates land as Pending → Active automatically if change vs prior spot is within configurable threshold (e.g. ±2%); otherwise Pending review for Finance approval.
- On API failure: retain last active rate, alert Finance, retry with backoff; manual override available as fallback.
- Manual entry / override always allowed — flagged `source: manual`; audit trail required.

**Rate records**

- Each rate: `from_currency`, `to_currency`, `rate`, `rate_type`, `source` (`api` | `manual` | `computed_avg`), `effective_from`, `api_fetch_batch_id`.
- No overlapping active rates for same pair + type on the same date.
- Historical rates immutable — reproduce past conversions and audit reports.
- Conversion rule: on transaction approval (expense, invoice) or pay run lock, system snapshots `exchange_rate_id` and computed `amount_reporting_currency` — never recalculated retroactively.

#### 6.21.4 Where currency applies

All modules store and respect transaction currency:

| Module | Behaviour |
|---|---|
| Compensation & benefits | Salary, allowances in worker currency; country validation |
| Payroll & payslips | Pay run in country default currency; one currency per pay run |
| Contractor invoices | Contractor submits in SOW currency; payment batch groups by currency |
| Expenses & travel | Claim in incurred currency; per-diem tables per country and currency |
| HR documents | Merge fields `{{compensation.currency}}`, `{{contract.currency}}`, formatted amounts |
| Manpower & recruitment | Budget band in selected currency; FTE cost in plan currency |
| Reports & dashboards | Show native + optional reporting currency column using locked or monthly avg rate |
| Finance export | Amounts in entity functional currency; ISO 4217 codes on every line; FX rate ID on export batch |

#### 6.21.5 UI & formatting

- Amount inputs: currency selector filtered by country/entity allowed list.
- Display: symbol + formatted amount per currency rules (e.g. AED 12,500.00, PKR 250,000).
- Division Head / Finance dashboards: toggle view in reporting currency.
- Payslips: always in worker's pay currency.

#### 6.21.6 Acceptance criteria (currency)

- Given USD is enabled and a rate PKR→USD exists for the month, when Finance runs a consolidated headcount cost report in USD, then PK employee costs appear converted using the active monthly average rate.
- Given a contractor SOW in AED, when they submit an invoice in EUR, then submission is blocked unless Finance has enabled EUR for that country or override is approved.
- Given an expense approved on 15 March, when reporting currency is recalculated in April, then the March expense retains the rate locked at approval.
- Given a new country is added with default currency QAR, when Super Admin configures it, then QAR appears in selectors for that country's workers without code deployment.
- Given the daily FX API job runs successfully, when Finance opens the exchange rate screen, then new spot rates are Active (or Pending review if variance exceeds threshold) with `source: api` and fetch timestamp.
- Given the FX API is unavailable for 24 hours, when Finance approves an expense in USD, then conversion uses the last active spot rate and Finance receives an alert about stale rates.

---

## 7. Cross-border considerations

This is the single biggest source of complexity and the main reason an off-the-shelf single-country HRMS is a poor fit. Each country must be a first-class configuration, not a hack.

| Concern | Pakistan | UAE | Singapore |
|---|---|---|---|
| Statutory bodies | EOBI, SESSI/PESSI, FBR (NTN) | MOHRE, WPS, GPSSA (nationals) | CPF, MOM, IRAS |
| End-of-service | Gratuity per labour law | End-of-service benefits (gratuity) | — (CPF-based) |
| Income tax | Withheld at source | None (personal income) | IRAS, employer reporting |
| Work authorization | — (citizens) | Visa + labour card, expiries | Work pass (EP/S-Pass/WP), expiries |
| Currency | PKR (default); USD allowed | AED (default); USD allowed | SGD (default); USD allowed |
| Leave law | Provincial labour laws | Federal Labour Law | Employment Act |
| Public holidays | PK calendar | UAE calendar | SG calendar |

**Currency design implication:** country default currency drives payroll and statutory config; legal entity functional currency drives export formatting; reporting currency unifies division dashboards. Exchange rates are effective-dated configuration (§6.21), not code constants.

**Design implication:** country is a core dimension on the worker record. Leave entitlements, statutory fields, document templates, letterhead/legal-entity config, currency defaults and allowed currencies, work-week patterns and holiday calendars, public-holiday resolution, staff calendar generation, alert rules, payroll calculation rules, statutory rate schedules, and finance export column mappings are all resolved by the worker's country (with division/individual overrides where configured). Build a country-configuration layer rather than branching logic throughout the codebase.

---

## 8. Non-functional requirements

- **Security:** Employees — SSO via Entra ID (OIDC), MFA through Entra. Contractors — Polaris email auth (password or magic link), rate-limited, MFA optional via email OTP. RBAC + row-level scoping; encryption at rest and in transit; secrets in Azure Key Vault.
- **Data privacy:** Align to GDPR principles (consistent with Digitaro's ISO posture) plus UAE PDPL (Federal Decree-Law 45/2021), Singapore PDPA, and Pakistan's data-protection direction. Support data-subject access/export and deletion workflows. Document a retention schedule per data category.
- **Data residency:** Resolved — single Azure region for all HR data (PK, UAE, SG workforce). No per-country data residency split in v1. Document hosting region in runbook.
- **Availability:** 99.5% target; it's internal but People Ops and leave approvals are time-sensitive.
- **Performance:** Common pages < 1.5s on desktop and mobile; reports may be async for large exports.
- **Responsive design:** One frontend codebase delivers a first-class experience on desktop browsers (1280px+), tablets, and phones. Admin/configuration surfaces are desktop-optimised; employee self-service is equally polished on web and mobile. See UX spec §2.9 and §9. *(Implementation: Next.js PWA — original PRD said Angular.)*
- **Auditability:** Immutable audit log for all record changes, approvals, and e-signature events; admin-viewable; append-only e-sign audit store. Control evidence catalogue in [compliance/iso-soc-framework.md](../compliance/iso-soc-framework.md) §6.
- **Accessibility:** WCAG 2.1 AA for core flows.
- **Localization:** English only at launch (UI and notifications). Currency symbols, decimal places, and formats driven by currency catalog (§6.21); date formats per country.
- **Backup & DR:** Automated daily backups, point-in-time restore, documented RTO/RPO.

---

## 9. Integrations

| System | Purpose | Direction |
|---|---|---|
| Microsoft Entra ID | SSO/auth, identity source, Graph API user provisioning (create user, license, groups), deprovisioning on separation | Bi-directional |
| Microsoft Graph API | Entra user lifecycle, M365 license assignment, group membership, outbound Teams adaptive cards | Outbound |
| Microsoft 365 / Exchange | Work email mailboxes (via Entra license), onboarding notifications, calendar | Outbound + sync |
| Email (M365) | E-sign notifications, digests, alerts, envelope reminders | Outbound |
| RFC 3161 TSA | Trusted timestamps for PAdES document sealing | Outbound |
| Azure Key Vault | Organisation signing certificate | Internal |
| FX rate API (Frankfurter) | Daily spot exchange rates (free, no API key) | Outbound (scheduled job) |
| (Future) LinkedIn / job boards | Automated job posting from requisitions | Deferred API |

**Explicitly out of scope:** Xero API / accounting system integration — Finance uses Polaris PDF/Excel export packs and enters data into Xero manually.

---

## 10. Technical architecture (recommendation)

> **Superseded for implementation.** This section preserves the original PRD recommendation (.NET 9 + Angular). Authoritative implementation architecture: [system-architecture.md](./system-architecture.md) (NestJS 10 + Next.js 16 + PostgreSQL + Better Auth). Functional entity list below remains a useful product inventory.

**Original recommendation (historical):**

- **Backend:** .NET 9 Web API, clean/layered architecture. Country-configuration and rules (leave accrual, payroll calculation, alerts) as a dedicated domain module. `Digitaro.Hrms.ESign` bounded context for envelopes, signing sessions, audit, and PDF sealing. PDF generation via QuestPDF; PDF signing via PDFsharp + BouncyCastle (open source, no commercial license).
- **Frontend:** Angular SPA (employee portal + admin), responsive across desktop, tablet, and mobile — not mobile-only. Rich-text template editor for People Ops; embedded signing UI (PDF viewer, canvas signature pad, field completion) works with mouse/keyboard and touch.
- **Database:** PostgreSQL. Multi-country modelled via a country dimension and configuration tables (not separate schemas) for v1; keep tenant-id-shaped seams in the data model so a future multi-tenant version is a smaller lift. E-sign audit events in append-only table (no UPDATE/DELETE grants).
- **Auth:** Dual auth paths — (1) employees: Entra ID OIDC → Polaris session; (2) contractors: Polaris email/password or magic link → contractor-scoped session. App roles mapped to Polaris roles. E-sign: employees via Entra; contractors via email-verified signing token.
- **Hosting:** Azure (App Service or container on Azure Container Apps), single region, Azure Database for PostgreSQL, Blob Storage for documents, Key Vault for signing certificate.
- **Integration layer:** background jobs/queue for alert scheduling, Entra provisioning tasks, daily Frankfurter FX fetch, envelope expiry/reminders, async PDF sealing, scheduled reports.
- **Observability:** Azure Application Insights; structured logging.

**Data model — core entities (high level):** Employee, EmploymentRecord, EmploymentType, EmploymentTypeCountryConfig, ContractorProfile, EmployeeSkill, CareerHistoryEntry, ProfileChangeRequest, Department, Division, Country/LocationConfig, OfficeLocation (geofence + IP allowlist per hub), Currency, ExchangeRate, ExchangeRateFetchBatch, CountryCurrencyConfig, LegalEntityCurrency, WorkWeekPattern, HolidayCalendar, Holiday, CompanyClosure, StaffCalendarDay, AttendancePunch (incl. device, IP, lat/lng/accuracy/source, office_match), AttendanceDaySummary, PunchCorrectionRequest, ShiftRoster, ShiftAssignment, LegalEntity, LetterheadConfig, DocumentTemplate, DocumentTemplateVersion, GeneratedDocument, ESignEnvelope, ESignSignatory, ESignField, ESignFieldPreset, ESignAuditEvent, SigningCertificate, ManagerRelationship, ProjectAssignment, LeaveType, LeaveBalance, LeaveRequest, CompOffCredit, Policy, PolicyVersion, PolicyAcknowledgement, Separation, ClearanceTask, ExpenseClaim, ExpensePolicy, ContractorInvoice, ContractorInvoiceLineItem, TravelRequest, TravelItinerary, HelpDeskTicket, TicketComment, TrainingCourse, TrainingAssignment, TrainingCompletion, JobRequisition, Candidate, PreBoardingPacket, PreBoardingFieldValue, EntraProvisioningJob, WorkerPassport, WorkerVisaRecord, WorkerVisaAttachment, InterviewScorecard, PerformanceCycle, PerformanceGoal, PerformanceReview, ManpowerPlan, ManpowerPosition, CompensationRecord, BenefitCategory, BenefitType, BenefitTypeField, BenefitTypeValidationRule, EmployeeBenefit, EmployeeBenefitFieldValue, PayComponentType, Payslip, ContractorPaymentBatch, ContractorPaymentLine, RemittanceCorridorConfig, RemittancePack, RemittancePackDocument, StatutoryRateSchedule, StatutoryRateEntry, PayRun, PayRunLineItem, PayRunExportBatch, AlertRule, ScheduledReportSubscription, OnboardingTemplate/Task, ComplianceAlert, AuditLog, Role, UserRoleAssignment.

---

## 11. Phased roadmap

| Phase | Focus |
|---|---|
| **Phase 0 — Foundations** (config & identity) | Country config layer, currency catalog, country currency defaults & daily FX API fetch job, employee records, org structure, Entra SSO, RBAC, directory, audit log. |
| **Phase 1 — MVP** (the daily-value core) | Self-service portal, employee profiles (incl. profile change requests), leave & absence, work calendar + staff calendar + daily check-in/check-out, shift rosters, document & policy management, full HR letter library + e-sign, onboarding + separation with multi-dept clearance, scheduled compliance alerts + birthdays/anniversaries, basic + scheduled reports, native e-signature platform. |
| **Phase 2 — Full operations & talent** | Exchange rate management, FX API integration & reporting-currency dashboards, expense management (all categories + policy limits), contractor portal & invoice submission, travel management, help desk, payroll calculation + payslips + benefits + contractor payment batch + finance export packs, statutory rate UI, performance management, recruitment, training catalog, manpower planning, attendance exceptions & project timesheets. |
| **Phase 3 — Strategic** | Advanced People analytics, external job board API integrations, evaluate multi-tenant productization through Labs. |

---

## 12. Assumptions

1. Polaris owns payroll calculation from Phase 2 onward; Finance exports PDF/Excel and enters accounting data into Xero manually. Statutory filing/remittance stays in dedicated tools.
2. Existing offer-letter, contract, and NDA content exists in Word and will be migrated into Polaris templates by People Ops at launch.
3. Entra ID is the SSO source for employees only. Contractors authenticate via Polaris portal credentials; Entra link on profile is record-keeping for IT.
4. Workforce is small enough that a single-tenant, single-database design is sufficient now; the model is kept multi-tenant-friendly for later.
5. The ISO-aligned policy content already exists and will be loaded into the system; Polaris manages distribution/acknowledgement, not authoring.
6. Headcount and country mix justify three-country support from day one.
7. Workforce is distributed (remote-first Labs, hybrid Studio); daily check-in/check-out is mandatory for all work modes from Phase 1.
8. Organisation X.509 signing certificate will be provisioned in Azure Key Vault before e-sign sealing goes live; legal review confirms AES sufficiency for PK/UAE/SG employment documents.
9. Finance owns statutory rate maintenance in Polaris; legal/tax advisor input is sought when legislation changes but the system of record for rates is Polaris.
10. Exchange rates auto-fetched daily from Frankfurter (free); Finance may override manually or approve out-of-threshold rates. Budget rates remain manual.
11. E-sign: native e-sign or export PDF / print / upload signed copy — both paths supported from launch.
12. English-only UI at launch; WhatsApp via `wa.me` deep links for notifications (not WhatsApp Business API).

---

## 13. Decisions log (formerly open questions)

| # | Topic | Decision | Reference |
|---|---|---|---|
| 1 | Data residency | Resolved — single Azure region for all countries; no split | §8; framework §11 |
| 2 | E-sign legal | Proceed with AES; export PDF / print / manual upload as equal path | §6.13.3, §6.13.8 |
| 3 | PDF library | Resolved — QuestPDF + PDFsharp + BouncyCastle (open source). iText not used | §6.13.9, §10 |
| 4 | Contractor withholding tax | Open — confirm PK/UAE/SG rules with tax advisor; export pack includes withholding columns | Phase 2 |
| 5 | Performance 360 | Open — manager-only for v1 unless decided at performance launch | §6.14 |
| 6 | Web & mobile | Resolved — responsive PWA only; no Capacitor | UX §9 |
| 7 | Productization / multi-tenant | Open — defer; keep tenant-shaped seams | §12 assumption |
| 8 | Xero integration | Resolved — no API. PDF/Excel export only; Finance enters Xero manually | §6.12.5, §9 |
| 9 | FX API | Resolved — Frankfurter (free ECB rates) | §6.21.3 |
| 10 | Urdu/Arabic UI | Resolved — English only at launch | §8 |
| 11 | WhatsApp | Resolved — `wa.me` link buttons (click to open WhatsApp with pre-filled message); not Business API | UX §5.3 |
| 12 | Dark mode | Deferred post–Phase 1 | deferred-compliance-work.md §4 |
| 13 | SOC 2 / DSAR / access review runbooks | Deferred — carry-forward checklists documented | deferred-compliance-work.md |

---

## 14. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| E-sign legal defensibility | High | Legal review per jurisdiction; PAdES sealing + RFC 3161 timestamps; immutable audit trail; Certificate of Completion |
| E-sign build complexity | High | Isolated ESign bounded context; phased delivery inside Phase 1; manual upload fallback |
| Underestimating cross-border statutory complexity | High | Country-config layer; legal review per jurisdiction; phase statutory features; configurable rate tables |
| Payroll calculation errors | High | Finance review/approve gate before export; variance reports; audit trail |
| Low check-in adoption (remote fatigue) | Medium | One-tap UX; morning reminders; manager visibility; no geofence blocking for remote staff |
| Data privacy non-compliance | High | Privacy-by-design, 5-year retention, DSAR support (runbook deferred) |
| FX API outage / stale rates | Medium | Daily job + alerts; fallback to last active rate; manual override; variance threshold review |
| Phase 2 scope breadth | High | Strict phase gates; Phase 1 ships independently; Phase 2 modules are isolated bounded contexts |

---

## 15. Module coverage matrix

Target: 100% functional coverage vs enterprise HRMS module list. Status as of v0.6 baseline (document version v0.14).

| Module | PRD section | Phase | Coverage |
|---|---|---|---|
| Core HR — employee | §6.1, §6.1.1, §6.2 | 0–1 | ✅ 100% — profiles, employment types, FTE, contractors, skills, career history |
| Core HR — leave | §6.5 | 1 | ✅ 100% — accrual, comp-off, tenure tiers, team calendar, country-aware |
| Core HR — attendance | §6.6 | 1–2 | ✅ 100% — check-in/out, remote/in-office, shifts, rosters, project teams, LOP → payroll |
| Talent — onboarding | §6.3 | 1 | ✅ 100% |
| Talent — separation | §6.4 | 1 | ✅ 100% — multi-dept clearance, settlement, exit interview |
| Talent — recruitment | §6.15 | 2 | ✅ 100% — reqs, pipeline, scorecards, offer handoff |
| Talent — performance | §6.14 | 2 | ✅ 100% — cycles, goals/KPIs, reviews, probation outcomes |
| Talent — training | §6.16 | 2 | ✅ 100% — catalog, assignments, compliance tracking |
| Talent — manpower planning | §6.19 | 2 | ✅ 100% — plans, positions, actuals vs budget |
| Pay & benefits — payroll | §6.12 | 2 | ✅ 100% — calc, statutory rates, payslips, PDF/Excel export |
| Pay & benefits — benefits | §6.12.4 | 2 | ✅ 100% — configurable benefit types, dynamic fields, assignments, payroll/tax rules, profile snapshot |
| Documents & letters | §6.8, §6.13 | 1 | ✅ 100% — employee + contractor auto-generated docs, e-sign + manual export/upload |
| Operations — expense | §6.9 | 2 | ✅ 100% — categories, policy limits, travel-linked, export summary |
| Operations — contractor invoices | §6.20 | 2 | ✅ 100% — portal login, submit invoice, approvals, payment batch |
| Operations — travel | §6.17 | 2 | ✅ 100% — request, approval, per-diem, expense reconcile |
| Operations — help desk | §6.18 | 2 | ✅ 100% — HR/IT/Admin tickets, SLA, workflow links |
| Automation — alerts | §6.10 | 1–2 | ✅ 100% — compliance, birthdays, anniversaries, custom rules |
| Automation — reports | §6.11, §6.21 | 1–2 | ✅ 100% — scheduled delivery + multi-currency reporting |
| Finance — currency | §6.21 | 0–2 | ✅ 100% — dynamic catalog, auto-fetch FX API, manual override |
| Policies | §6.7 | 1 | ✅ 100% |
| Native e-sign | §6.13 | 1 | ✅ 100% (Digitaro differentiator) |

**Explicit exclusions** (not counted against coverage): government statutory filing/remittance portals, GDS travel booking, external LMS authoring, QES signatures, external counsel signing without worker record.

---

## Related documents

| Document | Purpose |
|---|---|
| [product-brief.md](./product-brief.md) | Executive summary |
| [srs.md](./srs.md) | Structured SRS index into this PRD |
| [system-architecture.md](./system-architecture.md) | NestJS + Next.js implementation architecture |
| [database-design.md](./database-design.md) | PostgreSQL schema |
| [api-specification.md](./api-specification.md) | REST API contracts |
| [user-stories.md](./user-stories.md) | Given/When/Then acceptance criteria |
| [../compliance/feature-flows.md](../compliance/feature-flows.md) | FLW-* control flows |
| [../generated/tasks.md](../generated/tasks.md) | Phased implementation checklist |
