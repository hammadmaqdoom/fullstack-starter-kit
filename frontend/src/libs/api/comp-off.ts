import { apiRequest } from '@/libs/api/client';

export type CompOffBalance = {
  availableDays: number;
  pendingDays: number;
  usedDays: number;
};

const BASE = '/api/v1/time-leave/comp-off';

export async function getMyCompOffBalance() {
  return apiRequest<CompOffBalance>(`${BASE}/balance`);
}
