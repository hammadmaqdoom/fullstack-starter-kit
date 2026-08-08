export enum ObjectiveLevel {
  COMPANY = 'company',
  DIVISION = 'division',
  DEPARTMENT = 'department',
}

export enum ObjectiveStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

export enum KeyResultStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum GoalType {
  INDIVIDUAL = 'individual',
  TEAM = 'team',
  PROJECT = 'project',
}

export enum GoalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum GoalProgressStatus {
  ON_TRACK = 'on_track',
  AT_RISK = 'at_risk',
  OFF_TRACK = 'off_track',
}

export enum FeedbackType {
  PRAISE = 'praise',
  CONSTRUCTIVE = 'constructive',
  COACHING = 'coaching',
}

export enum OneOnOneStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PerformanceCycleType {
  ANNUAL = 'annual',
  SEMI_ANNUAL = 'semi_annual',
  QUARTERLY = 'quarterly',
  PROBATION = 'probation',
}

export enum PerformanceCycleStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  MANAGER_REVIEW = 'manager_review',
  CALIBRATION = 'calibration',
  COMPLETED = 'completed',
  LOCKED = 'locked',
}

export enum ReviewStatus {
  PENDING_SELF = 'pending_self',
  PENDING_MANAGER = 'pending_manager',
  PENDING_PEER = 'pending_peer',
  PENDING_CALIBRATION = 'pending_calibration',
  PENDING_SIGN_OFF = 'pending_sign_off',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
}

export enum ReviewOutcome {
  EXCEEDS = 'exceeds',
  MEETS = 'meets',
  BELOW = 'below',
}

export enum ProbationOutcome {
  CONFIRM = 'confirm',
  EXTEND = 'extend',
  TERMINATE = 'terminate',
}

export enum PeerFeedbackRole {
  PEER = 'peer',
  UPWARD = 'upward',
}

export enum DevelopmentPlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DevelopmentActionType {
  TRAINING = 'training',
  MENTORING = 'mentoring',
  STRETCH_PROJECT = 'stretch_project',
  SKILL_TARGET = 'skill_target',
  OTHER = 'other',
}

export enum DevelopmentActionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PulseSurveyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
}
