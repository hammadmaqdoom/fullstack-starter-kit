export enum TravelType {
  DOMESTIC = 'domestic',
  INTERNATIONAL = 'international',
}

/**
 * FLW-OPS-002 — Draft → Submitted → Approved → In progress → Completed →
 * Reconciled | Rejected. The Manager/Finance/People Ops approval chain within
 * `submitted` is tracked via `managerApprovedAt`/`financeApprovedAt`/
 * `peopleOpsApprovedAt` per `travel_approval_rules`, not separate statuses.
 */
export enum TravelRequestStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  RECONCILED = 'reconciled',
  REJECTED = 'rejected',
}
