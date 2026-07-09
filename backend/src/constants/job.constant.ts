export const Queue = {
  Email: 'email',
  Fx: 'fx',
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
} as const satisfies Record<keyof typeof Queue, Record<string, string>>;
