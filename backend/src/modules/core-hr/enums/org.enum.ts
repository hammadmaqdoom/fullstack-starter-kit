export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum ApprovalStatus {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum RelationshipType {
  DIRECT = 'direct',
  DOTTED_LINE = 'dotted_line',
}

/** Default export layout at document generation time (PRD §6.8.1). `informational` is export-time only, never a per-entity default. */
export enum LegalEntityRenderProfile {
  FULL_DIGITAL = 'full_digital',
  PRINT_ON_LETTERHEAD = 'print_on_letterhead',
}
