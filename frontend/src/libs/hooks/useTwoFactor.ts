'use client';

import { useState } from 'react';
import { authClient } from '../BetterAuth';

interface EnableTwoFactorData {
  password: string;
  issuer?: string;
}

interface DisableTwoFactorData {
  password: string;
}

interface GenerateBackupCodesData {
  password: string;
}

interface VerifyTOTPData {
  code: string;
  trustDevice?: boolean;
}

/**
 * Hook for two-factor authentication setup operations
 * 
 * Provides:
 * - enableTwoFactor: Enable 2FA and get TOTP URI and backup codes
 * - disableTwoFactor: Disable 2FA
 * - generateBackupCodes: Generate new backup codes
 * - isLoading: Loading state
 * - error: Error state
 */
export function useTwoFactorSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);

  const enableTwoFactor = async (data: EnableTwoFactorData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await (authClient as any).twoFactor?.enable?.({
        password: data.password,
        issuer: data.issuer,
      });

      if (!result) {
        throw new Error('Two-factor authentication is not available');
      }

      if (result.error) {
        throw new Error(result.error.message || 'Failed to enable 2FA');
      }

      return result.data as { totpURI: string; backupCodes: string[] };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to enable 2FA';
      setError({ message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const disableTwoFactor = async (data: DisableTwoFactorData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await (authClient as any).twoFactor?.disable?.({
        password: data.password,
      });

      if (!result) {
        throw new Error('Two-factor authentication is not available');
      }

      if (result.error) {
        throw new Error(result.error.message || 'Failed to disable 2FA');
      }

      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to disable 2FA';
      setError({ message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const generateBackupCodes = async (data: GenerateBackupCodesData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await (authClient as any).twoFactor?.generateBackupCodes?.({
        password: data.password,
      });

      if (!result) {
        throw new Error('Two-factor authentication is not available');
      }

      if (result.error) {
        throw new Error(result.error.message || 'Failed to generate backup codes');
      }

      return result.data as { backupCodes: string[] };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate backup codes';
      setError({ message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    enableTwoFactor,
    disableTwoFactor,
    generateBackupCodes,
    isLoading,
    error,
  };
}

/**
 * Hook for two-factor authentication verification
 * 
 * Provides:
 * - verifyTOTP: Verify a TOTP code
 * - isLoading: Loading state
 * - error: Error state
 */
export function useTwoFactorVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);

  const verifyTOTP = async (data: VerifyTOTPData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await (authClient as any).twoFactor?.verifyTotp?.({
        code: data.code,
        trustDevice: data.trustDevice ?? false,
      });

      if (!result) {
        throw new Error('Two-factor authentication is not available');
      }

      if (result.error) {
        throw new Error(result.error.message || 'Failed to verify TOTP code');
      }

      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to verify TOTP code';
      setError({ message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    verifyTOTP,
    isLoading,
    error,
  };
}

