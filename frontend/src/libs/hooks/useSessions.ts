'use client';

import { useState, useEffect } from 'react';
import { authClient } from '../BetterAuth';

export interface Session {
  id: string;
  token: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

/**
 * Hook for managing user sessions
 * 
 * Provides:
 * - sessions: Array of active sessions
 * - isLoading: Loading state
 * - error: Error state
 * - revokeSession: Function to revoke a specific session
 * - revokeOtherSessions: Function to revoke all other sessions except current
 * - refreshSessions: Function to manually refresh the sessions list
 */
export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string } | null>(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authClient.listSessions();
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to fetch sessions');
      }

      setSessions(result.data || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch sessions';
      setError({ message: errorMessage });
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const revokeSession = async (token: string) => {
    try {
      const result = await authClient.revokeSession({ token });
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to revoke session');
      }

      // Refresh the sessions list after revoking
      await fetchSessions();
      
      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to revoke session';
      throw new Error(errorMessage);
    }
  };

  const revokeOtherSessions = async () => {
    try {
      const result = await authClient.revokeOtherSessions();
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to revoke other sessions');
      }

      // Refresh the sessions list after revoking
      await fetchSessions();
      
      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to revoke other sessions';
      throw new Error(errorMessage);
    }
  };

  return {
    sessions,
    isLoading,
    error,
    revokeSession,
    revokeOtherSessions,
    refreshSessions: fetchSessions,
  };
}
