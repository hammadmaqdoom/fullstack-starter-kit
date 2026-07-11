export enum TrainingCourseType {
  MANDATORY = 'mandatory',
  OPTIONAL = 'optional',
}

export enum TrainingAssignmentStatus {
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
}

export enum TrainingAssignmentSource {
  MANUAL = 'manual',
  ONBOARDING_BUNDLE = 'onboarding_bundle',
  POPULATION = 'population',
}

export enum TrainingVerificationMethod {
  SELF_ATTEST = 'self_attest',
  MANAGER_VERIFIED = 'manager_verified',
  HR_VERIFIED = 'hr_verified',
}
