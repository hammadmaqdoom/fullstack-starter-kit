import { apiRequest, ApiRequestError } from '@/libs/api/client';

export type HelpDeskQueue = 'hr' | 'it' | 'admin' | 'finance';

export type HelpDeskPriority = 'p1' | 'p2' | 'p3' | 'p4';

export type HelpDeskStatus
  = | 'open'
    | 'in_progress'
    | 'waiting_on_employee'
    | 'resolved'
    | 'closed';

export type TicketComment = {
  id: string;
  body: string;
  isInternal: boolean;
  authorId: string;
  createdAt: string;
};

export type HelpDeskTicket = {
  id: string;
  requesterId: string;
  assigneeId: string | null;
  queue: HelpDeskQueue;
  subject: string;
  description: string;
  priority: HelpDeskPriority;
  status: HelpDeskStatus;
  attachments: string[];
  slaTargetHours: number | null;
  slaDueAt: string | null;
  slaBreached: boolean;
  resolvedAt: string | null;
  closedAt: string | null;
  comments?: TicketComment[];
  createdAt: string;
  updatedAt: string;
};

export type CreateHelpDeskTicketInput = {
  queue: HelpDeskQueue;
  subject: string;
  description: string;
  priority?: HelpDeskPriority;
  attachments?: string[];
};

export type UpdateHelpDeskTicketInput = {
  priority?: HelpDeskPriority;
  attachments?: string[];
};

export type HelpDeskTicketListQuery = {
  requesterId?: string;
  queue?: HelpDeskQueue;
  status?: HelpDeskStatus;
  page?: number;
  limit?: number;
};

const BASE = '/api/v1/help-desk';

function isMissingResource(err: unknown): boolean {
  return err instanceof ApiRequestError && err.status === 404;
}

export async function listHelpDeskTickets(query: HelpDeskTicketListQuery = {}) {
  try {
    return await apiRequest<HelpDeskTicket[]>(`${BASE}/tickets`, {
      params: {
        requesterId: query.requesterId,
        queue: query.queue,
        status: query.status,
        page: query.page ?? 1,
        limit: query.limit ?? 25,
      },
    });
  } catch (err) {
    if (isMissingResource(err)) {
      return { data: [] as HelpDeskTicket[], meta: { unavailable: true } };
    }
    throw err;
  }
}

export async function getHelpDeskTicket(id: string) {
  return apiRequest<HelpDeskTicket>(`${BASE}/tickets/${id}`);
}

export async function createHelpDeskTicket(input: CreateHelpDeskTicketInput) {
  return apiRequest<HelpDeskTicket>(`${BASE}/tickets`, { method: 'POST', body: input });
}

export async function updateHelpDeskTicket(id: string, input: UpdateHelpDeskTicketInput) {
  return apiRequest<HelpDeskTicket>(`${BASE}/tickets/${id}`, { method: 'PATCH', body: input });
}

export async function addTicketComment(id: string, body: string) {
  return apiRequest<HelpDeskTicket>(`${BASE}/tickets/${id}/comments`, {
    method: 'POST',
    body: { body },
  });
}

export async function closeHelpDeskTicket(id: string) {
  return apiRequest<HelpDeskTicket>(`${BASE}/tickets/${id}/close`, { method: 'POST' });
}
