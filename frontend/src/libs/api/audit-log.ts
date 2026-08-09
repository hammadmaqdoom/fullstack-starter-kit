import { apiRequest, ApiRequestError } from '@/libs/api/client';
import { Env } from '@/libs/Env';

export type AuditLogEntry = {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  correlationId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
};

export type AuditLogQuery = {
  page?: number;
  limit?: number;
  q?: string;
  entityType?: string;
  action?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
};

const BASE = '/api/v1/audit-log';

function buildUrl(path: string, params?: AuditLogQuery): string {
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

export async function listAuditLog(query: AuditLogQuery = {}) {
  return apiRequest<AuditLogEntry[]>(BASE, {
    params: query as Record<string, string | number | undefined | null>,
  });
}

export async function downloadAuditLogCsv(query: AuditLogQuery = {}) {
  const response = await fetch(buildUrl(`${BASE}/export`, query), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiRequestError(
      response.statusText || 'Export failed',
      response.status,
    );
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition');
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `polaris-audit-log.csv`;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
