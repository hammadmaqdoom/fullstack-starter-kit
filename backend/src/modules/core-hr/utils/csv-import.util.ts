/**
 * Minimal RFC 4180 CSV parser (quoted fields, embedded commas/newlines,
 * `""` escaping). Mirrors the serializer in
 * `modules/automation/utils/csv.util.ts` but for the read path.
 */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  const normalized = content.replace(/\r\n/g, '\n');
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      pushField();
    } else if (char === '\n') {
      pushRow();
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows.filter((r) => r.some((value) => value.trim().length > 0));
}

export function csvToRecords(content: string): Record<string, string>[] {
  const rows = parseCsv(content);
  if (rows.length === 0) {
    return [];
  }

  const [header, ...dataRows] = rows;
  const columns = header.map((column) => column.trim());

  return dataRows.map((row) =>
    columns.reduce<Record<string, string>>((record, column, index) => {
      record[column] = (row[index] ?? '').trim();
      return record;
    }, {}),
  );
}
