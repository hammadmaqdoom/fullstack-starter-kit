/**
 * PRD §6.9 — configurable per division, but the underlying value set is a
 * fixed catalog (not country-specific) so it lives in an enum rather than a
 * config table.
 */
export enum ExpenseCategory {
  TRAVEL = 'travel',
  FOOD = 'food',
  MEDICAL = 'medical',
  ACCOMMODATION = 'accommodation',
  TRANSPORT = 'transport',
  OFFICE_SUPPLIES = 'office_supplies',
  CLIENT_ENTERTAINMENT = 'client_entertainment',
  OTHER = 'other',
}

/**
 * FLW-OPS-001 — Draft → Submitted → Approved → Paid | Rejected. Manager and
 * Finance approval are both recorded via `managerApprovedAt`/`financeApprovedAt`
 * on the entity; Finance approval is optional confirmation ahead of `markPaid`
 * and does not gate the `approved` status for MVP.
 */
export enum ExpenseClaimStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
}

/**
 * How an approved claim is settled (payout rails design).
 * Default `export_only` preserves pre-rails behaviour.
 */
export enum ExpenseSettlementMode {
  BUNDLE_WITH_PAYROLL = 'bundle_with_payroll',
  STANDALONE_PAYOUT = 'standalone_payout',
  EXPORT_ONLY = 'export_only',
}
