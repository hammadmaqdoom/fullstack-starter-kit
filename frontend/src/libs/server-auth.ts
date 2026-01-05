import { cookies } from 'next/headers';

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
    // Check for session cookie - cookie prefix is set in backend config: TmVzdEpTIEJvaWxlcnBsYXRl
    const sessionCookie = cookieStore.get('TmVzdEpTIEJvaWxlcnBsYXRl.session_token');
    
    // If cookie exists, user is authenticated (optimistic check)
    // The cookie is validated by the backend on each request
    if (sessionCookie && sessionCookie.value) {
      // Return a minimal session object to indicate authentication
      // Full session data should be fetched client-side when needed
      return { authenticated: true };
    }
    
    return null;
  } catch (error) {
    // If there's an error, assume no session
    return null;
  }
}

