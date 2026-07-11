import { apiRequest, ApiRequestError } from '@/libs/api/client';

export type TravelType = 'domestic' | 'international';

export type TravelRequestStatus
  = | 'draft'
    | 'submitted'
    | 'approved'
    | 'in_progress'
    | 'completed'
    | 'reconciled'
    | 'rejected';

export type TravelItinerary = {
  id?: string;
  legType: string;
  description: string;
  departureAt?: string | null;
  arrivalAt?: string | null;
  notes?: string | null;
};

export type TravelRequest = {
  id: string;
  workerId: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  purpose: string;
  travelType: TravelType;
  estimatedCost: string;
  actualCost: string | null;
  currencyCode: string;
  status: TravelRequestStatus;
  managerApprovedAt: string | null;
  financeApprovedAt: string | null;
  peopleOpsApprovedAt: string | null;
  rejectionReason: string | null;
  itineraries?: TravelItinerary[];
  createdAt: string;
  updatedAt: string;
};

export type CreateTravelItineraryInput = {
  legType: string;
  description: string;
  departureAt?: string;
  arrivalAt?: string;
  notes?: string;
};

export type CreateTravelRequestInput = {
  destinations: string[];
  startDate: string;
  endDate: string;
  purpose: string;
  travelType: TravelType;
  estimatedCost: number;
  currencyCode: string;
  itineraries?: CreateTravelItineraryInput[];
};

export type UpdateTravelRequestInput = Partial<Omit<CreateTravelRequestInput, 'itineraries'>>;

export type TravelRequestListQuery = {
  workerId?: string;
  status?: TravelRequestStatus;
  page?: number;
  limit?: number;
};

const BASE = '/api/v1/travel-requests';

function isMissingResource(err: unknown): boolean {
  return err instanceof ApiRequestError && err.status === 404;
}

export async function listTravelRequests(query: TravelRequestListQuery = {}) {
  try {
    return await apiRequest<TravelRequest[]>(BASE, {
      params: {
        workerId: query.workerId,
        status: query.status,
        page: query.page ?? 1,
        limit: query.limit ?? 25,
      },
    });
  } catch (err) {
    if (isMissingResource(err)) {
      return { data: [] as TravelRequest[], meta: { unavailable: true } };
    }
    throw err;
  }
}

export async function getTravelRequest(id: string) {
  return apiRequest<TravelRequest>(`${BASE}/${id}`);
}

export async function createTravelRequest(input: CreateTravelRequestInput) {
  return apiRequest<TravelRequest>(BASE, { method: 'POST', body: input });
}

export async function updateTravelRequest(id: string, input: UpdateTravelRequestInput) {
  return apiRequest<TravelRequest>(`${BASE}/${id}`, { method: 'PATCH', body: input });
}

export async function addTravelItinerary(id: string, input: CreateTravelItineraryInput) {
  return apiRequest<TravelRequest>(`${BASE}/${id}/itineraries`, { method: 'POST', body: input });
}

export async function submitTravelRequest(id: string) {
  return apiRequest<TravelRequest>(`${BASE}/${id}/submit`, { method: 'POST' });
}

export async function markTravelInProgress(id: string) {
  return apiRequest<TravelRequest>(`${BASE}/${id}/mark-in-progress`, { method: 'POST' });
}

export async function markTravelCompleted(id: string) {
  return apiRequest<TravelRequest>(`${BASE}/${id}/mark-completed`, { method: 'POST' });
}
