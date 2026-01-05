import { createAuthClient } from 'better-auth/react';
import { Env } from './Env';
import { magicLinkClient, twoFactorClient, usernameClient } from 'better-auth/client/plugins';

/**
 * Better Auth Client Configuration
 * 
 * This client connects to the NestJS backend API for all authentication operations.
 * The NestJS backend (running on port 8000 by default) handles:
 * - User registration and login
 * - Session management (stored in Redis)
 * - Email verification
 * - Password reset
 * - Two-factor authentication
 * - Magic link authentication
 * - Social OAuth providers
 * - Account linking
 * 
 * All auth routes are available at: {BACKEND_URL}/api/auth/*
 * 
 * The frontend only needs to call these methods and the backend handles everything.
 * No database connection is needed in the frontend.
 */
export const authClient = createAuthClient({
  baseURL: Env.NEXT_PUBLIC_BACKEND_URL, // Points to NestJS backend (e.g., http://localhost:8000)
  plugins: [
    usernameClient(),
    magicLinkClient(),
    twoFactorClient(),
    // passkeyClient() is not enabled in backend yet
  ],
});

// Export commonly used methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  $fetch,
} = authClient;

// Export the full client for advanced usage
export default authClient;

