import { Env } from '@/libs/Env';
import { apiRequest, ApiRequestError } from '@/libs/api/client';

export type ContractorInvoiceStatus
  = | 'draft'
    | 'submitted'
    | 'manager_approved'
    | 'finance_approved'
    | 'queued'
    | 'paid'
    | 'rejected';

export type ContractorInvoiceLineItem = {
  id?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
};

export type ContractorInvoice = {
  id: string;
  legalEntityId: string;
  workerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  servicePeriodFrom: string | null;
  servicePeriodTo: string | null;
  currencyCode: string;
  grossAmount: string;
  taxAmount: string | null;
  status: ContractorInvoiceStatus;
  pdfBlobUrl: string | null;
  rejectionReason: string | null;
  managerApprovedBy: string | null;
  managerApprovedAt: string | null;
  financeApprovedBy: string | null;
  financeApprovedAt: string | null;
  lineItems?: ContractorInvoiceLineItem[];
  createdAt: string;
  updatedAt: string;
};

export type CreateContractorInvoiceLineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type CreateContractorInvoiceInput = {
  legalEntityId: string;
  workerId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
  currencyCode: string;
  taxAmount?: number;
  pdfBlobUrl?: string;
  lineItems: CreateContractorInvoiceLineItemInput[];
};

export type UpdateContractorInvoiceInput = Partial<
  Omit<CreateContractorInvoiceInput, 'legalEntityId' | 'workerId'>
>;

export type ContractorInvoiceListQuery = {
  workerId?: string;
  status?: ContractorInvoiceStatus;
  page?: number;
  limit?: number;
};

export type RemittancePackStatus = 'assembling' | 'partial' | 'complete' | 'incomplete';

export type RemittanceDocumentType
  = | 'payslip_pdf'
    | 'invoice_pdf'
    | 'signed_employment_contract'
    | 'signed_sow'
    | 'signed_contract'
    | 'salary_confirmation_letter'
    | 'payment_advice'
    | 'withholding_certificate'
    | 'swift_copy'
    | 'bank_payment_proof'
    | 'wire_confirmation'
    | 'tax_remit_form'
    | 'other_supporting';

export type RemittanceDocumentSource = 'auto' | 'finance_upload' | 'contractor_upload' | 'generated';
export type RemittanceDocumentStatus = 'available' | 'pending' | 'rejected';

export type RemittancePackDocument = {
  id: string;
  documentType: RemittanceDocumentType;
  source: RemittanceDocumentSource;
  blobUrl: string | null;
  status: RemittanceDocumentStatus;
  uploadedAt: string | null;
};

export type RemittancePack = {
  id: string;
  status: RemittancePackStatus;
  paymentReference: string | null;
  completedAt: string | null;
};

export type RemittancePackWithDocuments = {
  pack: RemittancePack;
  documents: RemittancePackDocument[];
};

const BASE = '/api/v1/contractor-invoices';

function isMissingResource(err: unknown): boolean {
  return err instanceof ApiRequestError && err.status === 404;
}

export async function listContractorInvoices(query: ContractorInvoiceListQuery = {}) {
  try {
    return await apiRequest<ContractorInvoice[]>(BASE, {
      params: {
        workerId: query.workerId,
        status: query.status,
        page: query.page ?? 1,
        limit: query.limit ?? 25,
      },
    });
  } catch (err) {
    if (isMissingResource(err)) {
      return { data: [] as ContractorInvoice[], meta: { unavailable: true } };
    }
    throw err;
  }
}

export async function getContractorInvoice(id: string) {
  return apiRequest<ContractorInvoice>(`${BASE}/${id}`);
}

export async function createContractorInvoice(input: CreateContractorInvoiceInput) {
  return apiRequest<ContractorInvoice>(BASE, { method: 'POST', body: input });
}

export async function updateContractorInvoice(id: string, input: UpdateContractorInvoiceInput) {
  return apiRequest<ContractorInvoice>(`${BASE}/${id}`, { method: 'PATCH', body: input });
}

export async function submitContractorInvoice(id: string) {
  return apiRequest<ContractorInvoice>(`${BASE}/${id}/submit`, { method: 'POST' });
}

export async function approveManagerContractorInvoice(id: string) {
  return apiRequest<ContractorInvoice>(`${BASE}/${id}/approve-manager`, { method: 'POST' });
}

export async function approveFinanceContractorInvoice(id: string) {
  return apiRequest<ContractorInvoice>(`${BASE}/${id}/approve-finance`, { method: 'POST' });
}

export async function rejectContractorInvoice(id: string, reason: string) {
  return apiRequest<ContractorInvoice>(`${BASE}/${id}/reject`, {
    method: 'POST',
    body: { reason },
  });
}

export async function getContractorInvoiceRemittancePack(id: string) {
  try {
    return await apiRequest<RemittancePackWithDocuments>(`${BASE}/${id}/remittance-pack`);
  } catch (err) {
    if (isMissingResource(err)) {
      return { data: null, meta: { unavailable: true } };
    }
    throw err;
  }
}

/** Direct browser-navigable URL — cookies carry the session, so an anchor/window.open works without CORS. */
export function contractorInvoiceRemittancePackDownloadUrl(id: string): string {
  return `${Env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, '')}${BASE}/${id}/remittance-pack/download`;
}
