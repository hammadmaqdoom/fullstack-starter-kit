export enum SetupWizardStep {
  ORGANISATION = 'organisation',
  LEGAL_ENTITIES = 'legal_entities',
  COUNTRIES = 'countries',
  CURRENCIES = 'currencies',
  LEAVE_TYPES = 'leave_types',
  HOLIDAY_CALENDARS = 'holiday_calendars',
  BENEFIT_TYPES = 'benefit_types',
  ROLES = 'roles',
  DOCUMENT_TEMPLATES = 'document_templates',
  NOTIFICATIONS = 'notifications',
}

export const SETUP_WIZARD_STEP_ORDER: SetupWizardStep[] = [
  SetupWizardStep.ORGANISATION,
  SetupWizardStep.LEGAL_ENTITIES,
  SetupWizardStep.COUNTRIES,
  SetupWizardStep.CURRENCIES,
  SetupWizardStep.LEAVE_TYPES,
  SetupWizardStep.HOLIDAY_CALENDARS,
  SetupWizardStep.BENEFIT_TYPES,
  SetupWizardStep.ROLES,
  SetupWizardStep.DOCUMENT_TEMPLATES,
  SetupWizardStep.NOTIFICATIONS,
];

export enum LeaveAccrualMethod {
  ANNUAL = 'annual',
  MONTHLY = 'monthly',
}

export enum BenefitDeliveryMode {
  CASH = 'cash',
  NON_CASH = 'non_cash',
  INSURANCE = 'insurance',
}

export enum BenefitTypeStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum BenefitPayrollTreatment {
  INCLUDE_IN_GROSS = 'include_in_gross',
  EXCLUDE_FROM_GROSS = 'exclude_from_gross',
  EMPLOYER_COST_ONLY = 'employer_cost_only',
  INFORMATIONAL_ONLY = 'informational_only',
}

export enum DocumentType {
  OFFER_LETTER = 'offer_letter',
  CONTRACT = 'contract',
  NDA = 'nda',
  SOW = 'sow',
  OTHER = 'other',
}

export enum DocumentAudience {
  EMPLOYEE = 'employee',
  CONTRACTOR = 'contractor',
  SHARED = 'shared',
}

export enum DocumentTemplateStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum DocumentTemplateVersionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}
