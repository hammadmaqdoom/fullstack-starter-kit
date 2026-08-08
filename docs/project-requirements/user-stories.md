# Polaris — User Stories

**Product:** Polaris  
**Status:** Approved for implementation  
**Last updated:** 26 June 2026  
**Companion to:** [prd.md](./prd.md) · [srs.md](./srs.md) · [../compliance/feature-flows.md](../compliance/feature-flows.md)

---

## 1. Story format & prioritization

### Format

```
As a [role],
I want [capability],
So that [benefit].
```

**Acceptance criteria** (Given/When/Then):

```
Given [context],
When [action],
Then [outcome].
```

### Prioritization

| Priority | Phase | Description |
|---|---|---|
| **Must Have** | 0–1 | MVP — cannot launch without |
| **Should Have** | 2 | Full operations — Phase 2 gate |
| **Nice to Have** | 3 | Strategic enhancements |

---

## Phase 0 — Foundations

### Epic: Authentication & identity

#### US-AUTH-001: Employee Entra SSO login
**Priority:** Must Have · **Flow:** FLW-SEC-001

```
As an employee,
I want to sign in with my Microsoft account,
So that I don't need a separate password.
```

**Acceptance criteria:**
1. Given I am on the login page, when I click "Sign in with Microsoft", then I am redirected to Entra OIDC and returned with an active session.
2. Given Entra requires MFA, when I complete MFA, then I land on my role-appropriate Home screen.
3. Given my Entra account is linked, when I sign in, then `entra_status` on my worker profile is `provisioned`.

#### US-AUTH-002: Contractor email login
**Priority:** Must Have · **Flow:** FLW-SEC-002

```
As a contractor,
I want to log in with my email and password or magic link,
So that I can access the contractor portal without an Entra account.
```

**Acceptance criteria:**
1. Given I am a contractor with `entra_status: not_required`, when I log in via email, then I see the 4-tab contractor portal (Home, Invoices, Documents, Me).
2. Given I request a magic link, when I click the link within 15 minutes, then I am authenticated without a password.
3. Given 5 failed login attempts, when I try again, then I am rate-limited for 15 minutes.

#### US-AUTH-003: RBAC and row-level scope
**Priority:** Must Have

```
As a system administrator,
I want roles and scopes enforced on every API call,
So that users only see data they are authorised to access.
```

**Acceptance criteria:**
1. Given I am an Employee, when I request another worker's compensation, then I receive 403 Forbidden.
2. Given I am a Manager, when I view my team's leave balances, then I see direct reports and project-assigned members only.
3. Given any record change, when the mutation completes, then an `audit_log` entry is written with actor, old/new values, and correlation ID.

---

### Epic: Country configuration

#### US-CFG-001: Seeded country defaults
**Priority:** Must Have

```
As People Ops,
I want PK/UAE/SG holiday calendars and leave-law starting points pre-loaded,
So that I configure rather than author from scratch.
```

**Acceptance criteria:**
1. Given first-run setup wizard, when I complete the countries step, then PK, UAE, and SG holiday calendars are loaded and editable.
2. Given a worker with `country_code: PK`, when leave types are resolved, then PK-specific entitlements apply per employment type config.

#### US-CFG-002: Currency catalog and FX fetch
**Priority:** Must Have · **Flow:** FLW-PAY-006

```
As Finance,
I want daily exchange rates auto-fetched from Frankfurter,
So that multi-currency reporting stays current without manual entry.
```

**Acceptance criteria:**
1. Given the daily FX job runs, when Frankfurter returns rates, then `exchange_rates` records are created with `source: frankfurter`.
2. Given a rate exceeds the variance threshold, when Finance reviews, then they can approve or override manually.
3. Given FX API is unavailable, when the job fails, then an alert is raised and the last active rate is used.

---

### Epic: Worker records

#### US-HR-001: Create worker profile
**Priority:** Must Have · **Flow:** FLW-HR-001

```
As People Ops,
I want to create a worker profile with employment type and country,
So that entitlements and workflows apply automatically.
```

**Acceptance criteria:**
1. Given a new Studio contractor, when I create a profile with type `CONTRACTOR` and country `AE`, then contractor onboarding template and statutory fields (Emirates ID, passport, visa records) are surfaced.
2. Given I submit the profile, when it becomes Active, then an audit log create event is written and onboarding is triggered.
3. Given duplicate email within tenant, when I submit, then the system blocks with a merge review prompt.

#### US-HR-002: Profile change request
**Priority:** Must Have · **Flow:** FLW-HR-002

```
As an employee,
I want to request changes to my contact and bank details,
So that my master record stays accurate with approval.
```

**Acceptance criteria:**
1. Given I edit my bank details, when I submit, then Finance is routed as approver and status shows "Pending approval".
2. Given my manager approves a contact change, when approved, then my profile updates and I receive a notification.
3. Given rejection, when I view the request, then I see the reason and can resubmit.

#### US-HR-003: Org directory and chart
**Priority:** Must Have · **Flow:** FLW-HR-003

```
As any staff member,
I want to search the company directory and view the org chart,
So that I can find colleagues and understand team structure.
```

**Acceptance criteria:**
1. Given I search by name, when results return, then compensation is hidden unless my role permits.
2. Given I view the org chart, when I filter by division Labs, then only Labs workers appear with employment type badges.

---

## Phase 1 — MVP

### Epic: Daily employee experience

#### US-EMP-001: One-tap check-in
**Priority:** Must Have · **Flow:** FLW-TIME-003

```
As an employee,
I want to check in with one tap,
So that attendance is recorded without friction.
```

**Acceptance criteria:**
1. Given a working day and I am not checked in, when I tap Check in on Home, then my status changes to In within 2 seconds with no confirmation dialog.
2. Given geolocation permission is denied, when I check in, then check-in succeeds with IP fallback — never blocked.
3. Given I am offline, when I check in, then the punch queues locally and syncs with banner "Will sync when online".

#### US-EMP-002: Request leave
**Priority:** Must Have · **Flow:** FLW-TIME-001

```
As an employee,
I want to request leave in three fields or fewer,
So that I don't dread the process.
```

**Acceptance criteria:**
1. Given I open Request leave, when I select dates, then my live balance updates ("18 days → 16 after this").
2. Given I submit, when the request is created, then a Hub item appears with status tracker "With your manager".
3. Given insufficient balance, when I submit, then the system blocks or routes to exception per country config.

#### US-EMP-003: Unified Hub inbox
**Priority:** Must Have

```
As any user,
I want one inbox for all my requests and approvals,
So that I never wonder "where is my thing?"
```

**Acceptance criteria:**
1. Given I have a pending leave request and a document to sign, when I open Hub, then both appear in "Mine" with status trackers.
2. Given I am a manager with 3 pending approvals, when I open Hub "For me", then badge shows 3 and I can swipe to approve.
3. Given I approve from Hub, when action completes, then the requester's tracker advances and they are notified.

#### US-EMP-004: View payslips
**Priority:** Must Have (Phase 2 release gate for payslips; Hub pattern Phase 1)

```
As an employee,
I want to view and download my payslips,
So that I have self-service access to pay records.
```

**Acceptance criteria:**
1. Given Finance has released payslips for a period, when I open Payslips, then I see net paid amount and date prominently.
2. Given a payslip is not yet released, when I search, then it does not appear.
3. Given I tap download, when PDF generates, then it opens in my pay currency with correct formatting.

---

### Epic: Leave & calendar

#### US-LEAVE-001: Team calendar
**Priority:** Must Have · **Flow:** FLW-TIME-002

```
As a manager,
I want to see my team's leave and check-in status,
So that I know who is available today.
```

**Acceptance criteria:**
1. Given Team mode on Calendar, when I view today, then each member shows In/Out/On leave/Missing with local time.
2. Given a team member is on approved leave, when I view the calendar, then their days are colour-coded by leave type.
3. Given cross-timezone team (PK + UAE), when I view times, then each person's local time is shown.

#### US-LEAVE-002: Manager leave approval
**Priority:** Must Have

```
As a manager,
I want to approve or reject leave with one swipe,
So that approvals don't pile up.
```

**Acceptance criteria:**
1. Given a leave request in my queue, when I swipe right, then it is approved and the employee is notified with tracker update.
2. Given I swipe left to reject, when prompted, then I must provide a reason.
3. Given I am on leave with delegation set, when a request arrives, then it routes to my delegate automatically.

---

### Epic: Documents, policies & e-sign

#### US-DOC-001: Policy acknowledgement
**Priority:** Must Have · **Flow:** FLW-DOC-001

```
As People Ops,
I want to distribute policy versions and track acknowledgements,
So that compliance is verifiable for ISO audits.
```

**Acceptance criteria:**
1. Given a new policy version is published, when employees log in, then they are prompted to read and acknowledge before proceeding.
2. Given the compliance dashboard, when I filter unacknowledged, then I see workers missing current version with division/country breakdown.
3. Given acknowledgement, when recorded, then timestamp, version, and worker ID are stored immutably.

#### US-DOC-002: Generate HR letter from template
**Priority:** Must Have · **Flow:** FLW-DOC-002

```
As People Ops,
I want to generate offer letters and contracts from templates with merge fields,
So that document production is fast and consistent.
```

**Acceptance criteria:**
1. Given a new hire with profile data complete, when I issue an offer letter, then merge fields populate from worker record, legal entity letterhead applies, and a unique `document_number` is assigned.
2. Given a missing required merge field, when I preview, then validation highlights the gap before issue.
3. Given issue succeeds, when PDF is created, then it attaches to worker documents and can route to e-sign or export for print-on-letterhead.

#### US-DOC-003: E-sign in browser
**Priority:** Must Have · **Flow:** FLW-DOC-003

```
As a signatory,
I want to sign documents in my browser with draw/type/upload signature,
So that I don't need a third-party e-sign tool.
```

**Acceptance criteria:**
1. Given an envelope sent to me, when I open the signing UI, then I see the PDF, consent screen, and signature options.
2. Given I complete all fields, when I submit, then `esign_audit_events` record view, consent, and sign events.
3. Given all signatories complete, when sealing runs, then PAdES-sealed PDF and Certificate of Completion are available.

#### US-DOC-004: Manual sign path
**Priority:** Must Have

```
As a signatory,
I want to export, print, sign on paper, and upload the signed copy,
So that wet signature remains a supported equal path.
```

**Acceptance criteria:**
1. Given a document to sign, when I choose Export PDF, then I can pick a render profile (`full_digital` or `print_on_letterhead`), download, sign offline, and upload the signed copy.
2. Given upload completes, when status updates, then envelope shows `manual_upload` signed with audit trail.
3. Given e-sign and manual paths, when either completes, then the document is marked Signed with equal legal standing per product decision.
4. Given a legal entity with `requires_wet_stamp`, when I upload a manually signed copy, then I see a stamp verification checklist before completion.

#### US-DOC-005: Print on physical letterhead
**Priority:** Must Have · **Flow:** FLW-DOC-002

```
As People Ops,
I want to export an issued document for printing on pre-printed letterhead,
So that hard-copy requests are fast and ISO-controlled without re-creating Word documents.
```

**Acceptance criteria:**
1. Given an issued document for any entity (PK, UAE, SG), when I export with `print_on_letterhead`, then the PDF has no digital header, body uses configured margins, and footer shows `document_number`.
2. Given entity `requires_wet_stamp`, when I export for print, then a stamp placement zone and instructions appear on the PDF.
3. Given I issue a document, when assigned, then `document_number` is unique, immutable, and appears on all render profiles.
4. Given a template with `requires_signature: false`, when I issue, then default export is `informational` with the no-signature banner.

---

### Epic: Onboarding & separation

#### US-TAL-001: Employee day-1 onboarding
**Priority:** Must Have · **Flow:** FLW-TAL-002

```
As a new employee,
I want a warm welcome and guided day-1 onboarding checklist,
So that my first day feels human, not bureaucratic.
```

**Acceptance criteria:**
1. Given my first login (Entra SSO), when I arrive, then I see a welcome screen (photo, team, message) before the task list.
2. Given pre-boarding data was merged, when I open my profile tasks, then I confirm pre-filled data and only complete gaps.
3. Given onboarding tasks, when Entra auto-provisioning succeeds, then `entra_status` is `provisioned` and the IT task auto-completes.
4. Given all mandatory tasks complete, when I finish, then I see "You're all set" and manager is notified.

#### US-TAL-002: Separation clearance
**Priority:** Must Have · **Flow:** FLW-TAL-003

```
As People Ops,
I want multi-department clearance before separation completes,
So that no access or assets are missed.
```

**Acceptance criteria:**
1. Given a resignation with IT clearance pending, when I try to close separation, then status remains In progress.
2. Given all clearances Cleared or Waived, when People Ops closes, then worker status becomes Archived and experience letter is available.
3. Given last working day arrives, when configured, then Entra disable task triggers via Graph API (FLW-SEC-006).

#### US-TAL-005: Pre-boarding data collection
**Priority:** Must Have · **Flow:** FLW-TAL-006

```
As a candidate who accepted an offer,
I want to submit my personal and payroll details securely at my personal email before my start date,
So that HR does not re-enter my data on day one.
```

**Acceptance criteria:**
1. Given offer accepted, when pre-boarding is triggered, then a magic link is sent to my personal email (not work email).
2. Given I open the link, when I have not consented, then I must accept the data processing notice before seeing fields.
3. Given I am a UAE hire, when I complete pre-boarding, then I must provide passport details, previous visa status, and upload passport bio page; previous visa copy required unless status is `never_had_uae_visa`.
4. Given I am a Singapore hire, when I complete pre-boarding, then I must provide passport details, previous work-pass status, and upload passport bio page; previous pass copy required unless status is `never_had_pass`.
5. Given I submit bank and tax ID, when Finance has not reviewed a flagged duplicate, then merge is blocked until resolved.
6. Given my start date arrives, when my packet is approved, then data merges into my worker profile (including passport and visa records) without re-entry and day-1 onboarding starts.

#### US-SEC-002: Entra / M365 auto-provisioning
**Priority:** Must Have · **Flow:** FLW-SEC-006

```
As IT Admin,
I want Entra accounts and mailboxes provisioned automatically before start date,
So that new hires can sign in on day one without manual ticket handling.
```

**Acceptance criteria:**
1. Given an employee with start date in 5 days and N=3, when the scheduled job runs, then Graph creates the user, assigns license, and `entra_status` becomes `provisioned`.
2. Given Graph API failure, when retries exhaust, then an IT task is created with error detail and onboarding is blocked until resolved or waived.
3. Given a contractor with `entra_status: not_required`, when onboarding runs, then no Entra job is queued unless IT manually triggers one.

---

### Epic: Automation & reports

#### US-AUTO-001: Compliance alerts
**Priority:** Must Have · **Flow:** FLW-AUTO-001

```
As People Ops,
I want automated alerts for visa expiry and probation end,
So that compliance risks are never missed.
```

**Acceptance criteria:**
1. Given a visa expiring in 30 days, when the daily alert job runs, then People Ops and the worker's manager are notified.
2. Given zero missed visa expiries (PRD §3 metric), when reporting, then dashboard confirms no overdue unactioned alerts.
3. Given an alert is actioned, when marked resolved, then audit trail records resolution.

#### US-AUTO-002: Birthday and anniversary
**Priority:** Must Have

```
As a team member,
I want birthdays and work anniversaries acknowledged warmly,
So that Polaris feels human.
```

**Acceptance criteria:**
1. Given today is a colleague's birthday, when I open Home, then a designed card appears (with full opt-out respected).
2. Given a 5-year anniversary, when the alert fires, then milestone flourish is applied per UX spec §5.5.
3. Given notification preferences, when user opts out of social notifications, then no birthday push is sent.

---

## Phase 2 — Full operations

### Epic: Contractor portal

#### US-CON-001: Submit invoice
**Priority:** Should Have · **Flow:** FLW-OPS-003

```
As a contractor,
I want to submit invoices with OCR-assisted form filling,
So that I get paid without email back-and-forth.
```

**Acceptance criteria:**
1. Given I upload an invoice PDF, when OCR runs, then amount and date pre-fill.
2. Given I submit, when routed, then status tracker shows "With your manager".
3. Given Finance approves and pays, when complete, then tracker shows "Paid on {date}" — I never need to ask.

#### US-CON-002: Manager and Finance invoice approval
**Priority:** Should Have

```
As a manager,
I want to approve contractor invoices for work delivered,
So that Finance can process payment.
```

**Acceptance criteria:**
1. Given an invoice from my project contractor, when I approve, then it routes to Finance for final approval.
2. Given Finance approves, when batched, then invoice is included in contractor payment batch export.

#### US-CON-003: Remittance documentation for bank compliance
**Priority:** Should Have · **Flow:** FLW-PAY-005

```
As a contractor paid cross-border (e.g. SG company paying my PK bank account),
I want all remittance documents in one place in my portal,
So that I can satisfy my bank's inward remittance requirements without chasing Finance.
```

**Acceptance criteria:**
1. Given my invoice is queued from an SG entity to my PK bank, when I open invoice detail, then I see a remittance checklist with auto-available docs and pending SWIFT.
2. Given Finance uploads SWIFT, when pack completes, then I can download ZIP.

#### US-EMP-004: Employee cross-border remittance documents
**Priority:** Should Have · **Flow:** FLW-PAY-005

```
As an FTE or part-time employee paid cross-border into my home-country bank,
I want remittance documents with my payslip in the employee portal,
So that I can provide my bank proof of inward salary transfer.
```

**Acceptance criteria:**
1. Given I am FTE paid from SG entity to PK bank, when payslips are released, then payslip detail shows remittance checklist with payslip, employment contract, and payment advice.
2. Given Finance uploads SWIFT on my pay run line, when pack completes, then I can download ZIP from payslip detail.
3. Given domestic PK→PK salary, when corridor omits SWIFT, then pack shows payslip and payment advice only.

#### US-PAY-003: Upload remittance proof
**Priority:** Should Have · **Flow:** FLW-PAY-005

```
As Finance,
I want to attach SWIFT copies and bank payment proof to contractor payment lines,
So that cross-border payments are fully documented for contractors and audit.
```

**Acceptance criteria:**
1. Given a cross-border employee pay run line (SG→PK), when I upload SWIFT and payment reference, then remittance pack completes and employee is notified.
2. Given a cross-border contractor payment line, when I upload SWIFT, then pack completes per same corridor rules.
3. Given corridor requires SWIFT, when payment marked complete without upload, then pack stays incomplete and Finance is alerted.

---

### Epic: Payroll & finance export

#### US-PAY-001: Pay run calculation and approval
**Priority:** Should Have · **Flow:** FLW-PAY-001

```
As Finance,
I want to run payroll with anomaly detection and a single approval gate,
So that pay is accurate before export to Xero.
```

**Acceptance criteria:**
1. Given period close, when I open pay run, then attendance/LOP, leave, joiners/leavers, and benefits auto-populate.
2. Given anomalies (zero net, >10% variance), when review screen loads, then flags are highlighted.
3. Given I approve, when export is generated, then PDF + Excel pack downloads and payslips release to employees.

#### US-PAY-002: Finance export pack (no Xero API)
**Priority:** Should Have · **Flow:** FLW-PAY-002

```
As Finance,
I want PDF and Excel export packs formatted for manual Xero entry,
So that accounting stays accurate without API integration.
```

**Acceptance criteria:**
1. Given approved pay run, when I download export, then Excel contains columns mapped per country/entity config.
2. Given contractor payment batch, when exported, then withholding tax columns are included where configured.
3. Given export, when downloaded, then `pay_run_export_batches` audit record is created.

---

### Epic: Operations

#### US-OPS-001: Expense claim with policy limits
**Priority:** Should Have · **Flow:** FLW-OPS-001

```
As an employee,
I want to submit expenses with receipt OCR and policy limit checks,
So that claims are processed quickly.
```

**Acceptance criteria:**
1. Given I photograph a receipt, when OCR runs, then amount, date, and vendor pre-fill.
2. Given claim exceeds policy limit, when I submit, then warning shows before submission (not silently rejected).
3. Given approval chain, when tracker advances, then employee sees Manager → Finance → Paid steps.

#### US-OPS-002: Help desk ticket
**Priority:** Should Have · **Flow:** FLW-OPS-004

```
As any staff member,
I want to raise an HR/IT/Admin ticket with status tracking,
So that my issue is not lost in Teams chat.
```

**Acceptance criteria:**
1. Given I raise an IT ticket, when created, then it routes to IT Admin queue with SLA timer.
2. Given ticket is resolved, when I view Hub, then status shows Closed with resolution note.
3. Given ticket links to onboarding task, when IT clears asset return, then separation clearance auto-updates.

---

### Epic: Talent (Phase 2)

#### US-TAL-003: Recruitment pipeline
**Priority:** Should Have · **Flow:** FLW-TAL-001

```
As a hiring manager,
I want to manage requisitions and candidates through to hire,
So that recruitment is tracked and compliant.
```

**Acceptance criteria:**
1. Given a requisition, when Division Head approves, then it opens for candidate intake.
2. Given GDPR consent on application, when recorded, then consent timestamp is stored.
3. Given hire decision, when offer is accepted, then worker profile is created in `pre_boarding` status and FLW-TAL-006 pre-boarding is triggered.

#### US-TAL-004: Performance review cycle
**Priority:** Should Have · **Flow:** FLW-TAL-004

```
As a manager,
I want to conduct performance reviews with goals and outcomes,
So that reviews are structured and linked to HR records.
```

**Acceptance criteria:**
1. Given review cycle open, when I complete a review, then outcome (exceeds/meets/below) is recorded.
2. Given probation outcome, when marked failed, then separation workflow can be triggered.
3. Given review complete, when employee views, then they see their goals and manager feedback (scoped).

---

## Cross-cutting stories

#### US-UX-001: Responsive parity
**Priority:** Must Have

```
As an employee on my phone,
I want the same workflows as on desktop,
So that I can manage HR tasks anywhere.
```

**Acceptance criteria:**
1. Given mobile viewport, when I complete check-in, leave, and signing, then all work without horizontal scroll or hover-only controls.
2. Given desktop viewport, when I use admin pay run review, then multi-column grid is available.
3. Given tablet, when I approve as manager, then swipe and button equivalents both work.

#### US-UX-002: Notification discipline
**Priority:** Must Have

```
As any user,
I want control over notification channels and quiet hours,
So that Polaris doesn't spam me.
```

**Acceptance criteria:**
1. Given default settings, when FYI events occur, then they batch into daily digest at my local morning.
2. Given I set quiet hours 22:00–08:00, when a non-urgent notification fires at 23:00 my time, then it holds until 08:00.
3. Given action-required approval, when it arrives, then push + in-app fire immediately (unless muted per type).

#### US-COMP-001: Audit evidence export
**Priority:** Must Have

```
As Super Admin,
I want to export audit logs and compliance evidence,
So that ISO and future SOC 2 audits are supported.
```

**Acceptance criteria:**
1. Given audit log search, when I export CSV, then all field changes include actor, timestamp, old/new values.
2. Given policy compliance report, when scheduled monthly, then unacknowledged workers list is delivered to People Ops.
3. Given pay run, when exported, then approval chain is included in PDF register.

---

## Story index by flow ID

| Flow ID | Story |
|---|---|
| FLW-HR-001 | US-HR-001 |
| FLW-HR-002 | US-HR-002 |
| FLW-HR-003 | US-HR-003 |
| FLW-TIME-001 | US-EMP-002 |
| FLW-TIME-002 | US-LEAVE-001 |
| FLW-TIME-003 | US-EMP-001 |
| FLW-DOC-001 | US-DOC-001 |
| FLW-DOC-002 | US-DOC-002 |
| FLW-DOC-003 | US-DOC-003, US-DOC-004 |
| FLW-TAL-002 | US-TAL-001 |
| FLW-TAL-003 | US-TAL-002 |
| FLW-TAL-006 | US-TAL-005 |
| FLW-SEC-006 | US-SEC-002 |
| FLW-OPS-001 | US-OPS-001 |
| FLW-OPS-003 | US-CON-001, US-CON-002 |
| FLW-PAY-001 | US-PAY-001 |
| FLW-PAY-002 | US-PAY-002 |
| FLW-PAY-005 | US-CON-003, US-EMP-004, US-PAY-003 |
| FLW-AUTO-001 | US-AUTO-001 |
| FLW-SEC-001 | US-AUTH-001 |

Full flow catalogue: [../compliance/feature-flows.md](../compliance/feature-flows.md)
