/**
 * Social Account Management Hooks
 * 
 * Custom hooks for managing social account linking and OAuth.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuthService, AuthApiError } from '../AuthService';
import type {
  LinkSocialRequest,
  UnlinkAccountRequest,
  ListAccountsResponse,
  AuthProvider,
} from '@/types/auth.types';

// ============================================================================
// useSocialAccounts - Hook for managing linked social accounts
// ============================================================================

export interface UseSocialAccountsReturn {
  accounts: ListAccountsResponse[];
  linkAccount: (provider: AuthProvider, callbackURL?: string, scopes?: string[]) => Promise<void>;
  unlinkAccount: (providerId: string, accountId?: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;
  isLoading: boolean;
  error: AuthApiError | null;
}

export function useSocialAccounts(): UseSocialAccountsReturn {
  const [accounts, setAccounts] = useState<ListAccountsResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthApiError | null>(null);

  const refreshAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await AuthService.listAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const linkAccount = useCallback(async (
    provider: AuthProvider,
    callbackURL?: string,
    scopes?: string[]
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const data: LinkSocialRequest = {
        provider,
        callbackURL,
        scopes,
      };
      const response = await AuthService.linkSocial(data);
      
      // Redirect to OAuth provider
      if (response.redirect && response.url) {
        window.location.href = response.url;
      }
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unlinkAccount = useCallback(async (providerId: string, accountId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data: UnlinkAccountRequest = {
        providerId,
        accountId,
      };
      await AuthService.unlinkAccount(data);
      await refreshAccounts(); // Refresh the list after unlinking
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAccounts]);

  // Load accounts on mount
  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  return {
    accounts,
    linkAccount,
    unlinkAccount,
    refreshAccounts,
    isLoading,
    error,
  };
}

// ============================================================================
// useSocialSignIn - Hook for social sign in
// ============================================================================

export interface UseSocialSignInReturn {
  signInWithProvider: (
    provider: AuthProvider,
    options?: {
      callbackURL?: string;
      newUserCallbackURL?: string;
      errorCallbackURL?: string;
      scopes?: string[];
    }
  ) => Promise<void>;
  isLoading: boolean;
  error: AuthApiError | null;
}

export function useSocialSignIn(): UseSocialSignInReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthApiError | null>(null);

  const signInWithProvider = useCallback(async (
    provider: AuthProvider,
    options?: {
      callbackURL?: string;
      newUserCallbackURL?: string;
      errorCallbackURL?: string;
      scopes?: string[];
    }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await AuthService.signInSocial({
        provider,
        ...options,
      });

      // Handle redirect or direct sign in
      if (response.redirect && response.url) {
        window.location.href = response.url;
      } else if (response.user) {
        // Direct sign in successful (e.g., with idToken)
        window.location.href = options?.callbackURL || '/dashboard';
      }
    } catch (err) {
      setError(err as AuthApiError);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    signInWithProvider,
    isLoading,
    error,
  };
}

