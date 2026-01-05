'use client';

import { authClient } from '../BetterAuth';

/**
 * Custom hook to access Better Auth session
 * 
 * This hook provides:
 * - session: The current user session (null if not authenticated)
 * - isPending: Loading state
 * - error: Any error that occurred
 * 
 * The session includes:
 * - user: User information (id, email, name, etc.)
 * - session: Session information (token, expiresAt, etc.)
 * 
 * Example usage:
 * ```tsx
 * const { data: session, isPending } = useAuth();
 * 
 * if (isPending) return <div>Loading...</div>;
 * if (!session) return <div>Not authenticated</div>;
 * 
 * return <div>Hello {session.user.email}</div>;
 * ```
 */
export function useAuth() {
  return authClient.useSession();
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  return authClient.signIn.email({
    email,
    password,
  });
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(data: {
  email: string;
  password: string;
  name: string;
}) {
  return authClient.signUp.email({
    email: data.email,
    password: data.password,
    name: data.name,
  });
}

/**
 * Sign out
 */
export async function signOut() {
  return authClient.signOut();
}

/**
 * Get current session (can be used in server components or client)
 */
export async function getSession() {
  return authClient.getSession();
}

export default useAuth;
