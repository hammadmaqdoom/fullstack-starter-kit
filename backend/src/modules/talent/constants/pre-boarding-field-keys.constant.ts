/**
 * Well-known `pre_boarding_field_values.fieldKey` values consumed by
 * PreBoardingMergeService (FLW-TAL-006). Candidates submit these via the
 * generic upsert-field / attachment-upload candidate endpoints — no
 * dedicated DTO per field is needed since the packet schema is key/value.
 *
 * Passport fields merge into `worker_passports`. Visa/pass fields merge
 * into `worker_visa_records` (type PREVIOUS) whenever present — this is not
 * gated on worker.countryCode so we never hard-code jurisdiction logic;
 * candidates in countries without a visa/pass history simply won't submit
 * these fields.
 */
export const PreBoardingFieldKey = {
  PassportNumber: 'passport_number',
  PassportNationalityCode: 'passport_nationality_code',
  PassportIssuingCountryCode: 'passport_issuing_country_code',
  PassportPlaceOfIssue: 'passport_place_of_issue',
  PassportIssueDate: 'passport_issue_date',
  PassportExpiryDate: 'passport_expiry_date',

  PreviousVisaCountryCode: 'previous_visa_country_code',
  PreviousVisaStatusCode: 'previous_visa_status_code',
  PreviousVisaOrPassType: 'previous_visa_or_pass_type',
  PreviousVisaDocumentNumber: 'previous_visa_document_number',
  PreviousVisaIssueDate: 'previous_visa_issue_date',
  PreviousVisaExpiryDate: 'previous_visa_expiry_date',
  PreviousVisaAttachmentUrl: 'previous_visa_attachment_url',

  PersonalPhone: 'personal_phone',
} as const;

export const PRE_BOARDING_PASSPORT_FIELD_KEYS: string[] = [
  PreBoardingFieldKey.PassportNumber,
  PreBoardingFieldKey.PassportNationalityCode,
  PreBoardingFieldKey.PassportIssuingCountryCode,
  PreBoardingFieldKey.PassportIssueDate,
  PreBoardingFieldKey.PassportExpiryDate,
];

export const PRE_BOARDING_VISA_REQUIRED_FIELD_KEYS: string[] = [
  PreBoardingFieldKey.PreviousVisaCountryCode,
  PreBoardingFieldKey.PreviousVisaStatusCode,
];
