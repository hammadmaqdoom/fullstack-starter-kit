export enum ReportType {
  HEADCOUNT = 'headcount',
  ATTRITION = 'attrition',
  LEAVE_LIABILITY = 'leave_liability',
  POLICY_COMPLIANCE = 'policy_compliance',
  VISA_EXPIRY = 'visa_expiry',
}

export enum ReportCadence {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum ComplianceAlertType {
  VISA_EXPIRY = 'visa_expiry',
  PROBATION_END = 'probation_end',
  BIRTHDAY = 'birthday',
  WORK_ANNIVERSARY = 'work_anniversary',
}

export enum ComplianceAlertStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

export enum ComplianceAlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertRuleChannel {
  EMAIL = 'email',
  TEAMS = 'teams',
  IN_APP = 'in_app',
}
