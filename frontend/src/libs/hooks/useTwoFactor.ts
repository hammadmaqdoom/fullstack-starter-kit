/**
 * Two-Factor Authentication Hooks
 * 
 * Custom hooks for managing two-factor authentication functionality.
 */

'use client';

import { useCallback, useState } from 'react';
import { AuthService, AuthApiError } from '../AuthService';
import type {
  EnableTwoFactorRequest,
  DisableTwoFactorRequest,
  GetTOTPUriRequest,
  VerifyTOTPRequest,
  VerifyOTPRequest,
  VerifyBackupCodeRequest,
  GenerateBackupCodesRequest,
  EnableTwoFactorResponse,
  GetTOTPUriResponse,
  GenerateBackupCodesResponse,
} from '@/types/auth.types';

// ============================================================================
// useTwoFactorSetup - Hook for enabling/disabling 2FA
// ============================================================================

export interface UseTwoFactorSetupReturn {
  enableTwoFactor: (data: EnableTwoFactorRequest) => Promise<EnableTwoFactorResponse>;
  disableTwoFactor: (data: DisableTwoFactorRequest) => Promise<void>;
  getTOTPUri: (data: GetTOTPUriRequest) => Promise<GetTOTPUriResponse>;
  generateBackupCodes: (data: GenerateBackupCodesRequest) => Promise<GenerateBackupCodesResponse>;
  isLoading: boolean;
  error: AuthApiError | null;
}

export function useTwoFactorSetup(): UseTwoFactorSetupReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthApiError | null>(null);

  const enableTwoFactor = useCallback(async (data: EnableTwoFactorRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await AuthService.enableTwoFactor(data);
      return response;
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disableTwoFactor = useCallback(async (data: DisableTwoFactorRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.disableTwoFactor(data);
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTOTPUri = useCallback(async (data: GetTOTPUriRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await AuthService.getTOTPUri(data);
      return response;
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateBackupCodes = useCallback(async (data: GenerateBackupCodesRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await AuthService.generateBackupCodes(data);
      return response;
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    enableTwoFactor,
    disableTwoFactor,
    getTOTPUri,
    generateBackupCodes,
    isLoading,
    error,
  };
}

// ============================================================================
// useTwoFactorVerification - Hook for verifying 2FA codes
// ============================================================================

export interface UseTwoFactorVerificationReturn {
  verifyTOTP: (data: VerifyTOTPRequest) => Promise<void>;
  verifyOTP: (data: VerifyOTPRequest) => Promise<void>;
  verifyBackupCode: (data: VerifyBackupCodeRequest) => Promise<void>;
  sendOTP: () => Promise<void>;
  isLoading: boolean;
  error: AuthApiError | null;
}

export function useTwoFactorVerification(): UseTwoFactorVerificationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthApiError | null>(null);

  const verifyTOTP = useCallback(async (data: VerifyTOTPRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.verifyTOTP(data);
      // Redirect to dashboard after successful verification
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(async (data: VerifyOTPRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.verifyOTP(data);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyBackupCode = useCallback(async (data: VerifyBackupCodeRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.verifyBackupCode(data);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendOTP = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.sendOTP();
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    verifyTOTP,
    verifyOTP,
    verifyBackupCode,
    sendOTP,
    isLoading,
    error,
  };
}

