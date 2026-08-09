import { apiRequest, ApiRequestError } from '@/libs/api/client';

export type DirectoryEntry = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  countryCode: string;
  workMode: string | null;
  divisionId: string | null;
  divisionName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  employmentTypeName: string | null;
  managerId: string | null;
};

export type OrgChartNode = {
  workerId: string;
  firstName: string;
  lastName: string;
  email: string;
  divisionId: string | null;
  divisionName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  employmentTypeName: string | null;
  managerId: string | null;
  directReports: OrgChartNode[];
};

export type DirectoryQuery = {
  q?: string;
  page?: number;
  limit?: number;
  divisionId?: string;
  departmentId?: string;
  countryCode?: string;
};

export type OrgChartQuery = {
  rootId?: string;
  depth?: number;
};

const BASE = '/api/v1/org';

export function directoryDisplayName(entry: Pick<DirectoryEntry, 'firstName' | 'lastName'>): string {
  return [entry.firstName, entry.lastName].filter(Boolean).join(' ');
}

export function orgNodeDisplayName(node: Pick<OrgChartNode, 'firstName' | 'lastName'>): string {
  return [node.firstName, node.lastName].filter(Boolean).join(' ');
}

/** Search-first directory — call only when the user has typed a query. */
export async function searchDirectory(query: DirectoryQuery) {
  const q = query.q?.trim();
  if (!q) {
    return { data: [] as DirectoryEntry[], meta: { page: 1, limit: 25, total: 0 } };
  }

  try {
    return await apiRequest<DirectoryEntry[]>(`${BASE}/directory`, {
      params: {
        q,
        page: query.page ?? 1,
        limit: query.limit ?? 25,
        divisionId: query.divisionId,
        departmentId: query.departmentId,
        countryCode: query.countryCode,
      },
    });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return {
        data: [] as DirectoryEntry[],
        meta: { unavailable: true, page: 1, limit: 25, total: 0 },
      };
    }
    throw err;
  }
}

export async function getOrgChart(query: OrgChartQuery = {}) {
  try {
    return await apiRequest<OrgChartNode[]>(`${BASE}/chart`, {
      params: {
        rootId: query.rootId,
        depth: query.depth ?? 2,
      },
    });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: [] as OrgChartNode[], meta: { unavailable: true } };
    }
    throw err;
  }
}
