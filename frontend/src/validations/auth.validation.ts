/**
 * Better Auth Validation Schemas
 * 
 * Zod schemas for all authentication forms and API requests.
 * These schemas provide client-side validation before API calls.
 */

import { z } from 'zod';

// ============================================================================
// Common Validation Rules
// ============================================================================

const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

const otpCodeSchema = z
  .string()
  .length(6, 'Code must be 6 digits')
  .regex(/^\d{6}$/, 'Code must contain only numbers');

const totpCodeSchema = z
  .string()
  .length(6, 'Code must be 6 digits')
  .regex(/^\d{6}$/, 'Code must contain only numbers');

const backupCodeSchema = z
  .string()
  .min(8, 'Backup code must be at least 8 characters')
  .max(20, 'Backup code must be less than 20 characters');

// ============================================================================
// Authentication Schemas
// ============================================================================

export const signInEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(true),
});

export const signInUsernameSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(true),
});

export const signUpEmailSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const signInMagicLinkSchema = z.object({
  email: emailSchema,
  name: nameSchema.optional(),
});

// ============================================================================
// Password Management Schemas
// ============================================================================

export const forgetPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  token: z.string().optional(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  revokeOtherSessions: z.boolean().optional().default(false),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

// ============================================================================
// Profile Management Schemas
// ============================================================================

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  image: z.string().url('Invalid image URL').optional().or(z.literal('')),
});

export const changeEmailSchema = z.object({
  newEmail: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const deleteUserSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmation: z.string().refine((val) => val === 'DELETE', {
    message: 'Please type DELETE to confirm',
  }),
});

// ============================================================================
// Two-Factor Authentication Schemas
// ============================================================================

export const enableTwoFactorSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  issuer: z.string().optional(),
});

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const verifyTOTPSchema = z.object({
  code: totpCodeSchema,
  trustDevice: z.boolean().optional().default(false),
});

export const verifyOTPSchema = z.object({
  code: otpCodeSchema,
  trustDevice: z.boolean().optional().default(false),
});

export const verifyBackupCodeSchema = z.object({
  code: backupCodeSchema,
  trustDevice: z.boolean().optional().default(false),
});

export const generateBackupCodesSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// Email Verification Schemas
// ============================================================================

export const sendVerificationEmailSchema = z.object({
  email: emailSchema,
});

// ============================================================================
// Social Authentication Schemas
// ============================================================================

export const linkSocialSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  scopes: z.array(z.string()).optional(),
});

export const unlinkAccountSchema = z.object({
  providerId: z.string().min(1, 'Provider ID is required'),
  accountId: z.string().optional(),
});

// ============================================================================
// Session Management Schemas
// ============================================================================

export const revokeSessionSchema = z.object({
  token: z.string().min(1, 'Session token is required'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type SignInEmailFormData = z.infer<typeof signInEmailSchema>;
export type SignInUsernameFormData = z.infer<typeof signInUsernameSchema>;
export type SignUpEmailFormData = z.infer<typeof signUpEmailSchema>;
export type SignInMagicLinkFormData = z.infer<typeof signInMagicLinkSchema>;
export type ForgetPasswordFormData = z.infer<typeof forgetPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type ChangeEmailFormData = z.infer<typeof changeEmailSchema>;
export type DeleteUserFormData = z.infer<typeof deleteUserSchema>;
export type EnableTwoFactorFormData = z.infer<typeof enableTwoFactorSchema>;
export type DisableTwoFactorFormData = z.infer<typeof disableTwoFactorSchema>;
export type VerifyTOTPFormData = z.infer<typeof verifyTOTPSchema>;
export type VerifyOTPFormData = z.infer<typeof verifyOTPSchema>;
export type VerifyBackupCodeFormData = z.infer<typeof verifyBackupCodeSchema>;
export type GenerateBackupCodesFormData = z.infer<typeof generateBackupCodesSchema>;
export type SendVerificationEmailFormData = z.infer<typeof sendVerificationEmailSchema>;
export type LinkSocialFormData = z.infer<typeof linkSocialSchema>;
export type UnlinkAccountFormData = z.infer<typeof unlinkAccountSchema>;
export type RevokeSessionFormData = z.infer<typeof revokeSessionSchema>;

