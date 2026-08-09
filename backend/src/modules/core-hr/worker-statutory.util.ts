export type StatutoryIdRowInput = {
  tenantId: string;
  workerId: string;
  countryCode: string;
  fieldKey: string;
  fieldValue: string;
  expiryDate: string | null;
};

export function statutoryRowsFromMap(
  tenantId: string,
  workerId: string,
  countryCode: string,
  fields: Record<string, string>,
): StatutoryIdRowInput[] {
  return Object.entries(fields)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([fieldKey, fieldValue]) => ({
      tenantId,
      workerId,
      countryCode,
      fieldKey,
      fieldValue: fieldValue.trim(),
      expiryDate: null,
    }));
}

export function statutoryMapFromRows(
  rows: Array<{ fieldKey: string; fieldValue: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    out[row.fieldKey] = row.fieldValue;
  }
  return out;
}
