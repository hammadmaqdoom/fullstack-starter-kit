/**
 * These template name must match with actual email template files specified at ~/src/shared/mail/templates
 */
export const MailTemplate = {
  EmailVerification: 'email-verification',
  SignInMagicLink: 'signin-magic-link',
  ResetPassword: 'reset-password',
  PreBoardingInvite: 'pre-boarding-invite',
  EsignSigningInvite: 'esign-signing-invite',
  EsignReminder: 'esign-reminder',
  ComplianceAlert: 'compliance-alert',
  ReportExportReady: 'report-export-ready',
} as const;
