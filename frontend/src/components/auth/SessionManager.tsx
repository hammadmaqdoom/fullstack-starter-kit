/**
 * Session Manager Component
 * 
 * Displays and manages active user sessions.
 */

'use client';

import { useSessions } from '@/libs/hooks';
import { useState } from 'react';

export function SessionManager() {
  const {
    sessions,
    isLoading,
    error,
    revokeSession,
    revokeOtherSessions,
  } = useSessions();
  
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  const handleRevokeSession = async (token: string) => {
    setRevokingToken(token);
    try {
      await revokeSession(token);
    } catch (err) {
      console.error('Failed to revoke session:', err);
    } finally {
      setRevokingToken(null);
    }
  };

  const handleRevokeOthers = async () => {
    if (confirm('Are you sure you want to sign out from all other devices?')) {
      try {
        await revokeOtherSessions();
      } catch (err) {
        console.error('Failed to revoke other sessions:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-gray-600">Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-red-600">Failed to load sessions: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Active Sessions</h3>
          {sessions.length > 1 && (
            <button
              onClick={handleRevokeOthers}
              className="text-sm font-medium text-red-600 hover:text-red-500"
            >
              Sign out all other devices
            </button>
          )}
        </div>
        
        <p className="mt-2 text-sm text-gray-600">
          Manage your active sessions across different devices.
        </p>

        <div className="mt-4 space-y-4">
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500">No active sessions found.</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.token}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {session.ipAddress || 'Unknown location'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {session.userAgent || 'Unknown device'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(session.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Expires: {new Date(session.expiresAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeSession(session.token)}
                  disabled={revokingToken === session.token}
                  className="ml-4 text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
                >
                  {revokingToken === session.token ? 'Revoking...' : 'Revoke'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

