export enum EsignEnvelopeStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PARTIALLY_SIGNED = 'partially_signed',
  COMPLETED = 'completed',
  VOIDED = 'voided',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

export enum EsignSignatoryStatus {
  PENDING = 'pending',
  SIGNED = 'signed',
  DECLINED = 'declined',
}

export enum EsignFieldType {
  SIGNATURE = 'signature',
  INITIALS = 'initials',
  DATE = 'date',
  TEXT = 'text',
}

export enum EsignSignatureMethod {
  DRAW = 'draw',
  TYPE = 'type',
  UPLOAD = 'upload',
  MANUAL_UPLOAD = 'manual_upload',
}

export enum EsignAuditAction {
  CREATED = 'envelope.created',
  SENT = 'envelope.sent',
  SIGNED = 'envelope.signed',
  COMPLETED = 'envelope.completed',
  VOIDED = 'envelope.voided',
  DECLINED = 'envelope.declined',
  EXPORTED = 'document.exported',
  MANUAL_UPLOAD = 'document.manual_upload',
  REMINDER_QUEUED = 'envelope.reminder_queued',
  EXPIRED = 'envelope.expired',
  CERTIFICATE_GENERATED = 'certificate.generated',
  SEALED = 'seal.completed',
  SEAL_SKIPPED = 'seal.skipped_not_configured',
  TOKEN_ISSUED = 'signing_token.issued',
  TOKEN_VALIDATED = 'signing_token.validated',
}
