export enum RequisitionStatus {
  DRAFT = 'draft',
  PENDING_DIVISION_HEAD = 'pending_division_head',
  PENDING_PEOPLE_OPS = 'pending_people_ops',
  OPEN = 'open',
  ON_HOLD = 'on_hold',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum CandidateStatus {
  APPLIED = 'applied',
  SCREENING = 'screening',
  INTERVIEW = 'interview',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
}

export enum ScorecardRecommendation {
  STRONG_HIRE = 'strong_hire',
  HIRE = 'hire',
  NO_HIRE = 'no_hire',
  STRONG_NO_HIRE = 'strong_no_hire',
}
