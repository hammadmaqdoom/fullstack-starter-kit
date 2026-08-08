export enum PunchType {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
}

export enum PunchSource {
  WEB = 'web',
  PWA = 'pwa',
  OFFLINE = 'offline',
}

export enum AttendanceDayStatus {
  IN = 'in',
  OUT = 'out',
  ON_LEAVE = 'on_leave',
  MISSING = 'missing',
  INCOMPLETE = 'incomplete',
}

export enum PunchCorrectionStatus {
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
