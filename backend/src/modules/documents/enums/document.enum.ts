export enum GeneratedDocumentStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  SENT_FOR_SIGNATURE = 'sent_for_signature',
  SIGNED = 'signed',
  ARCHIVED = 'archived',
}

/** Export/print-time layout selection (PRD §6.8.5). One canonical issued record; profile chosen at render time only. */
export enum RenderProfile {
  FULL_DIGITAL = 'full_digital',
  PRINT_ON_LETTERHEAD = 'print_on_letterhead',
  INFORMATIONAL = 'informational',
}

/** Short type code used in the immutable `document_number` (PRD §6.8.4, e.g. `DL-PK-OFR-2026-0042`). */
export const DOCUMENT_TYPE_NUMBER_CODE: Record<string, string> = {
  offer_letter: 'OFR',
  contract: 'CON',
  nda: 'NDA',
  sow: 'SOW',
  other: 'OTH',
};
