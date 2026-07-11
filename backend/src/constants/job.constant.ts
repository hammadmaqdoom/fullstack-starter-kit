export const Queue = {
  Email: 'email',
  Fx: 'fx',
  Compliance: 'compliance',
  Reports: 'reports',
  LeaveAccrual: 'leave-accrual',
  Esign: 'esign',
  Automation: 'automation',
  Talent: 'talent',
  CoreHr: 'core-hr',
} as const;

export const Job = {
  Email: {
    EmailVerification: 'email-verification',
    SignInMagicLink: 'signin-magic-link',
    ResetPassword: 'reset-password',
  },
  Fx: {
    FetchRates: 'fetch-rates',
  },
  Compliance: {
    ScanAlerts: 'scan-alerts',
  },
  Reports: {
    DeliverSubscription: 'deliver-subscription',
    EvaluateDueSubscriptions: 'evaluate-due-subscriptions',
  },
  LeaveAccrual: {
    MonthlyAccrue: 'monthly-accrue',
  },
  Esign: {
    SealPades: 'seal-pades',
    SendReminders: 'send-reminders',
    ExpireEnvelopes: 'expire-envelopes',
  },
  Automation: {
    SendLeaveApprovalCard: 'send-leave-approval-card',
    SendProfileChangeCard: 'send-profile-change-card',
    SendCheckInNudgeCard: 'send-check-in-nudge-card',
    ScanCheckInNudges: 'scan-check-in-nudges',
  },
  Talent: {
    PreBoardingMergeOnStartDate: 'pre-boarding-merge-on-start-date',
    ProbationAutoCycle: 'probation-auto-cycle',
  },
  CoreHr: {
    ImportWorkers: 'import-workers',
  },
} as const satisfies Record<keyof typeof Queue, Record<string, string>>;
