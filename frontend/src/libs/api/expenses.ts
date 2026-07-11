import { apiRequest, ApiRequestError } from '@/libs/api/client';

export type ExpenseCategory
  = | 'travel'
    | 'food'
    | 'medical'
    | 'accommodation'
    | 'transport'
    | 'office_supplies'
    | 'client_entertainment'
    | 'other';

export type ExpenseClaimStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

export type ExpenseClaimLine = {
  id?: string;
  description: string;
  amount: string;
  expenseDate?: string | null;
};

export type ExpensePolicyViolation = {
  type: 'daily_cap' | 'monthly_cap';
  capAmount: string;
  actualAmount: string;
  currencyCode: string;
};

export type ExpenseClaim = {
  id: string;
  workerId: string;
  legalEntityId: string | null;
  travelRequestId: string | null;
  category: ExpenseCategory;
  amount: string;
  currencyCode: string;
  expenseDate: string;
  description: string | null;
  receiptBlobUrl: string | null;
  status: ExpenseClaimStatus;
  submittedAt: string | null;
  managerApprovedAt: string | null;
  financeApprovedAt: string | null;
  rejectionReason: string | null;
  policyViolation: ExpensePolicyViolation | null;
  lines?: ExpenseClaimLine[];
  createdAt: string;
  updatedAt: string;
};

export type CreateExpenseClaimLineInput = {
  description: string;
  amount: number;
  expenseDate?: string;
};

export type CreateExpenseClaimInput = {
  travelRequestId?: string;
  category: ExpenseCategory;
  amount?: number;
  currencyCode: string;
  expenseDate: string;
  description?: string;
  receiptBlobUrl?: string;
  lines?: CreateExpenseClaimLineInput[];
};

export type UpdateExpenseClaimInput = Partial<Omit<CreateExpenseClaimInput, 'lines'>> & {
  lines?: CreateExpenseClaimLineInput[];
};

export type ExpenseClaimListQuery = {
  workerId?: string;
  status?: ExpenseClaimStatus;
  category?: ExpenseCategory;
  page?: number;
  limit?: number;
};

const BASE = '/api/v1/expenses';

function isMissingResource(err: unknown): boolean {
  return err instanceof ApiRequestError && err.status === 404;
}

export async function listExpenseClaims(query: ExpenseClaimListQuery = {}) {
  try {
    return await apiRequest<ExpenseClaim[]>(BASE, {
      params: {
        workerId: query.workerId,
        status: query.status,
        category: query.category,
        page: query.page ?? 1,
        limit: query.limit ?? 25,
      },
    });
  } catch (err) {
    if (isMissingResource(err)) {
      return { data: [] as ExpenseClaim[], meta: { unavailable: true } };
    }
    throw err;
  }
}

export async function getExpenseClaim(id: string) {
  return apiRequest<ExpenseClaim>(`${BASE}/${id}`);
}

export async function createExpenseClaim(input: CreateExpenseClaimInput) {
  return apiRequest<ExpenseClaim>(BASE, { method: 'POST', body: input });
}

export async function updateExpenseClaim(id: string, input: UpdateExpenseClaimInput) {
  return apiRequest<ExpenseClaim>(`${BASE}/${id}`, { method: 'PATCH', body: input });
}

export async function submitExpenseClaim(id: string) {
  return apiRequest<ExpenseClaim>(`${BASE}/${id}/submit`, { method: 'POST' });
}
