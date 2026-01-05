'use client';

import { useState } from 'react';
import { authClient } from '../BetterAuth';

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}

interface ResetPasswordData {
  newPassword: string;
  token: string;
}

interface ForgetPasswordData {
  email: string;
  redirectTo?: string;
}

/**
 * Hook for password reset and change operations
 * 
 * Provides:
 * - changePassword: Change password for authenticated users
 * - resetPassword: Reset password using a token
 * - forgetPassword: Request a password reset email
 * - isLoading: Loading state
 * - error: Error state
 */
export function usePasswordReset() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);

  const changePassword = async (data: ChangePasswordData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: data.revokeOtherSessions ?? false,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to change password');
      }

      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to change password';
      setError({ message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (data: ResetPasswordData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.resetPassword({
        newPassword: data.newPassword,
        token: data.token,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to reset password');
      }

      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to reset password';
      setError({ message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const forgetPassword = async (data: ForgetPasswordData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Better Auth uses requestPasswordReset for requesting password reset
      // Try requestPasswordReset first, fallback to forgetPassword if it exists
      const result = await (authClient as any).requestPasswordReset?.({
        email: data.email,
        redirectTo: data.redirectTo,
      }) || await (authClient as any).forgetPassword?.({
        email: data.email,
        redirectTo: data.redirectTo,
      });

      if (!result) {
        throw new Error('Password reset method not available on auth client');
      }

      if (result.error) {
        throw new Error(result.error.message || 'Failed to send reset email');
      }

      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send reset email';
      setError({ message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    changePassword,
    resetPassword,
    forgetPassword,
    isLoading,
    error,
  };
}

