import { apiRequest } from '@/libs/api/client';

export type EsignEnvelopeStatus =
  | 'draft'
  | 'sent'
  | 'partially_signed'
  | 'completed'
  | 'voided'
  | 'declined';

export type EsignSignatoryStatus = 'pending' | 'signed' | 'declined';

export type EsignSignatory = {
  id: string;
  workerId: string | null;
  email: string;
  name: string;
  signingOrder: number;
  status: EsignSignatoryStatus;
  signedAt: string | null;
};

export type EsignEnvelope = {
  id: string;
  title: string;
  status: EsignEnvelopeStatus;
  documentBlobUrl: string | null;
  signatories: EsignSignatory[];
  completedAt: string | null;
  createdAt: string;
  nextStepText?: string | null;
};

export type SignEnvelopeInput = {
  method: 'draw' | 'type';
  typedName?: string;
  signatureDataUrl?: string;
};

const BASE = '/api/v1/esign';

export async function getEnvelope(envelopeId: string) {
  return apiRequest<EsignEnvelope>(`${BASE}/envelopes/${envelopeId}`);
}

export async function signEnvelope(envelopeId: string, input: SignEnvelopeInput) {
  return apiRequest<EsignEnvelope>(`${BASE}/envelopes/${envelopeId}/sign`, {
    method: 'POST',
    body: input,
  });
}

export async function validateSigningToken(token: string) {
  return apiRequest<{
    envelopeId: string;
    signatoryId: string;
    email: string;
    title: string;
    status: EsignEnvelopeStatus;
  }>(`${BASE}/sign`, { params: { token } });
}

export async function completeSigningWithToken(
  token: string,
  signatureBlobUrl: string,
) {
  return apiRequest<EsignEnvelope>(`${BASE}/sign/complete`, {
    method: 'POST',
    body: { token, signatureBlobUrl },
  });
}

/** Lists envelopes awaiting the current user's signature. */
export async function listPendingEnvelopes(): Promise<{
  data: EsignEnvelope[];
  meta: Record<string, unknown>;
}> {
  return apiRequest<EsignEnvelope[]>(`${BASE}/envelopes`);
}
