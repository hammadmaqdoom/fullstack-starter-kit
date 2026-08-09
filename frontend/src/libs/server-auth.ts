import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/libs/auth/route-protection';

/**
 * Server-side session utility
 *
 * Checks if user is authenticated by verifying session cookie existence.
 * This is a fast, optimistic check for layout rendering.
 *
 * For full session validation with user data, use this in combination with
 * client-side session hooks or validate in individual page components.
 */
export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    // If cookie exists, user is authenticated (optimistic check)
    // The cookie is validated by the backend on each request
    if (sessionCookie?.value) {
      return { authenticated: true };
    }

    return null;
  } catch {
    return null;
  }
}

