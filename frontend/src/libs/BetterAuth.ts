import { createAuthClient } from 'better-auth/react';
import { magicLinkClient, passkeyClient, twoFactorClient, usernameClient } from 'better-auth/client';
import { Env } from './Env';

/**
 * Better Auth Client Configuration
 * 
 * This client connects to the backend API for all authentication operations.
 * The backend handles:
 * - User registration and login
 * - Session management (stored in Redis)
 * - Email verification
 * - Password reset
 * - Two-factor authentication
 * - Passkey authentication
 * - Magic link authentication
 * 
 * The frontend only needs to call these methods and the backend handles everything.
 * No database connection is needed in the frontend.
 */
export const authClient = createAuthClient({
  baseURL: Env.NEXT_PUBLIC_BACKEND_URL,
  plugins: [
    usernameClient(),
    magicLinkClient(),
    twoFactorClient(),
    passkeyClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  useActiveOrganization,
  organization,
  user,
} = authClient;

