import { apiRequest } from '@/libs/api/client';

export type PerformanceGoal = {
  id: string;
  workerId: string;
  title: string;
  description: string | null;
  weightPercent: number;
  progressPercent: number;
  progressStatus: 'on_track' | 'at_risk' | 'off_track';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  dueDate: string | null;
  keyResultId: string | null;
};

export type FeedbackEntry = {
  id: string;
  authorWorkerId: string;
  recipientWorkerId: string;
  feedbackType: 'praise' | 'constructive' | 'coaching';
  message: string;
  isPrivate: boolean;
  createdAt: string;
  authorName?: string | null;
  recipientName?: string | null;
};

export type RecognitionEntry = {
  id: string;
  authorWorkerId: string;
  recipientWorkerId: string;
  message: string;
  valueTag: string | null;
  createdAt: string;
  authorName?: string | null;
  recipientName?: string | null;
};

export type OneOnOneMeeting = {
  id: string;
  managerWorkerId: string;
  employeeWorkerId: string;
  scheduledAt: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  agenda: string | null;
};

export type AssessmentQuestionType =
  | 'short_text'
  | 'long_text'
  | 'rating'
  | 'yes_no'
  | 'single_choice'
  | 'multi_choice';

export type AssessmentQuestion = {
  id: string;
  type: AssessmentQuestionType;
  label: string;
  required: boolean;
  helpText?: string;
  scaleMin?: number;
  scaleMax?: number;
  options?: { id: string; label: string }[];
};

export type AssessmentPayload = {
  questionsSnapshot: AssessmentQuestion[];
  answers: Record<string, string | number | boolean | string[]>;
};

export type PerformanceReview = {
  id: string;
  cycleId: string;
  workerId: string;
  managerWorkerId: string | null;
  status: string;
  outcome: string | null;
  selfAssessment: string | null;
  managerAssessment: string | null;
  selfAssessmentPayload?: AssessmentPayload | null;
  managerAssessmentPayload?: AssessmentPayload | null;
  cycle?: PerformanceCycle | null;
};

export type DevelopmentPlan = {
  id: string;
  workerId: string;
  title: string;
  summary: string | null;
  status: string;
};

export type ObjectiveLevel = 'company' | 'division' | 'department';
export type ObjectiveStatus = 'draft' | 'active' | 'closed';
export type KeyResultStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

export type OrganizationalObjective = {
  id: string;
  level: ObjectiveLevel | string;
  divisionId?: string | null;
  departmentId?: string | null;
  title: string;
  description: string | null;
  status: ObjectiveStatus | string;
  periodStart: string;
  periodEnd: string;
};

export type ObjectiveKeyResult = {
  id: string;
  objectiveId: string;
  title: string;
  description: string | null;
  targetValue: string | null;
  currentValue: string;
  unit: string | null;
  status: KeyResultStatus | string;
  weightPercent: number;
};

export type PerformanceDashboard = {
  actingWorkerId: string | null;
  goals: PerformanceGoal[];
  feedback: FeedbackEntry[];
  oneOnOnes: OneOnOneMeeting[];
  reviews: PerformanceReview[];
  developmentPlans: DevelopmentPlan[];
  recognition: RecognitionEntry[];
  objectives: OrganizationalObjective[];
  roleCodes: string[];
  reviewsAwaitingMe: number;
};

export type TeamPerformanceReport = {
  workerId: string;
  firstName: string;
  lastName: string;
  goals: PerformanceGoal[];
  reviews: PerformanceReview[];
};

export type TeamPerformanceDashboard = {
  actingWorkerId: string | null;
  reports: TeamPerformanceReport[];
  oneOnOnes: OneOnOneMeeting[];
  reviewsAwaitingMe: number;
};

export type PerformanceCycle = {
  id: string;
  name: string;
  cycleType: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  peerFeedbackEnabled: boolean;
  calibrationEnabled?: boolean;
  selfAssessmentTemplate?: AssessmentQuestion[];
  managerAssessmentTemplate?: AssessmentQuestion[];
};

export type CalibrationReview = PerformanceReview & {
  worker?: { id: string; firstName: string; lastName: string };
};

export type CalibrationBoard = {
  cycle: PerformanceCycle;
  reviews: CalibrationReview[];
};

export type PulseSurveyQuestion = {
  id: string;
  text: string;
  scaleMin: number;
  scaleMax: number;
};

export type PulseSurvey = {
  id: string;
  title: string;
  description: string | null;
  questions: PulseSurveyQuestion[];
  anonymityThreshold: number;
  status: 'draft' | 'active' | 'closed';
  closesAt: string | null;
};

export type PulseSurveyResults = {
  surveyId: string;
  responseCount: number;
  aggregates: Record<string, { average: number; count: number }> | null;
  message?: string;
};

const BASE = '/api/v1/talent';

export async function getPerformanceDashboard() {
  return apiRequest<PerformanceDashboard>(`${BASE}/performance/dashboard`);
}

export async function getTeamPerformanceDashboard() {
  return apiRequest<TeamPerformanceDashboard>(`${BASE}/performance/team-dashboard`);
}

export async function listGoals(workerId?: string) {
  return apiRequest<PerformanceGoal[]>(`${BASE}/goals`, {
    params: workerId ? { workerId } : undefined,
  });
}

export async function createGoal(input: {
  workerId: string;
  title: string;
  description?: string;
  keyResultId?: string;
  weightPercent?: number;
  dueDate?: string;
}) {
  return apiRequest<PerformanceGoal>(`${BASE}/goals`, { method: 'POST', body: input });
}

export async function addGoalCheckIn(
  goalId: string,
  input: { progressPercent: number; progressStatus: string; notes?: string },
) {
  return apiRequest(`${BASE}/goals/${goalId}/check-ins`, { method: 'POST', body: input });
}

export async function createFeedback(input: {
  recipientWorkerId: string;
  feedbackType: string;
  message: string;
  isPrivate?: boolean;
}) {
  return apiRequest(`${BASE}/feedback`, { method: 'POST', body: input });
}

export async function createRecognition(input: {
  recipientWorkerId: string;
  message: string;
  valueTag?: string;
}) {
  return apiRequest(`${BASE}/recognition`, { method: 'POST', body: input });
}

export async function listObjectives() {
  return apiRequest<OrganizationalObjective[]>(`${BASE}/objectives`);
}

export async function createObjective(input: {
  level: ObjectiveLevel;
  divisionId?: string;
  departmentId?: string;
  title: string;
  description?: string;
  periodStart: string;
  periodEnd: string;
}) {
  return apiRequest<OrganizationalObjective>(`${BASE}/objectives`, { method: 'POST', body: input });
}

export async function updateObjective(
  id: string,
  input: { title?: string; description?: string; status?: ObjectiveStatus },
) {
  return apiRequest<OrganizationalObjective>(`${BASE}/objectives/${id}`, { method: 'PATCH', body: input });
}

export async function listKeyResults(objectiveId: string) {
  return apiRequest<ObjectiveKeyResult[]>(`${BASE}/objectives/${objectiveId}/key-results`);
}

export async function createKeyResult(
  objectiveId: string,
  input: {
    title: string;
    description?: string;
    targetValue?: number;
    unit?: string;
    weightPercent?: number;
  },
) {
  return apiRequest<ObjectiveKeyResult>(`${BASE}/objectives/${objectiveId}/key-results`, {
    method: 'POST',
    body: input,
  });
}

export async function updateKeyResult(
  id: string,
  input: { title?: string; currentValue?: number; status?: KeyResultStatus },
) {
  return apiRequest<ObjectiveKeyResult>(`${BASE}/key-results/${id}`, { method: 'PATCH', body: input });
}

export async function listCycles() {
  return apiRequest<PerformanceCycle[]>(`${BASE}/performance-cycles`);
}

export async function createCycle(input: {
  name: string;
  cycleType: string;
  periodStart: string;
  periodEnd: string;
  peerFeedbackEnabled?: boolean;
  calibrationEnabled?: boolean;
  selfAssessmentTemplate?: AssessmentQuestion[];
  managerAssessmentTemplate?: AssessmentQuestion[];
}) {
  return apiRequest<PerformanceCycle>(`${BASE}/performance-cycles`, { method: 'POST', body: input });
}

export async function updateCycle(
  id: string,
  input: {
    status?: string;
    name?: string;
    peerFeedbackEnabled?: boolean;
    selfAssessmentTemplate?: AssessmentQuestion[];
    managerAssessmentTemplate?: AssessmentQuestion[];
  },
) {
  return apiRequest<PerformanceCycle>(`${BASE}/performance-cycles/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function activateCycle(id: string) {
  return apiRequest<PerformanceCycle>(`${BASE}/performance-cycles/${id}`, {
    method: 'PATCH',
    body: { status: 'active' },
  });
}

export async function getReview(id: string) {
  return apiRequest<PerformanceReview>(`${BASE}/reviews/${id}`);
}

export async function listReviews(cycleId?: string) {
  return apiRequest<PerformanceReview[]>(`${BASE}/reviews`, {
    params: cycleId ? { cycleId } : undefined,
  });
}

export async function submitSelfAssessment(
  reviewId: string,
  input: { answers: Record<string, string | number | boolean | string[]> },
) {
  return apiRequest(`${BASE}/reviews/${reviewId}/self-assessment`, {
    method: 'POST',
    body: input,
  });
}

export async function submitManagerReview(
  reviewId: string,
  input: {
    answers: Record<string, string | number | boolean | string[]>;
    outcome: string;
    probationOutcome?: string;
  },
) {
  return apiRequest(`${BASE}/reviews/${reviewId}/manager-review`, {
    method: 'POST',
    body: input,
  });
}

export async function createOneOnOne(input: {
  employeeWorkerId: string;
  scheduledAt: string;
  agenda?: string;
}) {
  return apiRequest<OneOnOneMeeting>(`${BASE}/one-on-ones`, {
    method: 'POST',
    body: input,
  });
}

export async function updateOneOnOne(
  id: string,
  input: { status?: string; agenda?: string },
) {
  return apiRequest<OneOnOneMeeting>(`${BASE}/one-on-ones/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function listDevelopmentPlans(workerId?: string) {
  return apiRequest<DevelopmentPlan[]>(`${BASE}/development-plans`, {
    params: workerId ? { workerId } : undefined,
  });
}

export type DevelopmentPlanAction = {
  id: string;
  planId: string;
  actionType: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
};

export async function listDevelopmentPlanActions(planId: string) {
  return apiRequest<DevelopmentPlanAction[]>(
    `${BASE}/development-plans/${planId}/actions`,
  );
}

export async function createDevelopmentPlan(input: {
  workerId: string;
  title: string;
  summary?: string;
}) {
  return apiRequest<DevelopmentPlan>(`${BASE}/development-plans`, {
    method: 'POST',
    body: input,
  });
}

export async function createDevelopmentPlanAction(
  planId: string,
  input: { title: string; actionType?: string; description?: string },
) {
  return apiRequest<DevelopmentPlanAction>(
    `${BASE}/development-plans/${planId}/actions`,
    {
      method: 'POST',
      body: {
        title: input.title,
        actionType: input.actionType ?? 'other',
        description: input.description,
      },
    },
  );
}

export async function updateDevelopmentPlanAction(
  actionId: string,
  input: { status: string },
) {
  return apiRequest<DevelopmentPlanAction>(
    `${BASE}/development-actions/${actionId}`,
    { method: 'PATCH', body: input },
  );
}

export async function createPulseSurvey(input: {
  title: string;
  description?: string;
  questions: Array<{ id: string; text: string; scaleMin: number; scaleMax: number }>;
}) {
  return apiRequest<PulseSurvey>(`${BASE}/pulse-surveys`, {
    method: 'POST',
    body: input,
  });
}

export async function updatePulseSurvey(
  id: string,
  input: { status?: string; title?: string },
) {
  return apiRequest<PulseSurvey>(`${BASE}/pulse-surveys/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function listPulseSurveys() {
  return apiRequest<PulseSurvey[]>(`${BASE}/pulse-surveys`);
}

export async function submitPulseResponse(surveyId: string, answers: Record<string, number>) {
  return apiRequest(`${BASE}/pulse-surveys/${surveyId}/responses`, {
    method: 'POST',
    body: { answers },
  });
}

export async function getPulseResults(surveyId: string) {
  return apiRequest<PulseSurveyResults>(`${BASE}/pulse-surveys/${surveyId}/results`);
}

export async function getCalibrationBoard(cycleId: string) {
  return apiRequest<CalibrationBoard>(`${BASE}/performance-cycles/${cycleId}/calibration-board`);
}

export async function finalizeCalibration(
  reviewId: string,
  input: { calibratedOutcome?: string; calibrationNotes?: string },
) {
  return apiRequest<PerformanceReview>(`${BASE}/reviews/${reviewId}/calibration`, {
    method: 'POST',
    body: input,
  });
}
