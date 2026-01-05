import type { NextFetchEvent, NextRequest } from 'next/server';
import { detectBot } from '@arcjet/next';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import arcjet from '@/libs/Arcjet';
import { routing } from './libs/I18nRouting';

const handleI18nRouting = createMiddleware(routing);

// Protected routes that require authentication
const protectedRoutes = ['/dashboard'];

// Check if the path matches a protected route
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.includes(route));
}

// Improve security with Arcjet
const aj = arcjet.withRule(
  detectBot({
    mode: 'LIVE',
    // Block all bots except the following
    allow: [
      // See https://docs.arcjet.com/bot-protection/identifying-bots
      'CATEGORY:SEARCH_ENGINE', // Allow search engines
      'CATEGORY:PREVIEW', // Allow preview links to show OG images
      'CATEGORY:MONITOR', // Allow uptime monitoring services
    ],
  }),
);

export default async function proxy(
  request: NextRequest,
  _event: NextFetchEvent,
) {
  // Verify the request with Arcjet
  // Use `process.env` instead of Env to reduce bundle size in middleware
  if (process.env.ARCJET_KEY) {
    const decision = await aj.protect(request);

    if (decision.isDenied()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Check authentication for protected routes
  if (isProtectedRoute(request.nextUrl.pathname)) {
    // Get session cookie from Better Auth
    // The cookie prefix is set in backend config: TmVzdEpTIEJvaWxlcnBsYXRl
    const sessionCookie = request.cookies.get('TmVzdEpTIEJvaWxlcnBsYXRl.session_token');
    
    if (!sessionCookie) {
      // Extract locale and path without locale prefix
      const pathParts = request.nextUrl.pathname.split('/').filter(Boolean);
      const locale = pathParts[0] || '';
      const isLocale = locale && routing.locales.includes(locale);
      
      // Build sign-in URL with proper locale handling
      const signInPath = isLocale ? `/${locale}/sign-in` : '/sign-in';
      const signInUrl = new URL(signInPath, request.url);
      
      // Store the path without locale for redirect (i18n router will handle locale)
      const pathWithoutLocale = isLocale ? `/${pathParts.slice(1).join('/')}` : request.nextUrl.pathname;
      signInUrl.searchParams.set('redirect', pathWithoutLocale);
      
      return NextResponse.redirect(signInUrl);
    }
  }

  return handleI18nRouting(request);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/_next`, `/_vercel`, `monitoring` or `api`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!_next|_vercel|monitoring|api|.*\\..*).*)',
};
