import { apiRequest } from '@/libs/api/client';
import type { OnboardingKanbanBoard } from '@/libs/people-ops-dashboard.metrics';

const BASE = '/api/v1/onboarding';

export async function getOnboardingKanban() {
  return apiRequest<OnboardingKanbanBoard>(`${BASE}/kanban`);
}
