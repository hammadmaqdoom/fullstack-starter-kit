import { Env } from '@/libs/Env';
import { NextRequest } from 'next/server';

/**
 * Better Auth API Proxy
 *
 * Proxies /api/auth/* to the Nest backend so auth cookies stay on the
 * frontend origin (localhost:3000) instead of the API origin (localhost:8000).
 *
 * Must forward the query string — email links (reset-password, magic-link
 * verify) pass callbackURL/token as query params. Without them Better Auth
 * returns VALIDATION_ERROR.
 *
 * Must use redirect: 'manual' so the browser (not this route) follows
 * Better Auth's 302 Location after token verification.
 */

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ all: string[] }> },
) {
  const { all } = await params;
  const path = all.join('/');
  const search = request.nextUrl.search;
  const backendUrl = `${Env.NEXT_PUBLIC_BACKEND_URL}/api/auth/${path}${search}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      // No body or already consumed
    }
  }

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  } else if (body) {
    headers.set('Content-Type', 'application/json');
  }

  const cookie = request.headers.get('cookie');
  if (cookie) {
    headers.set('Cookie', cookie);
  }

  const backendResponse = await fetch(backendUrl, {
    method: request.method,
    headers,
    body,
    credentials: 'include',
    redirect: 'manual',
  });

  const responseHeaders = new Headers();
  backendResponse.headers.forEach((value, key) => {
    // Skip hop-by-hop / encoded body headers; set-cookie handled below
    const lower = key.toLowerCase();
    if (
      lower === 'transfer-encoding' ||
      lower === 'content-encoding' ||
      lower === 'set-cookie'
    ) {
      return;
    }
    responseHeaders.set(key, value);
  });

  const setCookies =
    typeof backendResponse.headers.getSetCookie === 'function'
      ? backendResponse.headers.getSetCookie()
      : [];
  if (setCookies.length > 0) {
    for (const c of setCookies) {
      responseHeaders.append('Set-Cookie', c);
    }
  } else {
    const single = backendResponse.headers.get('set-cookie');
    if (single) {
      responseHeaders.append('Set-Cookie', single);
    }
  }

  const responseBody = await backendResponse.arrayBuffer();

  return new Response(responseBody, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
