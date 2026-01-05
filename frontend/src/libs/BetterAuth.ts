import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { Env } from './Env';

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
 * IMPORTANT: We use a local proxy (/api/auth/*) instead of connecting directly to the backend.
 * This ensures cookies work properly across the frontend and backend.
 * 
 * The proxy forwards requests from localhost:3000/api/auth/* to localhost:8000/api/auth/*
 * This way, cookies are set for localhost:3000 and are accessible to the frontend.
 * 
 * The frontend only needs to call these methods and the backend handles everything.
 * No database connection is needed in the frontend.
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000', // Use local proxy
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: 'string',
        },
      },
    }),
  ],
});

// Export commonly used methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  $fetch,
} = authClient;

// Export the full client as default
export default authClient;
