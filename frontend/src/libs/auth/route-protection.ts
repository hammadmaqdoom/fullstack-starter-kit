/**
 * Frontend route protection helpers (used by Next.js proxy/middleware).
 *
 * Polaris is an internal HR app: default-deny. Only guest auth pages and the
 * locale root are public; everything else requires a session cookie.
 */

const PUBLIC_AUTH_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/magic-link',
  '/forgot-password',
  '/reset-password',
] as const;

export function getPathWithoutLocale(
  pathname: string,
  locales: readonly string[],
): string {
  const parts = pathname.split('/').filter(Boolean);
  const maybeLocale = parts[0];

  if (maybeLocale && locales.includes(maybeLocale)) {
    const rest = parts.slice(1).join('/');
    return rest ? `/${rest}` : '/';
  }

  return pathname || '/';
}

export function isPublicAuthRoute(pathWithoutLocale: string): boolean {
  const path = pathWithoutLocale || '/';

  return PUBLIC_AUTH_ROUTES.some((route) => {
    if (route === '/') {
      return path === '/';
    }
    return path === route || path.startsWith(`${route}/`);
  });
}

export function requiresAuthentication(
  pathname: string,
  locales: readonly string[],
): boolean {
  const pathWithoutLocale = getPathWithoutLocale(pathname, locales);
  return !isPublicAuthRoute(pathWithoutLocale);
}

export function buildSignInRedirectUrl(
  requestUrl: string,
  pathname: string,
  locales: readonly string[],
): URL {
  const parts = pathname.split('/').filter(Boolean);
  const maybeLocale = parts[0];
  const hasLocale = !!maybeLocale && locales.includes(maybeLocale);

  const signInPath = hasLocale ? `/${maybeLocale}/sign-in` : '/sign-in';
  const signInUrl = new URL(signInPath, requestUrl);

  const pathWithoutLocale = getPathWithoutLocale(pathname, locales);
  if (pathWithoutLocale !== '/') {
    signInUrl.searchParams.set('redirect', pathWithoutLocale);
  }

  return signInUrl;
}

/** Better Auth session cookie name (cookiePrefix from backend better-auth config). */
export const SESSION_COOKIE_NAME = 'TmVzdEpTIEJvaWxlcnBsYXRl.session_token';
