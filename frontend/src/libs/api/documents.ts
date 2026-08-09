import { ApiRequestError, apiRequest } from '@/libs/api/client';

export type DocumentTemplateAudience = 'employee' | 'contractor' | 'shared';

export type MergeFieldSchema = Record<string, { label?: string; required?: boolean }>;

export type DocumentTemplateVersionStatus = 'draft' | 'published' | 'archived' | string;

export type DocumentTemplateVersion = {
  id: string;
  templateId: string;
  version: number;
  body: string;
  mergeFieldSchema: MergeFieldSchema | Record<string, unknown>;
  status: DocumentTemplateVersionStatus;
  publishedAt?: string | null;
  createdAt?: string;
};

export type DocumentTemplate = {
  id: string;
  code: string;
  name?: string | null;
  documentType: string;
  audience: DocumentTemplateAudience | string;
  countryCode: string | null;
  status: 'draft' | 'active' | 'archived' | string;
  currentVersion?: number | null;
  versions?: DocumentTemplateVersion[];
};

export type GeneratedDocumentStatus =
  | 'draft'
  | 'issued'
  | 'sent_for_signature'
  | 'signed'
  | 'archived';

export type GeneratedDocument = {
  id: string;
  workerId: string;
  templateVersionId: string;
  status: GeneratedDocumentStatus | string;
  blobUrl: string | null;
  mergeData: Record<string, unknown>;
  templateSnapshot?: {
    templateId: string;
    version: number;
    body: string;
    mergeFieldSchema: MergeFieldSchema;
  } | null;
  legalEntityId?: string | null;
  documentNumber?: string | null;
  letterheadConfigId?: string | null;
  issuedBy?: string | null;
  issuedAt?: string | null;
  createdAt?: string;
};

/** Document register row — generated document plus joined template/version. */
export type DocumentRegisterItem = GeneratedDocument & {
  templateVersion?: {
    id: string;
    version: number;
    template?: {
      id: string;
      code: string;
      name?: string | null;
      documentType: string;
    };
  } | null;
};

export type GenerateDocumentInput = {
  templateVersionId: string;
  workerId: string;
  mergeData: Record<string, unknown>;
  legalEntityId?: string;
};

export type DocumentRegisterQuery = {
  legalEntityId?: string;
  status?: GeneratedDocumentStatus;
  workerId?: string;
  templateCode?: string;
  page?: number;
  limit?: number;
};

export type DocumentRegisterMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** @deprecated Prefer array + top-level meta from the API envelope. */
export type DocumentRegisterResult = {
  items: DocumentRegisterItem[];
  meta: DocumentRegisterMeta;
};

const MERGE_FIELD_TOKEN_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

/** Tokens referenced in a template body as `{{path}}`. */
export function extractMergeFieldTokens(body: string): string[] {
  const tokens = new Set<string>();
  for (const match of body.matchAll(MERGE_FIELD_TOKEN_PATTERN)) {
    if (match[1]) {
      tokens.add(match[1]);
    }
  }
  return [...tokens];
}

/** Resolve `{{tokens}}` in a generated-document body using merge data (preview). */
export function resolveDocumentPreviewBody(
  body: string,
  mergeData: Record<string, unknown> = {},
): string {
  return body.replace(MERGE_FIELD_TOKEN_PATTERN, (_match, token: string) => {
    const value = mergeData[token];
    if (value === undefined || value === null || value === '') {
      return `{{${token}}}`;
    }
    return String(value);
  });
}

export function publishedVersionNumber(template: DocumentTemplate): number | null {
  if (typeof template.currentVersion === 'number') {
    return template.currentVersion;
  }
  const published = (template.versions ?? [])
    .filter(v => v.status === 'published')
    .sort((a, b) => b.version - a.version);
  return published[0]?.version ?? null;
}

const STATUTORY_LABELS: Record<string, string> = {
  ntn: 'NTN',
  secp_registration: 'SECP Registration',
  eobi_employer_number: 'EOBI Employer No.',
  trade_licence_number: 'Trade Licence',
  mohre_establishment_id: 'MOHRE Establishment ID',
  vat_trn: 'VAT TRN',
  uen: 'UEN',
  cpf_employer_ref: 'CPF Employer Ref',
  gst_registration: 'GST Registration',
};

/** Format legal-entity address / statutory lines for document preview. */
export function formatLegalEntityPreviewBlock(entity: LegalEntity): string {
  const lines: string[] = [entity.registeredName];
  if (entity.tradingName?.trim() && entity.tradingName !== entity.registeredName) {
    lines.push(entity.tradingName);
  }
  for (const part of [
    entity.addressLine1,
    entity.addressLine2,
    [entity.city, entity.stateProvince, entity.postalCode].filter(Boolean).join(', '),
    entity.countryCode,
  ]) {
    if (part?.trim()) {
      lines.push(part.trim());
    }
  }
  for (const row of entity.statutoryIds ?? []) {
    const label = STATUTORY_LABELS[row.fieldKey] ?? row.fieldKey;
    lines.push(`${label}: ${row.fieldValue}`);
  }
  const contact = [entity.phone, entity.email, entity.website].filter(Boolean).join('  |  ');
  if (contact) {
    lines.push(contact);
  }
  if (entity.footerText?.trim()) {
    lines.push('');
    lines.push(entity.footerText.trim());
  }
  return lines.join('\n');
}

export type RenderProfile = 'full_digital' | 'print_on_letterhead' | 'informational';

export type LetterheadLayout = {
  logo?: { position?: string; maxHeightPx?: number };
  header?: { showRegisteredName?: boolean; showTradingName?: boolean; showAddress?: boolean };
  footer?: { showPageNumbers?: boolean; customText?: string };
  margins?: { top?: number; bottom?: number; left?: number; right?: number };
  physicalStock?: {
    enabled?: boolean;
    contentTopMarginMm?: number;
    contentBottomMarginMm?: number;
    showPrintWatermark?: boolean;
  };
};

export type LetterheadConfig = {
  id: string;
  legalEntityId: string;
  version: number;
  layoutJson: LetterheadLayout;
  logoBlobUrl: string | null;
  previewBlobUrl: string | null;
  isCurrent: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type CreateLetterheadConfigInput = {
  legalEntityId: string;
  layout: LetterheadLayout;
  logoBlobUrl?: string;
  effectiveFrom?: string;
};

export type UpdateLegalEntityDocumentOutputInput = {
  requiresWetStamp?: boolean;
  stampInstructions?: string;
  defaultRenderProfile?: RenderProfile;
};

export type LegalEntity = {
  id: string;
  code: string;
  registeredName: string;
  tradingName: string | null;
  countryCode: string;
  status: string;
  requiresWetStamp: boolean;
  stampInstructions: string | null;
  defaultRenderProfile: RenderProfile;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  footerText?: string | null;
  statutoryIds?: Array<{ fieldKey: string; fieldValue: string }>;
};

const BASE = '/api/v1/documents';
const LEGAL_ENTITY_BASE = '/api/v1/legal-entities';
const LETTERHEAD_BASE = '/api/v1/letterhead-configs';

export async function listDocumentTemplates() {
  return apiRequest<DocumentTemplate[]>(`${BASE}/templates`);
}

export type CreateDocumentTemplateInput = {
  code: string;
  name?: string;
  documentType: string;
  audience: DocumentTemplateAudience | string;
  countryCode?: string;
};

export async function createDocumentTemplate(input: CreateDocumentTemplateInput) {
  return apiRequest<DocumentTemplate>(`${BASE}/templates`, {
    method: 'POST',
    body: input,
  });
}

export async function getDocumentTemplate(id: string) {
  return apiRequest<DocumentTemplate>(`${BASE}/templates/${id}`);
}

export async function listDocumentTemplateVersions(templateId: string) {
  return apiRequest<DocumentTemplateVersion[]>(`${BASE}/templates/${templateId}/versions`);
}

export type CreateDocumentTemplateVersionInput = {
  body: string;
  mergeFieldSchema?: Record<string, unknown>;
};

export async function createDocumentTemplateVersion(
  templateId: string,
  input: CreateDocumentTemplateVersionInput,
) {
  return apiRequest<DocumentTemplateVersion>(`${BASE}/templates/${templateId}/versions`, {
    method: 'POST',
    body: input,
  });
}

export async function publishDocumentTemplateVersion(
  templateId: string,
  versionId?: string,
) {
  return apiRequest<DocumentTemplateVersion>(`${BASE}/templates/${templateId}/publish`, {
    method: 'POST',
    body: versionId ? { versionId } : {},
  });
}

export async function generateDocument(input: GenerateDocumentInput) {
  return apiRequest<GeneratedDocument>(`${BASE}/generate`, {
    method: 'POST',
    body: input,
  });
}

/**
 * Document register — API envelope puts rows in `data` and pagination in `meta`
 * (same pattern as workers). Tolerate a nested `{ items, meta }` payload if present.
 */
export async function listDocumentRegister(query: DocumentRegisterQuery = {}) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  try {
    const response = await apiRequest<DocumentRegisterItem[] | DocumentRegisterResult>(
      `${BASE}/register`,
      {
        params: {
          legalEntityId: query.legalEntityId,
          status: query.status,
          workerId: query.workerId,
          templateCode: query.templateCode,
          page,
          limit,
        },
      },
    );

    if (Array.isArray(response.data)) {
      return {
        data: response.data,
        meta: {
          page: Number(response.meta.page ?? page),
          limit: Number(response.meta.limit ?? limit),
          total: Number(response.meta.total ?? response.data.length),
          totalPages: Number(response.meta.totalPages ?? 1),
        } satisfies DocumentRegisterMeta,
      };
    }

    const nested = response.data;
    return {
      data: nested?.items ?? [],
      meta: {
        page: Number(nested?.meta?.page ?? response.meta.page ?? page),
        limit: Number(nested?.meta?.limit ?? response.meta.limit ?? limit),
        total: Number(nested?.meta?.total ?? response.meta.total ?? 0),
        totalPages: Number(nested?.meta?.totalPages ?? response.meta.totalPages ?? 1),
      } satisfies DocumentRegisterMeta,
    };
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return {
        data: [] as DocumentRegisterItem[],
        meta: { page: 1, limit: 20, total: 0, totalPages: 1, unavailable: true },
      };
    }
    throw err;
  }
}

export async function getGeneratedDocument(id: string) {
  return apiRequest<GeneratedDocument>(`${BASE}/generated/${id}`);
}

export async function issueDocument(id: string) {
  return apiRequest<GeneratedDocument>(`${BASE}/generated/${id}/issue`, { method: 'POST' });
}

export async function exportDocument(id: string, renderProfile: RenderProfile = 'full_digital') {
  return apiRequest<{ documentId: string; renderProfile: string; blobUrl: string }>(
    `${BASE}/generated/${id}/export`,
    { params: { renderProfile } },
  );
}

export async function listLetterheadConfigs(legalEntityId?: string) {
  try {
    return await apiRequest<LetterheadConfig[]>(LETTERHEAD_BASE, {
      params: legalEntityId ? { legalEntityId } : undefined,
    });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: [] as LetterheadConfig[], meta: { unavailable: true } };
    }
    throw err;
  }
}

export async function createLetterheadConfig(input: CreateLetterheadConfigInput) {
  return apiRequest<LetterheadConfig>(LETTERHEAD_BASE, { method: 'POST', body: input });
}

export async function listLegalEntities() {
  try {
    return await apiRequest<LegalEntity[]>(LEGAL_ENTITY_BASE);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: [] as LegalEntity[], meta: { unavailable: true } };
    }
    throw err;
  }
}

export async function updateLegalEntityDocumentOutput(
  legalEntityId: string,
  input: UpdateLegalEntityDocumentOutputInput,
) {
  return apiRequest<LegalEntity>(`${LEGAL_ENTITY_BASE}/${legalEntityId}/document-output`, {
    method: 'PATCH',
    body: input,
  });
}
