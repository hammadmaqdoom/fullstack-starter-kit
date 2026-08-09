import { LEGAL_ENTITY_STATUTORY_LABELS } from '@/modules/core-hr/constants/org.seed-data';
import type { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import type { LegalEntityStatutoryIdEntity } from '@/modules/core-hr/entities/legal-entity-statutory-id.entity';

export type LegalEntityMergeSource = Pick<
  LegalEntityEntity,
  | 'registeredName'
  | 'tradingName'
  | 'countryCode'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'stateProvince'
  | 'postalCode'
  | 'phone'
  | 'email'
  | 'website'
  | 'footerText'
>;

function nonEmpty(...parts: Array<string | null | undefined>): string[] {
  return parts.map((p) => p?.trim()).filter((p): p is string => Boolean(p));
}

export function formatLegalEntityAddressBlock(
  entity: LegalEntityMergeSource,
): string {
  const lines = nonEmpty(
    entity.addressLine1,
    entity.addressLine2,
    [entity.city, entity.stateProvince, entity.postalCode]
      .filter(Boolean)
      .join(', '),
    entity.countryCode,
  );
  return lines.join('\n');
}

export function formatLegalEntityStatutoryBlock(
  ids: Array<Pick<LegalEntityStatutoryIdEntity, 'fieldKey' | 'fieldValue'>>,
): string {
  return ids
    .map((row) => {
      const label = LEGAL_ENTITY_STATUTORY_LABELS[row.fieldKey] ?? row.fieldKey;
      return `${label}: ${row.fieldValue}`;
    })
    .join('\n');
}

/**
 * Flat merge-field map for document templates (PRD §6.8 / database-design).
 * Keys use dotted paths e.g. `legal_entity.registered_name`.
 */
export function buildLegalEntityMergeData(
  entity: LegalEntityMergeSource,
  statutoryIds: Array<Pick<LegalEntityStatutoryIdEntity, 'fieldKey' | 'fieldValue'>> = [],
): Record<string, string> {
  const merge: Record<string, string> = {
    'legal_entity.registered_name': entity.registeredName,
    'legal_entity.trading_name': entity.tradingName ?? '',
    'legal_entity.country_code': entity.countryCode,
    'legal_entity.address_line_1': entity.addressLine1 ?? '',
    'legal_entity.address_line_2': entity.addressLine2 ?? '',
    'legal_entity.city': entity.city ?? '',
    'legal_entity.state_province': entity.stateProvince ?? '',
    'legal_entity.postal_code': entity.postalCode ?? '',
    'legal_entity.phone': entity.phone ?? '',
    'legal_entity.email': entity.email ?? '',
    'legal_entity.website': entity.website ?? '',
    'legal_entity.footer_text': entity.footerText ?? '',
    'legal_entity.address_block': formatLegalEntityAddressBlock(entity),
    'legal_entity.statutory_ids_block':
      formatLegalEntityStatutoryBlock(statutoryIds),
  };

  for (const row of statutoryIds) {
    merge[`legal_entity.${row.fieldKey}`] = row.fieldValue;
  }

  return merge;
}
