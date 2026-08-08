'use client';

import { useState } from 'react';
import { authClient } from '../BetterAuth';
import type { SignInMagicLinkRequest } from '@/types/auth.types';

/**
 * Hook for magic link authentication (contractor / email sign-in).
 */
export function useMagicLink() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const sendMagicLink = async (data: SignInMagicLinkRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.signIn.magicLink({
        email: data.email,
        name: data.name,
        callbackURL: data.callbackURL,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to send magic link');
      }

      setEmailSent(true);
      return result.data;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send magic link';
      setError({ message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMagicLink = async (token: string, callbackURL?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.$fetch('/magic-link/verify', {
        method: 'GET',
        query: {
          token,
          ...(callbackURL ? { callbackURL } : {}),
        },
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to verify magic link');
      }

      return result.data;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to verify magic link';
      setError({ message: errorMessage });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMagicLink,
    verifyMagicLink,
    isLoading,
    error,
    emailSent,
  };
}
