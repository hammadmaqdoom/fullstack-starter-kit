import { apiRequest } from '@/libs/api/client';

export type TrainingCourseType = 'mandatory' | 'optional';
export type TrainingAssignmentStatus = 'assigned' | 'in_progress' | 'completed' | 'overdue';
export type TrainingAssignmentSource = 'manual' | 'onboarding_bundle' | 'population';
export type TrainingVerificationMethod = 'self_attest' | 'manager_verified' | 'hr_verified';

export type TrainingCourse = {
  id: string;
  title: string;
  description: string | null;
  courseType: TrainingCourseType;
  durationMinutes: number | null;
  renewalPeriodMonths: number | null;
  externalUrl: string | null;
  attachmentBlobUrl: string | null;
  isActive: boolean;
  createdAt: string;
};

export type TrainingAssignment = {
  id: string;
  courseId: string;
  course?: TrainingCourse;
  workerId: string;
  dueDate: string | null;
  status: TrainingAssignmentStatus;
  source: TrainingAssignmentSource;
  assignedByUserId: string;
  createdAt: string;
};

const BASE = '/api/v1/talent/training';

export async function listCourses() {
  return apiRequest<TrainingCourse[]>(`${BASE}/courses`);
}

export async function createCourse(input: {
  title: string;
  description?: string;
  courseType: TrainingCourseType;
  durationMinutes?: number;
  renewalPeriodMonths?: number;
  externalUrl?: string;
  attachmentBlobUrl?: string;
}) {
  return apiRequest<TrainingCourse>(`${BASE}/courses`, { method: 'POST', body: input });
}

export async function updateCourse(id: string, input: { isActive?: boolean; title?: string }) {
  return apiRequest<TrainingCourse>(`${BASE}/courses/${id}`, { method: 'PATCH', body: input });
}

export async function assignTraining(input: {
  courseId: string;
  workerIds: string[];
  dueDate?: string;
  source?: TrainingAssignmentSource;
}) {
  return apiRequest<TrainingAssignment[]>(`${BASE}/assignments`, { method: 'POST', body: input });
}

export async function listAssignments(query?: {
  workerId?: string;
  courseId?: string;
  status?: TrainingAssignmentStatus;
}) {
  return apiRequest<TrainingAssignment[]>(`${BASE}/assignments`, { params: query });
}

export async function completeAssignment(
  id: string,
  input?: { verificationMethod?: TrainingVerificationMethod; certificateBlobUrl?: string; notes?: string },
) {
  return apiRequest(`${BASE}/assignments/${id}/complete`, { method: 'POST', body: input ?? {} });
}
