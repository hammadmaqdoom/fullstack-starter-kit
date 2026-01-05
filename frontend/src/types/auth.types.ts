/**
 * Better Auth TypeScript Types
 * 
 * These types match the OpenAPI specification for the Better Auth API.
 * All types are based on the backend API responses.
 */

// ============================================================================
// User & Session Types
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  username?: string;
  displayUsername?: string;
  twoFactorEnabled?: boolean;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: Date | string;
  createdAt: Date | string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionWithUser {
  session: Session;
  user: User;
}

export interface Account {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  accessTokenExpiresAt?: Date | string;
  refreshTokenExpiresAt?: Date | string;
  scope?: string;
  password?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Verification {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TwoFactor {
  id: string;
  secret: string;
  backupCodes: string;
  userId: string;
}

// ============================================================================
// API Request Types
// ============================================================================

export interface SignInEmailRequest {
  email: string;
  password: string;
  callbackURL?: string;
  rememberMe?: boolean;
}

export interface SignInUsernameRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpEmailRequest {
  name: string;
  email: string;
  password: string;
  callbackURL?: string;
}

export interface SignInSocialRequest {
  provider: string;
  callbackURL?: string;
  newUserCallbackURL?: string;
  errorCallbackURL?: string;
  disableRedirect?: boolean;
  idToken?: string;
  scopes?: string[];
  requestSignUp?: boolean;
  loginHint?: string;
}

export interface ForgetPasswordRequest {
  email: string;
  redirectTo?: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
  token?: string;
}

export interface ChangePasswordRequest {
  newPassword: string;
  currentPassword: string;
  revokeOtherSessions?: boolean;
}

export interface ChangeEmailRequest {
  newEmail: string;
  callbackURL?: string;
}

export interface UpdateUserRequest {
  name?: string;
  image?: string;
}

export interface DeleteUserRequest {
  callbackURL?: string;
  password?: string;
  token?: string;
}

export interface SendVerificationEmailRequest {
  email: string;
  callbackURL?: string;
}

export interface LinkSocialRequest {
  provider: string;
  callbackURL?: string;
  scopes?: string[];
}

export interface UnlinkAccountRequest {
  providerId: string;
  accountId?: string;
}

export interface RevokeSessionRequest {
  token: string;
}

export interface RefreshTokenRequest {
  providerId: string;
  accountId?: string;
  userId?: string;
}

// Magic Link
export interface SignInMagicLinkRequest {
  email: string;
  name?: string;
  callbackURL?: string;
}

// Two-Factor
export interface GetTOTPUriRequest {
  password: string;
}

export interface VerifyTOTPRequest {
  code: string;
  trustDevice?: boolean;
}

export interface VerifyOTPRequest {
  code: string;
  trustDevice?: boolean;
}

export interface VerifyBackupCodeRequest {
  code: string;
  disableSession?: boolean;
  trustDevice?: boolean;
}

export interface GenerateBackupCodesRequest {
  password: string;
}

export interface EnableTwoFactorRequest {
  password: string;
  issuer?: string;
}

export interface DisableTwoFactorRequest {
  password: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SignInResponse {
  redirect: boolean;
  token: string;
  url?: string | null;
  user: User;
}

export interface SignUpResponse {
  token?: string | null;
  user: User;
}

export interface SocialSignInResponse {
  redirect: boolean;
  token?: string;
  url?: string;
  user?: User;
}

export interface GetSessionResponse {
  session: Session;
  user: User;
}

export interface SignOutResponse {
  success: boolean;
}

export interface ForgetPasswordResponse {
  status: boolean;
}

export interface ResetPasswordResponse {
  status: boolean;
}

export interface ChangePasswordResponse {
  token?: string | null;
  user: User;
}

export interface ChangeEmailResponse {
  status: boolean;
  message?: 'Email updated' | 'Verification email sent';
}

export interface UpdateUserResponse {
  status: boolean;
}

export interface DeleteUserResponse {
  success: boolean;
  message: 'User deleted' | 'Verification email sent';
}

export interface VerifyEmailResponse {
  user: User;
  status: boolean;
}

export interface SendVerificationEmailResponse {
  status: boolean;
}

export interface LinkSocialResponse {
  url: string;
  redirect: boolean;
}

export interface ListAccountsResponse {
  id: string;
  provider: string;
  accountId: string;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RevokeSessionResponse {
  status: boolean;
}

export interface RefreshTokenResponse {
  tokenType: string;
  idToken?: string;
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
}

export interface OkResponse {
  ok: boolean;
}

// Magic Link
export interface SignInMagicLinkResponse {
  status: boolean;
}

export interface VerifyMagicLinkResponse {
  session: Session;
  user: User;
}

// Two-Factor
export interface GetTOTPUriResponse {
  totpURI: string;
}

export interface VerifyTOTPResponse {
  status: boolean;
}

export interface SendOTPResponse {
  status: boolean;
}

export interface VerifyOTPResponse {
  token: string;
  user: User;
}

export interface VerifyBackupCodeResponse {
  user: User;
  session: Session;
}

export interface GenerateBackupCodesResponse {
  status: boolean;
  backupCodes: string[];
}

export interface EnableTwoFactorResponse {
  totpURI: string;
  backupCodes: string[];
}

export interface DisableTwoFactorResponse {
  status: boolean;
}

// ============================================================================
// Error Response Types
// ============================================================================

export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}

export interface ApiErrorResponse {
  message: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type AuthProvider = 'google' | 'github' | 'facebook' | 'twitter' | 'discord' | string;

export type TwoFactorMethod = 'totp' | 'otp' | 'backup-code';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: ApiError | null;
}

export interface UseSessionReturn {
  data: SessionWithUser | null;
  isPending: boolean;
  error: ApiError | null;
}

