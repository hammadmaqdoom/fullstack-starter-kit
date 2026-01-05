/**
 * Magic Link Authentication Hooks
 * 
 * Custom hooks for magic link authentication functionality.
 */

'use client';

import { useCallback, useState } from 'react';
import { AuthService, AuthApiError } from '../AuthService';
import type {
  SignInMagicLinkRequest,
} from '@/types/auth.types';

// ============================================================================
// useMagicLink - Hook for magic link authentication
// ============================================================================

export interface UseMagicLinkReturn {
  sendMagicLink: (data: SignInMagicLinkRequest) => Promise<void>;
  verifyMagicLink: (token: string, callbackURL?: string) => Promise<void>;
  isLoading: boolean;
  error: AuthApiError | null;
  emailSent: boolean;
}

export function useMagicLink(): UseMagicLinkReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthApiError | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const sendMagicLink = useCallback(async (data: SignInMagicLinkRequest) => {
    setIsLoading(true);
    setError(null);
    setEmailSent(false);
    try {
      await AuthService.signInMagicLink(data);
      setEmailSent(true);
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyMagicLink = useCallback(async (token: string, callbackURL?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await AuthService.verifyMagicLink(token, callbackURL);
      // Redirect will be handled by the API or manually
      window.location.href = callbackURL || '/dashboard';
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sendMagicLink,
    verifyMagicLink,
    isLoading,
    error,
    emailSent,
  };
}

