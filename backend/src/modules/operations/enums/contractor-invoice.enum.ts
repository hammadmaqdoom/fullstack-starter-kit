/**
 * PRD §6.20.2 states: Draft → Submitted → Manager approved → Finance approved
 * → Queued for payment → Paid | Rejected. `queued`/`paid` are set by the
 * contractor payment batch flow (FLW-PAY-002, later task) — not mutated here.
 */
export enum ContractorInvoiceStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  MANAGER_APPROVED = 'manager_approved',
  FINANCE_APPROVED = 'finance_approved',
  QUEUED = 'queued',
  PAID = 'paid',
  REJECTED = 'rejected',
}
