export enum ControlDomain {
  PEOPLE = 'people',
  ACCESS = 'access',
  POLICY = 'policy',
  PRIVACY = 'privacy',
  PROCESS = 'process',
}

export enum ControlFrequency {
  CONTINUOUS = 'continuous',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  QUARTERLY = 'quarterly',
  MANUAL = 'manual',
}

export enum ControlOwnerRole {
  PEOPLE_OPS = 'people_ops',
  IT_ADMIN = 'it_admin',
  SUPER_ADMIN = 'super_admin',
  SHARED = 'shared',
}

export enum ControlTestResult {
  PASS = 'pass',
  FAIL = 'fail',
  MANUAL = 'manual',
  ERROR = 'error',
  SKIPPED = 'skipped',
}

export enum ControlTestTrigger {
  SCHEDULE = 'schedule',
  MANUAL = 'manual',
  API = 'api',
}
