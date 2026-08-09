import { apiRequest, ApiRequestError } from '@/libs/api/client';

export type OnboardingCaseStatus =
  | 'not_started'
  | 'in_progress'
  | 'blocked'
  | 'complete';

export type OnboardingTaskStatus = 'pending' | 'done' | 'skipped' | 'blocked';

export type OnboardingTemplateStatus = 'draft' | 'published';

export type OnboardingAssigneeRole =
  | 'employee'
  | 'manager'
  | 'people_ops'
  | 'it'
  | 'finance';

export type OnboardingWorkerSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
};

export type OnboardingTemplateTask = {
  id: string;
  title: string;
  assigneeRole: OnboardingAssigneeRole | string;
  sortOrder: number;
  isRequired: boolean;
  dueOffsetDays?: number;
};

export type OnboardingTemplate = {
  id: string;
  name: string;
  status: OnboardingTemplateStatus | string;
  countryCode?: string | null;
  employmentTypeId?: string | null;
  version?: number;
  tasks?: OnboardingTemplateTask[];
};

export type OnboardingTask = {
  id: string;
  caseId: string;
  status: OnboardingTaskStatus | string;
  assigneeWorkerId?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  templateTask?: OnboardingTemplateTask | null;
};

export type OnboardingCase = {
  id: string;
  workerId: string;
  templateId: string;
  status: OnboardingCaseStatus | string;
  startDate: string;
  worker?: OnboardingWorkerSummary | null;
  template?: Pick<OnboardingTemplate, 'id' | 'name' | 'status'> | null;
  tasks?: OnboardingTask[];
  createdAt?: string;
  updatedAt?: string;
};

export type OnboardingKanban = Record<OnboardingCaseStatus, OnboardingCase[]>;

export type CreateOnboardingTemplateInput = {
  name: string;
  countryCode?: string;
  employmentTypeId?: string;
  tasks?: Array<{
    title: string;
    assigneeRole: OnboardingAssigneeRole;
    sortOrder?: number;
    isRequired?: boolean;
    dueOffsetDays?: number;
  }>;
};

export type CreateOnboardingCaseInput = {
  workerId: string;
  templateId: string;
  startDate: string;
};

export const ONBOARDING_KANBAN_COLUMNS: OnboardingCaseStatus[] = [
  'not_started',
  'in_progress',
  'blocked',
  'complete',
];

const BASE = '/api/v1/onboarding';

function emptyKanban(): OnboardingKanban {
  return {
    not_started: [],
    in_progress: [],
    blocked: [],
    complete: [],
  };
}

export function normalizeKanban(data: unknown): OnboardingKanban {
  const board = emptyKanban();
  if (!data || typeof data !== 'object') {
    return board;
  }
  const raw = data as Record<string, OnboardingCase[]>;
  for (const status of ONBOARDING_KANBAN_COLUMNS) {
    board[status] = Array.isArray(raw[status]) ? raw[status] : [];
  }
  return board;
}

export function workerDisplayName(
  worker?: OnboardingWorkerSummary | null,
  fallbackId?: string,
): string {
  if (worker?.firstName || worker?.lastName) {
    return [worker.firstName, worker.lastName].filter(Boolean).join(' ');
  }
  return fallbackId ?? '—';
}

export async function listOnboardingTemplates() {
  try {
    return await apiRequest<OnboardingTemplate[]>(`${BASE}/templates`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: [] as OnboardingTemplate[], meta: { unavailable: true } };
    }
    throw err;
  }
}

export async function createOnboardingTemplate(input: CreateOnboardingTemplateInput) {
  return apiRequest<OnboardingTemplate>(`${BASE}/templates`, {
    method: 'POST',
    body: input,
  });
}

export async function publishOnboardingTemplate(id: string) {
  return apiRequest<OnboardingTemplate>(`${BASE}/templates/${id}/publish`, {
    method: 'POST',
  });
}

export async function getOnboardingKanban() {
  try {
    const { data, meta } = await apiRequest<unknown>(`${BASE}/kanban`);
    return { data: normalizeKanban(data), meta };
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: emptyKanban(), meta: { unavailable: true } };
    }
    throw err;
  }
}

export async function createOnboardingCase(input: CreateOnboardingCaseInput) {
  return apiRequest<OnboardingCase>(`${BASE}/cases`, {
    method: 'POST',
    body: input,
  });
}

export async function getOnboardingCase(id: string) {
  return apiRequest<OnboardingCase>(`${BASE}/cases/${id}`);
}

export async function completeOnboardingTask(taskId: string, notes?: string) {
  return apiRequest<OnboardingCase>(`${BASE}/tasks/${taskId}/complete`, {
    method: 'POST',
    body: notes ? { notes } : {},
  });
}
