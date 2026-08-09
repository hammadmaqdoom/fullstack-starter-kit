export enum OnboardingTemplateStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export enum OnboardingAssigneeRole {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  PEOPLE_OPS = 'people_ops',
  IT = 'it',
  FINANCE = 'finance',
}

export enum OnboardingCaseStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETE = 'complete',
}

export enum OnboardingTaskStatus {
  PENDING = 'pending',
  DONE = 'done',
  SKIPPED = 'skipped',
  BLOCKED = 'blocked',
}

export enum SeparationCaseStatus {
  INITIATED = 'initiated',
  IN_PROGRESS = 'in_progress',
  CLEARED = 'cleared',
  ARCHIVED = 'archived',
}

export enum SeparationInitiationType {
  RESIGNATION = 'resignation',
  TERMINATION = 'termination',
  END_OF_CONTRACT = 'end_of_contract',
  OTHER = 'other',
}

export enum ClearanceCategory {
  HR = 'hr',
  IT = 'it',
  FINANCE = 'finance',
  MANAGER = 'manager',
}

export enum ClearanceItemStatus {
  PENDING = 'pending',
  CLEARED = 'cleared',
  WAIVED = 'waived',
}

export enum PreBoardingPacketStatus {
  DRAFT = 'draft',
  INVITED = 'invited',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  COMPLETE = 'complete',
  CANCELLED = 'cancelled',
}

export enum PassportSource {
  PRE_BOARDING = 'pre_boarding',
  MANUAL = 'manual',
  RENEWAL = 'renewal',
}

export enum VisaRecordType {
  PREVIOUS = 'previous',
  CURRENT = 'current',
}

export enum VisaApplicationStatus {
  PENDING_SPONSORSHIP = 'pending_sponsorship',
  APPLICATION_IN_PROGRESS = 'application_in_progress',
  IPA_APPROVED = 'ipa_approved',
  APPROVED = 'approved',
  STAMPED = 'stamped',
  ISSUED = 'issued',
  ACTIVE = 'active',
  RENEWED = 'renewed',
  CANCELLED = 'cancelled',
}

export enum VisaAttachmentType {
  PASSPORT_BIO = 'passport_bio',
  PASSPORT_FULL = 'passport_full',
  PREVIOUS_VISA = 'previous_visa',
  PREVIOUS_PASS = 'previous_pass',
  CANCELLATION_STAMP = 'cancellation_stamp',
  ENTRY_PERMIT = 'entry_permit',
  LABOUR_CARD = 'labour_card',
  EMIRATES_ID = 'emirates_id',
  IPA_LETTER = 'ipa_letter',
  MOM_APPROVAL = 'mom_approval',
  OTHER = 'other',
}

export enum ExitInterviewStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  ARCHIVED = 'archived',
}

export enum EntraProvisioningJobStatus {
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  MANUAL_COMPLETE = 'manual_complete',
}
