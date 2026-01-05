import { Env } from '@/libs/Env';
import { NextRequest } from 'next/server';

/**
 * Better Auth API Proxy
 * 
 * This route proxies all authentication requests to the backend server.
 * This is necessary to ensure cookies work properly across the frontend and backend.
 * 
 * Without this proxy:
 * - Frontend runs on localhost:3000
 * - Backend runs on localhost:8000
 * - Cookies set by localhost:8000 are not accessible to localhost:3000
 * 
 * With this proxy:
 * - Frontend makes requests to localhost:3000/api/auth/*
 * - This route forwards them to localhost:8000/api/auth/*
 * - Cookies are set for localhost:3000 and work properly
 */

async function handler(request: NextRequest, { params }: { params: Promise<{ all: string[] }> }) {
  const { all } = await params;
  const path = all.join('/');
  
  // Build the backend URL
  const backendUrl = `${Env.NEXT_PUBLIC_BACKEND_URL}/api/auth/${path}`;
  
  // Get the request body if it exists
  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      // No body or already consumed
    }
  }
  
  // Forward the request to the backend
  const backendResponse = await fetch(backendUrl, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      // Forward important headers
      ...(request.headers.get('cookie') ? { 'Cookie': request.headers.get('cookie')! } : {}),
    },
    body,
    credentials: 'include',
  });
  
  // Get the response body
  const responseBody = await backendResponse.text();
  
  // Create the response
  const response = new Response(responseBody, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: backendResponse.headers,
  });
  
  return response;
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };

