import { apiRequest } from '@/libs/api/client';

export type SetupWizardStep
  = | 'organisation'
    | 'legal_entities'
    | 'countries'
    | 'currencies'
    | 'leave_types'
    | 'holiday_calendars'
    | 'benefit_types'
    | 'roles'
    | 'document_templates'
    | 'notifications';

export type SetupWizardStepState = {
  step: SetupWizardStep;
  label: string;
  isComplete: boolean;
  isSkipped: boolean;
  isCurrent: boolean;
  canSkip: boolean;
};

export type SetupWizardProgress = {
  id: string;
  currentStep: SetupWizardStep;
  completedSteps: SetupWizardStep[];
  skippedSteps: SetupWizardStep[];
  stepData: Record<string, unknown>;
  isComplete: boolean;
  completedAt: string | null;
};

export type SetupWizardState = {
  progress: SetupWizardProgress;
  steps: SetupWizardStepState[];
  summary: {
    leaveTypeCount: number;
    holidayCount: number;
    benefitTypeCount: number;
    documentTemplateCount: number;
    legalEntityCount: number;
    activeCountryCount: number;
  };
};

const BASE = '/api/v1/admin/setup-wizard';

export async function getSetupWizardState() {
  return apiRequest<SetupWizardState>(BASE);
}

export async function saveSetupWizardStep(input: {
  step: SetupWizardStep;
  data?: Record<string, unknown>;
  skip?: boolean;
}) {
  return apiRequest<SetupWizardState>(BASE, { method: 'POST', body: input });
}

export async function applySetupWizardSeeds(countryCodes?: string[]) {
  return apiRequest<SetupWizardState>(`${BASE}/seed`, {
    method: 'POST',
    body: countryCodes ? { countryCodes } : {},
  });
}
