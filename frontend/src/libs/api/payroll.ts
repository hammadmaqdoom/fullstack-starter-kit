import { apiRequest, ApiRequestError } from '@/libs/api/client';

export type PayRunStatus = 'draft' | 'review' | 'approved' | 'exported' | 'locked';
export type PayslipStatus = 'draft' | 'released';
export type StatutoryScheduleStatus = 'draft' | 'active' | 'superseded';
export type StatutoryRateUnit = 'percentage' | 'fixed_amount';
export type EmployeeBenefitStatus = 'active' | 'suspended' | 'terminated' | 'draft';
export type BenefitTypeFieldType = 'text' | 'number' | 'date' | 'select';
export type ExportFileFormat = 'xlsx' | 'csv' | 'pdf';
export type BenefitDeliveryMode = 'cash' | 'non_cash' | 'insurance';
export type BenefitTypeStatus = 'draft' | 'active' | 'archived';
export type BenefitPayrollTreatment
  = | 'include_in_gross'
    | 'exclude_from_gross'
    | 'employer_cost_only'
    | 'informational_only';

export type PayRun = {
  id: string;
  legalEntityId: string;
  countryCode: string;
  periodStart: string;
  periodEnd: string;
  status: PayRunStatus;
  functionalCurrency: string;
  financeExportProfileId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayRunLineItem = {
  id: string;
  payRunId: string;
  workerId: string;
  worker?: { id: string; firstName: string; lastName: string } | null;
  grossPay: string;
  totalDeductions: string;
  netPay: string;
  currencyCode: string;
  calculationSnapshot: Record<string, unknown>;
  anomalyFlags: string[];
  paymentReference: string | null;
  paymentValueDate: string | null;
  swiftUetr: string | null;
};

export type PayRunDetail = PayRun & { lineItems: PayRunLineItem[] };

export type CreatePayRunInput = {
  legalEntityId: string;
  countryCode: string;
  periodStart: string;
  periodEnd: string;
  functionalCurrency: string;
};

export type PayRunExportBatch = {
  id: string;
  legalEntityId: string;
  payRunId: string | null;
  exportProfileId: string;
  fileFormat: ExportFileFormat;
  blobUrl: string;
  exportedBy: string;
  exportedAt: string;
};

export type Payslip = {
  id: string;
  legalEntityId: string;
  payRunLineItemId: string;
  workerId: string;
  periodStart: string;
  periodEnd: string;
  netPay: string;
  currencyCode: string;
  pdfBlobUrl: string | null;
  releasedAt: string | null;
  status: PayslipStatus;
  createdAt: string;
};

export type BenefitTypeField = {
  id: string;
  benefitTypeId: string;
  fieldCode: string;
  label: string;
  fieldType: BenefitTypeFieldType;
  required: boolean;
  employeeVisible: boolean;
  displayOrder: number;
};

export type BenefitType = {
  id: string;
  code: string;
  name: string;
  category: string;
  countryCode: string | null;
  deliveryMode: BenefitDeliveryMode;
  affectsPayroll: boolean;
  affectsTax: boolean;
  status: BenefitTypeStatus;
  payrollTreatment: BenefitPayrollTreatment | null;
  payComponentId: string | null;
  employeeVisible: boolean;
};

export type CreateBenefitTypeInput = {
  code: string;
  name: string;
  category: string;
  countryCode?: string;
  deliveryMode?: BenefitDeliveryMode;
  affectsPayroll?: boolean;
  affectsTax?: boolean;
  status?: BenefitTypeStatus;
  payrollTreatment?: BenefitPayrollTreatment;
  payComponentId?: string;
  employeeVisible?: boolean;
};

export type EmployeeBenefit = {
  id: string;
  workerId: string;
  benefitTypeId: string;
  fieldValues: Record<string, unknown>;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: EmployeeBenefitStatus;
  currencyCode: string | null;
  notes: string | null;
};

export type CreateEmployeeBenefitInput = {
  workerId: string;
  benefitTypeId: string;
  fieldValues?: Record<string, unknown>;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  status?: EmployeeBenefitStatus;
  currencyCode?: string;
  notes?: string;
};

export type UpdateEmployeeBenefitInput = Partial<
  Omit<CreateEmployeeBenefitInput, 'workerId' | 'benefitTypeId'>
>;

export type StatutoryRateEntry = {
  id: string;
  scheduleId: string;
  rateKey: string;
  rateValue: string;
  rateUnit: StatutoryRateUnit;
};

export type StatutoryRateSchedule = {
  id: string;
  legalEntityId: string;
  countryCode: string;
  name: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: StatutoryScheduleStatus;
};

export type StatutoryRateScheduleWithEntries = StatutoryRateSchedule & {
  entries: StatutoryRateEntry[];
};

export type CreateStatutoryRateEntryInput = {
  rateKey: string;
  rateValue: number;
  rateUnit: StatutoryRateUnit;
};

export type CreateStatutoryRateScheduleInput = {
  legalEntityId: string;
  countryCode: string;
  name: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  entries?: CreateStatutoryRateEntryInput[];
};

export type ContractorPaymentBatchStatus = 'draft' | 'review' | 'approved' | 'exported' | 'locked';

export type ContractorPaymentLine = {
  id: string;
  tenantId?: string;
  legalEntityId: string;
  batchId: string;
  invoiceId: string;
  workerId: string;
  worker?: { id: string; firstName: string; lastName: string } | null;
  amount: string;
  withholdingTax: string | null;
  paymentReference: string | null;
  paymentValueDate: string | null;
  swiftUetr: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type ContractorPaymentBatch = {
  id: string;
  legalEntityId: string;
  periodStart: string;
  periodEnd: string;
  status: ContractorPaymentBatchStatus;
  totalAmount: string;
  currencyCode: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractorPaymentBatchDetail = ContractorPaymentBatch & {
  lines: ContractorPaymentLine[];
};

export type CreateContractorPaymentBatchInput = {
  legalEntityId: string;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
};

export type ContractorPaymentBatchExportResult = {
  batch: ContractorPaymentBatch;
  blobUrl: string;
  fileFormat: ExportFileFormat;
};

export type MarkContractorPaymentLinePaidInput = {
  paymentReference: string;
  paymentValueDate?: string;
  swiftUetr?: string;
};

const PAY_RUN_BASE = '/api/v1/payroll/pay-runs';
const BENEFIT_TYPE_BASE = '/api/v1/payroll/benefit-types';
const EMPLOYEE_BENEFIT_BASE = '/api/v1/payroll/employee-benefits';
const STATUTORY_RATE_BASE = '/api/v1/payroll/statutory-rate-schedules';
const PAYSLIP_BASE = '/api/v1/payroll/payslips';
const CONTRACTOR_PAYMENT_BATCH_BASE = '/api/v1/payroll/contractor-payment-batches';
const CONTRACTOR_PAYMENT_LINE_BASE = '/api/v1/payroll/contractor-payment-lines';

function withUnavailableFallback<T>(fallback: T) {
  return (err: unknown) => {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: fallback, meta: { unavailable: true } };
    }
    throw err;
  };
}

export async function listPayRuns(params?: {
  legalEntityId?: string;
  status?: PayRunStatus;
  page?: number;
  limit?: number;
}) {
  try {
    return await apiRequest<PayRun[]>(PAY_RUN_BASE, { params });
  } catch (err) {
    return withUnavailableFallback<PayRun[]>([])(err);
  }
}

export async function createPayRun(input: CreatePayRunInput) {
  return apiRequest<PayRun>(PAY_RUN_BASE, { method: 'POST', body: input });
}

export async function getPayRun(id: string) {
  return apiRequest<PayRunDetail>(`${PAY_RUN_BASE}/${id}`);
}

export async function calculatePayRun(id: string) {
  return apiRequest<PayRunDetail>(`${PAY_RUN_BASE}/${id}/calculate`, {
    method: 'POST',
  });
}

export async function approvePayRun(id: string) {
  return apiRequest<PayRun>(`${PAY_RUN_BASE}/${id}/approve`, {
    method: 'POST',
  });
}

export async function exportPayRun(
  id: string,
  input?: { fileFormat?: ExportFileFormat; exportProfileId?: string },
) {
  return apiRequest<PayRunExportBatch>(`${PAY_RUN_BASE}/${id}/export`, {
    method: 'POST',
    body: input ?? {},
  });
}

export async function listExportsForPayRun(id: string) {
  try {
    return await apiRequest<PayRunExportBatch[]>(`${PAY_RUN_BASE}/${id}/exports`);
  } catch (err) {
    return withUnavailableFallback<PayRunExportBatch[]>([])(err);
  }
}

export async function releasePayslips(payRunId: string) {
  return apiRequest<Payslip[]>(`${PAY_RUN_BASE}/${payRunId}/release-payslips`, {
    method: 'POST',
  });
}

export async function listBenefitTypes(params?: {
  countryCode?: string;
  status?: BenefitTypeStatus;
  page?: number;
  limit?: number;
}) {
  try {
    return await apiRequest<BenefitType[]>(BENEFIT_TYPE_BASE, { params });
  } catch (err) {
    return withUnavailableFallback<BenefitType[]>([])(err);
  }
}

export async function createBenefitType(input: CreateBenefitTypeInput) {
  return apiRequest<BenefitType>(BENEFIT_TYPE_BASE, {
    method: 'POST',
    body: input,
  });
}

export async function getBenefitType(id: string) {
  return apiRequest<BenefitType & { fields?: BenefitTypeField[] }>(
    `${BENEFIT_TYPE_BASE}/${id}`,
  );
}

export async function updateBenefitType(
  id: string,
  input: Partial<CreateBenefitTypeInput>,
) {
  return apiRequest<BenefitType>(`${BENEFIT_TYPE_BASE}/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function listEmployeeBenefits(params?: {
  workerId?: string;
  status?: EmployeeBenefitStatus;
  page?: number;
  limit?: number;
}) {
  try {
    return await apiRequest<EmployeeBenefit[]>(EMPLOYEE_BENEFIT_BASE, { params });
  } catch (err) {
    return withUnavailableFallback<EmployeeBenefit[]>([])(err);
  }
}

export async function assignEmployeeBenefit(input: CreateEmployeeBenefitInput) {
  return apiRequest<EmployeeBenefit>(EMPLOYEE_BENEFIT_BASE, {
    method: 'POST',
    body: input,
  });
}

export async function updateEmployeeBenefit(
  id: string,
  input: UpdateEmployeeBenefitInput,
) {
  return apiRequest<EmployeeBenefit>(`${EMPLOYEE_BENEFIT_BASE}/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function listStatutoryRateSchedules(params?: {
  legalEntityId?: string;
  countryCode?: string;
  status?: StatutoryScheduleStatus;
  page?: number;
  limit?: number;
}) {
  try {
    return await apiRequest<StatutoryRateSchedule[]>(STATUTORY_RATE_BASE, {
      params,
    });
  } catch (err) {
    return withUnavailableFallback<StatutoryRateSchedule[]>([])(err);
  }
}

export async function createStatutoryRateSchedule(
  input: CreateStatutoryRateScheduleInput,
) {
  return apiRequest<StatutoryRateScheduleWithEntries>(STATUTORY_RATE_BASE, {
    method: 'POST',
    body: input,
  });
}

export async function getStatutoryRateSchedule(id: string) {
  return apiRequest<StatutoryRateScheduleWithEntries>(
    `${STATUTORY_RATE_BASE}/${id}`,
  );
}

export async function activateStatutoryRateSchedule(id: string) {
  return apiRequest<StatutoryRateSchedule>(`${STATUTORY_RATE_BASE}/${id}/activate`, {
    method: 'POST',
  });
}

export async function addStatutoryRateEntry(
  scheduleId: string,
  input: CreateStatutoryRateEntryInput,
) {
  return apiRequest<StatutoryRateEntry>(
    `${STATUTORY_RATE_BASE}/${scheduleId}/entries`,
    { method: 'POST', body: input },
  );
}

export async function getStatutoryRateImpactPreview(id: string) {
  return apiRequest<{ workerCount: number }>(
    `${STATUTORY_RATE_BASE}/${id}/impact-preview`,
  );
}

export async function listPayslips(params?: {
  workerId?: string;
  page?: number;
  limit?: number;
}) {
  try {
    return await apiRequest<Payslip[]>(PAYSLIP_BASE, { params });
  } catch (err) {
    return withUnavailableFallback<Payslip[]>([])(err);
  }
}

export async function getPayslip(id: string) {
  return apiRequest<Payslip>(`${PAYSLIP_BASE}/${id}`);
}

export async function downloadPayslip(id: string) {
  return apiRequest<{ payslipId: string; pdfBlobUrl: string }>(
    `${PAYSLIP_BASE}/${id}/download`,
  );
}

export async function listContractorPaymentBatches(params?: {
  legalEntityId?: string;
  status?: ContractorPaymentBatchStatus;
  page?: number;
  limit?: number;
}) {
  try {
    return await apiRequest<ContractorPaymentBatch[]>(CONTRACTOR_PAYMENT_BATCH_BASE, { params });
  } catch (err) {
    return withUnavailableFallback<ContractorPaymentBatch[]>([])(err);
  }
}

export async function createContractorPaymentBatch(input: CreateContractorPaymentBatchInput) {
  return apiRequest<ContractorPaymentBatchDetail>(CONTRACTOR_PAYMENT_BATCH_BASE, {
    method: 'POST',
    body: input,
  });
}

export async function getContractorPaymentBatch(id: string) {
  return apiRequest<ContractorPaymentBatchDetail>(`${CONTRACTOR_PAYMENT_BATCH_BASE}/${id}`);
}

export async function approveContractorPaymentBatch(id: string) {
  return apiRequest<ContractorPaymentBatch>(`${CONTRACTOR_PAYMENT_BATCH_BASE}/${id}/approve`, {
    method: 'POST',
  });
}

export async function exportContractorPaymentBatch(id: string) {
  return apiRequest<ContractorPaymentBatchExportResult>(`${CONTRACTOR_PAYMENT_BATCH_BASE}/${id}/export`, {
    method: 'POST',
  });
}

export async function markContractorPaymentLinePaid(
  lineId: string,
  input: MarkContractorPaymentLinePaidInput,
) {
  return apiRequest<ContractorPaymentLine>(`${CONTRACTOR_PAYMENT_LINE_BASE}/${lineId}/mark-paid`, {
    method: 'POST',
    body: input,
  });
}
