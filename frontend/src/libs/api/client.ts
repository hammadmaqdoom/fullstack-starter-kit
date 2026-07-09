import { Env } from '@/libs/Env';

export type ApiError = {
  code: string;
  message: string;
  field?: string;
  status: number;
};

export type ApiEnvelope<T = unknown> = {
  data: T | null;
  meta: Record<string, unknown>;
  errors: ApiError[];
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: ApiError[] = [],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: Record<string, string | number | undefined | null>;
};

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const base = Env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, '');
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta: Record<string, unknown> }> {
  const { body, params, headers, ...rest } = options;

  const response = await fetch(buildUrl(path, params), {
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson
    ? ((await response.json()) as ApiEnvelope<T> | T)
    : null;

  if (!response.ok) {
    const envelope = payload as ApiEnvelope<T> | null;
    const errors = envelope && 'errors' in envelope ? envelope.errors : [];
    const message
      = errors[0]?.message
        ?? (typeof payload === 'object' && payload && 'message' in payload
          ? String((payload as { message: string }).message)
          : response.statusText);

    throw new ApiRequestError(message || 'Request failed', response.status, errors);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    return { data: envelope.data as T, meta: envelope.meta ?? {} };
  }

  return { data: payload as T, meta: {} };
}

export async function probeApiAccess(path: string): Promise<boolean> {
  try {
    const response = await fetch(buildUrl(path, { page: 1, limit: 1 }), {
      credentials: 'include',
      method: 'GET',
    });
    return response.status !== 403;
  } catch {
    return false;
  }
}
