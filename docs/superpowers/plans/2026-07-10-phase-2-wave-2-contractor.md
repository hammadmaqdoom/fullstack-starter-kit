# Phase 2 Wave 2 — Contractor Portal & Remittance

> **For agentic workers:** Use superpowers:subagent-driven-development. Checkbox tracking.

**Goal:** Contractor invoice E2E (submit → manager → Finance → payment batch → paid) + remittance packs (FLW-PAY-005, FLW-OPS-004).

**Architecture:** Extend `operations` for invoices; extend `payroll` for contractor payment batches + remittance. Frontend `contractor/*` 4-tab portal. Reuse existing contractor Better Auth email login.

**Tech:** NestJS, TypeORM, Next.js, pdf-lib, existing Hub aggregation.

**Design:** `docs/superpowers/specs/2026-07-10-phase-2-design.md`  
**PRD:** §6.20, §6.12.9  
**FLW:** FLW-OPS-004, FLW-PAY-002, FLW-PAY-005

---

### Task 1: Contractor invoice entities + CRUD

**Files:**
- Create: `backend/src/modules/operations/entities/contractor-invoice.entity.ts`
- Create: `backend/src/modules/operations/entities/contractor-invoice-line-item.entity.ts`
- Create: migration `1783038800000-CreateContractorInvoices.ts`
- Create: `contractor-invoice.service.ts`, controller, DTOs, tests
- Enums: draft, submitted, manager_approved, finance_approved, queued, paid, rejected

- [ ] TDD: create draft, submit, duplicate invoice number blocked, country/currency validation via allowed currencies if available
- [ ] Audit on mutations
- [ ] RBAC: contractor own; manager approve; Finance approve
- [ ] Commit: `feat(operations): contractor invoices with approval flow`

### Task 2: Hub + manager/Finance approval wiring

- [ ] Extend HubService to include contractor invoices in for_me / mine
- [ ] Approve/reject from Hub if pattern exists
- [ ] Commit: `feat(operations): hub items for contractor invoices`

### Task 3: Contractor payment batches (FLW-PAY-002)

- [ ] Entities: contractor_payment_batches, contractor_payment_lines
- [ ] Migration `1783038900000-CreateContractorPaymentBatches.ts`
- [ ] Service: create batch from finance_approved invoices → approve → export → mark-paid
- [ ] API per api-specification §4.11
- [ ] Commit: `feat(payroll): contractor payment batches`

### Task 4: Remittance corridors + packs (FLW-PAY-005)

- [ ] remittance_corridor_configs, remittance_packs, remittance_pack_documents
- [ ] Migration `1783039000000-CreateRemittancePacks.ts`
- [ ] Auto-create pack stub when payslip released or invoice queued if payer country ≠ bank country
- [ ] Finance SWIFT upload; ZIP download
- [ ] Commit: `feat(payroll): remittance packs and SWIFT upload`

### Task 5: Contractor portal frontend (UX §6.5)

- [ ] Routes: `/contractor` dashboard, invoices, documents, profile (4 tabs)
- [ ] RequireRole contractor
- [ ] Invoice submit form + status tracker + remittance checklist
- [ ] en.json only
- [ ] Commit: `feat(contractor): four-tab portal with invoices`

### Task 6: Finance contractor batch UI + Wave 2 tasks.md

- [ ] `finance/contractor-payments` page
- [ ] Check off tasks.md §2.3 items
- [ ] Commit: `docs(tasks): check off Phase 2 Wave 2 contractor items`

---

## Spec coverage

| Requirement | Task |
|---|---|
| FLW-OPS-004 invoice | 1–2 |
| FLW-PAY-002 batch | 3 |
| FLW-PAY-005 remittance | 4 |
| UX §6.5 portal | 5 |
| Finance UI batch | 6 |
