/**
 * Custom Auth Hooks
 * 
 * These hooks provide convenient access to authentication functionality
 * throughout the application.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession as useBetterAuthSession } from '../BetterAuth';
import { AuthService, AuthApiError } from '../AuthService';
import type {
  User,
  Session,
  AuthState,
  SignInEmailRequest,
  SignInUsernameRequest,
  SignUpEmailRequest,
  ForgetPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UpdateUserRequest,
  ChangeEmailRequest,
} from '@/types/auth.types';

// ============================================================================
// useAuth - Main authentication hook
// ============================================================================

export function useAuth() {
  const { data: sessionData, isPending, error } = useBetterAuthSession();

  const [authState, setAuthState] = useState<AuthState>({
    user: sessionData?.user as User | null || null,
    session: sessionData?.session as Session | null || null,
    isLoading: isPending,
    isAuthenticated: !!sessionData?.user,
    error: error ? { message: error.message || 'Authentication error' } : null,
  });

  useEffect(() => {
    setAuthState({
      user: sessionData?.user as User | null || null,
      session: sessionData?.session as Session | null || null,
      isLoading: isPending,
      isAuthenticated: !!sessionData?.user,
      error: error ? { message: error.message || 'Authentication error' } : null,
    });
  }, [sessionData, isPending, error]);

  return authState;
}

// ============================================================================
// useSignIn - Sign in hook
// ============================================================================

export interface UseSignInReturn {
  signInWithEmail: (data: SignInEmailRequest) => Promise<void>;
  signInWithUsername: (data: SignInUsernameRequest) => Promise<void>;
  isLoading: boolean;
  error: AuthApiError | null;
}

export function useSignIn(): UseSignInReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthApiError | null>(null);

  const signInWithEmail = useCallback(async (data: SignInEmailRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.signInEmail(data);
      // Session will be automatically updated by Better Auth
      window.location.href = '/dashboard'; // Redirect after successful sign in
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithUsername = useCallback(async (data: SignInUsernameRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.signInUsername(data);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    signInWithEmail,
    signInWithUsername,
    isLoading,
    error,
  };
}

// ============================================================================
// useSignUp - Sign up hook
// ============================================================================

export interface UseSignUpReturn {
  signUp: (data: SignUpEmailRequest) => Promise<void>;
  isLoading: boolean;
  error: AuthApiError | null;
}

export function useSignUp(): UseSignUpReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthApiError | null>(null);

  const signUp = useCallback(async (data: SignUpEmailRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.signUpEmail(data);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    signUp,
    isLoading,
    error,
  };
}

// ============================================================================
// useSignOut - Sign out hook
// ============================================================================

export interface UseSignOutReturn {
  signOut: () => Promise<void>;
  isLoading: boolean;
  error: AuthApiError | null;
}

export function useSignOut(): UseSignOutReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthApiError | null>(null);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.signOut();
      window.location.href = '/';
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    signOut,
    isLoading,
    error,
  };
}

// ============================================================================
// usePasswordReset - Password reset hook
// ============================================================================

export interface UsePasswordResetReturn {
  forgetPassword: (data: ForgetPasswordRequest) => Promise<void>;
  resetPassword: (data: ResetPasswordRequest) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  isLoading: boolean;
  error: AuthApiError | null;
}

export function usePasswordReset(): UsePasswordResetReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthApiError | null>(null);

  const forgetPassword = useCallback(async (data: ForgetPasswordRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.forgetPassword(data);
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (data: ResetPasswordRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.resetPassword(data);
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (data: ChangePasswordRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.changePassword(data);
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    forgetPassword,
    resetPassword,
    changePassword,
    isLoading,
    error,
  };
}

// ============================================================================
// useUserProfile - User profile management hook
// ============================================================================

export interface UseUserProfileReturn {
  user: User | null;
  updateProfile: (data: UpdateUserRequest) => Promise<void>;
  changeEmail: (data: ChangeEmailRequest) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  isLoading: boolean;
  error: AuthApiError | null;
}

export function useUserProfile(): UseUserProfileReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthApiError | null>(null);

  const updateProfile = useCallback(async (data: UpdateUserRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.updateUser(data);
      // Refresh session to get updated user data
      window.location.reload();
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changeEmail = useCallback(async (data: ChangeEmailRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.changeEmail(data);
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.deleteUser({ password });
      window.location.href = '/';
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    updateProfile,
    changeEmail,
    deleteAccount,
    isLoading,
    error,
  };
}

// ============================================================================
// useSessions - Session management hook
// ============================================================================

export interface UseSessionsReturn {
  sessions: Session[];
  isLoading: boolean;
  error: AuthApiError | null;
  refreshSessions: () => Promise<void>;
  revokeSession: (token: string) => Promise<void>;
  revokeAllSessions: () => Promise<void>;
  revokeOtherSessions: () => Promise<void>;
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthApiError | null>(null);

  const refreshSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await AuthService.listSessions();
      setSessions(data);
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const revokeSession = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.revokeSession({ token });
      await refreshSessions();
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshSessions]);

  const revokeAllSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.revokeSessions();
      window.location.href = '/';
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const revokeOtherSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.revokeOtherSessions();
      await refreshSessions();
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshSessions]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  return {
    sessions,
    isLoading,
    error,
    refreshSessions,
    revokeSession,
    revokeAllSessions,
    revokeOtherSessions,
  };
}

// ============================================================================
// useEmailVerification - Email verification hook
// ============================================================================

export interface UseEmailVerificationReturn {
  sendVerificationEmail: (email: string, callbackURL?: string) => Promise<void>;
  verifyEmail: (token: string, callbackURL?: string) => Promise<void>;
  isLoading: boolean;
  error: AuthApiError | null;
}

export function useEmailVerification(): UseEmailVerificationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthApiError | null>(null);

  const sendVerificationEmail = useCallback(async (email: string, callbackURL?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.sendVerificationEmail({ email, callbackURL });
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (token: string, callbackURL?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.verifyEmail(token, callbackURL);
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sendVerificationEmail,
    verifyEmail,
    isLoading,
    error,
  };
}

