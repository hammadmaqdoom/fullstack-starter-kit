/**
 * Better Auth API Service
 * 
 * This service provides type-safe methods for all Better Auth API endpoints.
 * It handles API communication with the backend and error handling.
 */

import { Env } from './Env';
import type {
  // Request Types
  SignInEmailRequest,
  SignInUsernameRequest,
  SignUpEmailRequest,
  SignInSocialRequest,
  ForgetPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  ChangeEmailRequest,
  UpdateUserRequest,
  DeleteUserRequest,
  SendVerificationEmailRequest,
  LinkSocialRequest,
  UnlinkAccountRequest,
  RevokeSessionRequest,
  RefreshTokenRequest,
  SignInMagicLinkRequest,
  GetTOTPUriRequest,
  VerifyTOTPRequest,
  VerifyOTPRequest,
  VerifyBackupCodeRequest,
  GenerateBackupCodesRequest,
  EnableTwoFactorRequest,
  DisableTwoFactorRequest,
  // Response Types
  SignInResponse,
  SignUpResponse,
  SocialSignInResponse,
  GetSessionResponse,
  SignOutResponse,
  ForgetPasswordResponse,
  ResetPasswordResponse,
  ChangePasswordResponse,
  ChangeEmailResponse,
  UpdateUserResponse,
  DeleteUserResponse,
  VerifyEmailResponse,
  SendVerificationEmailResponse,
  LinkSocialResponse,
  ListAccountsResponse,
  RevokeSessionResponse,
  RefreshTokenResponse,
  OkResponse,
  SignInMagicLinkResponse,
  VerifyMagicLinkResponse,
  GetTOTPUriResponse,
  VerifyTOTPResponse,
  SendOTPResponse,
  VerifyOTPResponse,
  VerifyBackupCodeResponse,
  GenerateBackupCodesResponse,
  EnableTwoFactorResponse,
  DisableTwoFactorResponse,
  Session,
  ApiError,
} from '@/types/auth.types';

// ============================================================================
// Base API Configuration
// ============================================================================

const API_BASE_URL = `${Env.NEXT_PUBLIC_BACKEND_URL}/api/auth`;

const defaultHeaders = {
  'Content-Type': 'application/json',
};

const fetchOptions: RequestInit = {
  credentials: 'include', // Important for cookies
  headers: defaultHeaders,
};

// ============================================================================
// Error Handling
// ============================================================================

class AuthApiError extends Error {
  statusCode: number;
  response?: ApiError;

  constructor(message: string, statusCode: number, response?: ApiError) {
    super(message);
    this.name = 'AuthApiError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    throw new AuthApiError(
      errorData.message || 'An error occurred',
      response.status,
      errorData
    );
  }

  // Handle empty responses (like 204 No Content)
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  return response.json();
}

// ============================================================================
// Authentication Service
// ============================================================================

export const AuthService = {
  // ==========================================================================
  // Core Authentication
  // ==========================================================================

  /**
   * Sign in with email and password
   */
  async signInEmail(data: SignInEmailRequest): Promise<SignInResponse> {
    const response = await fetch(`${API_BASE_URL}/sign-in/email`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<SignInResponse>(response);
  },

  /**
   * Sign in with username and password
   */
  async signInUsername(data: SignInUsernameRequest): Promise<SignInResponse> {
    const response = await fetch(`${API_BASE_URL}/sign-in/username`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<SignInResponse>(response);
  },

  /**
   * Sign up with email and password
   */
  async signUpEmail(data: SignUpEmailRequest): Promise<SignUpResponse> {
    const response = await fetch(`${API_BASE_URL}/sign-up/email`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<SignUpResponse>(response);
  },

  /**
   * Sign in with social provider
   */
  async signInSocial(data: SignInSocialRequest): Promise<SocialSignInResponse> {
    const response = await fetch(`${API_BASE_URL}/sign-in/social`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<SocialSignInResponse>(response);
  },

  /**
   * Get current session
   */
  async getSession(): Promise<GetSessionResponse> {
    const response = await fetch(`${API_BASE_URL}/get-session`, {
      ...fetchOptions,
      method: 'GET',
    });
    return handleResponse<GetSessionResponse>(response);
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<SignOutResponse> {
    const response = await fetch(`${API_BASE_URL}/sign-out`, {
      ...fetchOptions,
      method: 'POST',
    });
    return handleResponse<SignOutResponse>(response);
  },

  // ==========================================================================
  // Password Management
  // ==========================================================================

  /**
   * Send password reset email
   */
  async forgetPassword(data: ForgetPasswordRequest): Promise<ForgetPasswordResponse> {
    const response = await fetch(`${API_BASE_URL}/forget-password`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<ForgetPasswordResponse>(response);
  },

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<ResetPasswordResponse>(response);
  },

  /**
   * Change password (requires current password)
   */
  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await fetch(`${API_BASE_URL}/change-password`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<ChangePasswordResponse>(response);
  },

  // ==========================================================================
  // Email Management
  // ==========================================================================

  /**
   * Verify email with token
   */
  async verifyEmail(token: string, callbackURL?: string): Promise<VerifyEmailResponse> {
    const params = new URLSearchParams({ token });
    if (callbackURL) params.append('callbackURL', callbackURL);

    const response = await fetch(`${API_BASE_URL}/verify-email?${params}`, {
      ...fetchOptions,
      method: 'GET',
    });
    return handleResponse<VerifyEmailResponse>(response);
  },

  /**
   * Send verification email
   */
  async sendVerificationEmail(data: SendVerificationEmailRequest): Promise<SendVerificationEmailResponse> {
    const response = await fetch(`${API_BASE_URL}/send-verification-email`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<SendVerificationEmailResponse>(response);
  },

  /**
   * Change email address
   */
  async changeEmail(data: ChangeEmailRequest): Promise<ChangeEmailResponse> {
    const response = await fetch(`${API_BASE_URL}/change-email`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<ChangeEmailResponse>(response);
  },

  // ==========================================================================
  // User Management
  // ==========================================================================

  /**
   * Update user profile
   */
  async updateUser(data: UpdateUserRequest): Promise<UpdateUserResponse> {
    const response = await fetch(`${API_BASE_URL}/update-user`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<UpdateUserResponse>(response);
  },

  /**
   * Delete user account
   */
  async deleteUser(data: DeleteUserRequest): Promise<DeleteUserResponse> {
    const response = await fetch(`${API_BASE_URL}/delete-user`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<DeleteUserResponse>(response);
  },

  // ==========================================================================
  // Session Management
  // ==========================================================================

  /**
   * List all active sessions
   */
  async listSessions(): Promise<Session[]> {
    const response = await fetch(`${API_BASE_URL}/list-sessions`, {
      ...fetchOptions,
      method: 'GET',
    });
    return handleResponse<Session[]>(response);
  },

  /**
   * Revoke a specific session
   */
  async revokeSession(data: RevokeSessionRequest): Promise<RevokeSessionResponse> {
    const response = await fetch(`${API_BASE_URL}/revoke-session`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<RevokeSessionResponse>(response);
  },

  /**
   * Revoke all sessions
   */
  async revokeSessions(): Promise<RevokeSessionResponse> {
    const response = await fetch(`${API_BASE_URL}/revoke-sessions`, {
      ...fetchOptions,
      method: 'POST',
    });
    return handleResponse<RevokeSessionResponse>(response);
  },

  /**
   * Revoke all other sessions (except current)
   */
  async revokeOtherSessions(): Promise<RevokeSessionResponse> {
    const response = await fetch(`${API_BASE_URL}/revoke-other-sessions`, {
      ...fetchOptions,
      method: 'POST',
    });
    return handleResponse<RevokeSessionResponse>(response);
  },

  // ==========================================================================
  // Social Account Management
  // ==========================================================================

  /**
   * Link a social account
   */
  async linkSocial(data: LinkSocialRequest): Promise<LinkSocialResponse> {
    const response = await fetch(`${API_BASE_URL}/link-social`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<LinkSocialResponse>(response);
  },

  /**
   * List all linked accounts
   */
  async listAccounts(): Promise<ListAccountsResponse[]> {
    const response = await fetch(`${API_BASE_URL}/list-accounts`, {
      ...fetchOptions,
      method: 'GET',
    });
    return handleResponse<ListAccountsResponse[]>(response);
  },

  /**
   * Unlink a social account
   */
  async unlinkAccount(data: UnlinkAccountRequest): Promise<RevokeSessionResponse> {
    const response = await fetch(`${API_BASE_URL}/unlink-account`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<RevokeSessionResponse>(response);
  },

  /**
   * Refresh OAuth token
   */
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await fetch(`${API_BASE_URL}/refresh-token`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<RefreshTokenResponse>(response);
  },

  // ==========================================================================
  // Magic Link Authentication
  // ==========================================================================

  /**
   * Send magic link to email
   */
  async signInMagicLink(data: SignInMagicLinkRequest): Promise<SignInMagicLinkResponse> {
    const response = await fetch(`${API_BASE_URL}/sign-in/magic-link`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<SignInMagicLinkResponse>(response);
  },

  /**
   * Verify magic link token
   */
  async verifyMagicLink(token: string, callbackURL?: string): Promise<VerifyMagicLinkResponse> {
    const params = new URLSearchParams({ token });
    if (callbackURL) params.append('callbackURL', callbackURL);

    const response = await fetch(`${API_BASE_URL}/magic-link/verify?${params}`, {
      ...fetchOptions,
      method: 'GET',
    });
    return handleResponse<VerifyMagicLinkResponse>(response);
  },

  // ==========================================================================
  // Two-Factor Authentication
  // ==========================================================================

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(data: EnableTwoFactorRequest): Promise<EnableTwoFactorResponse> {
    const response = await fetch(`${API_BASE_URL}/two-factor/enable`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<EnableTwoFactorResponse>(response);
  },

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(data: DisableTwoFactorRequest): Promise<DisableTwoFactorResponse> {
    const response = await fetch(`${API_BASE_URL}/two-factor/disable`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<DisableTwoFactorResponse>(response);
  },

  /**
   * Get TOTP URI for QR code
   */
  async getTOTPUri(data: GetTOTPUriRequest): Promise<GetTOTPUriResponse> {
    const response = await fetch(`${API_BASE_URL}/two-factor/get-totp-uri`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<GetTOTPUriResponse>(response);
  },

  /**
   * Verify TOTP code
   */
  async verifyTOTP(data: VerifyTOTPRequest): Promise<VerifyTOTPResponse> {
    const response = await fetch(`${API_BASE_URL}/two-factor/verify-totp`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<VerifyTOTPResponse>(response);
  },

  /**
   * Send OTP to user
   */
  async sendOTP(): Promise<SendOTPResponse> {
    const response = await fetch(`${API_BASE_URL}/two-factor/send-otp`, {
      ...fetchOptions,
      method: 'POST',
    });
    return handleResponse<SendOTPResponse>(response);
  },

  /**
   * Verify OTP code
   */
  async verifyOTP(data: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    const response = await fetch(`${API_BASE_URL}/two-factor/verify-otp`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<VerifyOTPResponse>(response);
  },

  /**
   * Verify backup code
   */
  async verifyBackupCode(data: VerifyBackupCodeRequest): Promise<VerifyBackupCodeResponse> {
    const response = await fetch(`${API_BASE_URL}/two-factor/verify-backup-code`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<VerifyBackupCodeResponse>(response);
  },

  /**
   * Generate new backup codes
   */
  async generateBackupCodes(data: GenerateBackupCodesRequest): Promise<GenerateBackupCodesResponse> {
    const response = await fetch(`${API_BASE_URL}/two-factor/generate-backup-codes`, {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<GenerateBackupCodesResponse>(response);
  },

  // ==========================================================================
  // Health Check
  // ==========================================================================

  /**
   * Check if API is working
   */
  async ok(): Promise<OkResponse> {
    const response = await fetch(`${API_BASE_URL}/ok`, {
      ...fetchOptions,
      method: 'GET',
    });
    return handleResponse<OkResponse>(response);
  },
};

// Export error class for error handling
export { AuthApiError };

