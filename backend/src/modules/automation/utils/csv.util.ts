import type { ReportRow } from '../automation.service';

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Minimal RFC 4180 CSV serializer — no external dependency needed for the
 * flat, tabular report rows produced by AutomationService.runReport().
 */
export function rowsToCsv(rows: ReportRow[]): string {
  if (rows.length === 0) {
    return '';
  }

  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvValue(row[column])).join(','));
  }

  return lines.join('\r\n');
}
