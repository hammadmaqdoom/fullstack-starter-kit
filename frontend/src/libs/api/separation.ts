import { apiRequest, ApiRequestError } from '@/libs/api/client';

export type SeparationCaseStatus =
  | 'initiated'
  | 'in_progress'
  | 'cleared'
  | 'archived';

export type ClearanceCategory = 'hr' | 'it' | 'finance' | 'manager';

export type ClearanceItemStatus = 'pending' | 'cleared' | 'waived';

export type SeparationWorkerSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
};

export type ClearanceItem = {
  id: string;
  separationCaseId: string;
  category: ClearanceCategory | string;
  title: string;
  status: ClearanceItemStatus | string;
  clearedBy?: string | null;
  clearedAt?: string | null;
};

export type SeparationCase = {
  id: string;
  workerId: string;
  lastWorkingDay: string;
  status: SeparationCaseStatus | string;
  reason?: string | null;
  worker?: SeparationWorkerSummary | null;
  clearanceItems?: ClearanceItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type SeparationBoard = Record<SeparationCaseStatus, SeparationCase[]>;

export type InitiateSeparationInput = {
  workerId: string;
  lastWorkingDay: string;
  reason?: string;
};

export type ClearClearanceItemInput = {
  notes?: string;
  waive?: boolean;
};

export const CLEARANCE_CATEGORIES: ClearanceCategory[] = [
  'hr',
  'it',
  'finance',
  'manager',
];

export const SEPARATION_BOARD_STATUSES: SeparationCaseStatus[] = [
  'initiated',
  'in_progress',
  'cleared',
  'archived',
];

const BASE = '/api/v1/separations';

function emptyBoard(): SeparationBoard {
  return {
    initiated: [],
    in_progress: [],
    cleared: [],
    archived: [],
  };
}

export function normalizeSeparationBoard(data: unknown): SeparationBoard {
  const board = emptyBoard();
  if (!data || typeof data !== 'object') {
    return board;
  }
  const raw = data as Record<string, SeparationCase[]>;
  for (const status of SEPARATION_BOARD_STATUSES) {
    board[status] = Array.isArray(raw[status]) ? raw[status] : [];
  }
  return board;
}

export function flattenSeparationCases(board: SeparationBoard): SeparationCase[] {
  return SEPARATION_BOARD_STATUSES.flatMap(status => board[status] ?? []);
}

export type ClearanceBoardCard = {
  item: ClearanceItem;
  separation: SeparationCase;
};

/** Group pending (and optionally all) clearance items by category for the board. */
export function groupClearanceByCategory(
  cases: SeparationCase[],
  options?: { includeDone?: boolean },
): Record<ClearanceCategory, ClearanceBoardCard[]> {
  const groups: Record<ClearanceCategory, ClearanceBoardCard[]> = {
    hr: [],
    it: [],
    finance: [],
    manager: [],
  };

  for (const separation of cases) {
    for (const item of separation.clearanceItems ?? []) {
      const category = item.category as ClearanceCategory;
      if (!(category in groups)) {
        continue;
      }
      const isDone = item.status === 'cleared' || item.status === 'waived';
      if (!options?.includeDone && isDone) {
        continue;
      }
      groups[category].push({ item, separation });
    }
  }

  return groups;
}

export function separationWorkerName(
  worker?: SeparationWorkerSummary | null,
  fallbackId?: string,
): string {
  if (worker?.firstName || worker?.lastName) {
    return [worker.firstName, worker.lastName].filter(Boolean).join(' ');
  }
  return fallbackId ?? '—';
}

export async function getSeparationBoard() {
  try {
    const { data, meta } = await apiRequest<unknown>(`${BASE}/board`);
    return { data: normalizeSeparationBoard(data), meta };
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: emptyBoard(), meta: { unavailable: true } };
    }
    throw err;
  }
}

export async function initiateSeparation(input: InitiateSeparationInput) {
  return apiRequest<SeparationCase>(BASE, {
    method: 'POST',
    body: input,
  });
}

export async function getSeparation(id: string) {
  return apiRequest<SeparationCase>(`${BASE}/${id}`);
}

export async function clearClearanceItem(
  separationId: string,
  itemId: string,
  input: ClearClearanceItemInput = {},
) {
  return apiRequest<SeparationCase>(
    `${BASE}/${separationId}/clearance/${itemId}/clear`,
    {
      method: 'POST',
      body: input,
    },
  );
}
