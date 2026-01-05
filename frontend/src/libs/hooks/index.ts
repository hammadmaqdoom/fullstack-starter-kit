/**
 * Auth Hooks Index
 * 
 * Central export point for all authentication hooks.
 */

// Core authentication hooks
export {
  useAuth,
  useSignIn,
  useSignUp,
  useSignOut,
  usePasswordReset,
  useUserProfile,
  useSessions,
  useEmailVerification,
} from './useAuth';

// Two-factor authentication hooks
export {
  useTwoFactorSetup,
  useTwoFactorVerification,
} from './useTwoFactor';

// Magic link authentication hooks
export {
  useMagicLink,
} from './useMagicLink';

// Social account management hooks
export {
  useSocialAccounts,
  useSocialSignIn,
} from './useSocialAccounts';

// Export types
export type {
  UseSignInReturn,
  UseSignUpReturn,
  UseSignOutReturn,
  UsePasswordResetReturn,
  UseUserProfileReturn,
  UseSessionsReturn,
  UseEmailVerificationReturn,
} from './useAuth';

export type {
  UseTwoFactorSetupReturn,
  UseTwoFactorVerificationReturn,
} from './useTwoFactor';

export type {
  UseMagicLinkReturn,
} from './useMagicLink';

export type {
  UseSocialAccountsReturn,
  UseSocialSignInReturn,
} from './useSocialAccounts';

