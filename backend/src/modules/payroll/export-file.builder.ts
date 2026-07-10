import ExcelJS from 'exceljs';

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Simple CSV pay register — always available regardless of format libs. */
export function buildExportCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((line) =>
    line.map(escapeCsvCell).join(','),
  );
  return lines.join('\n');
}

/** Excel pay register (FLW-PAY-001 step 5) via `exceljs`. */
export async function buildExportXlsx(
  headers: string[],
  rows: string[][],
  sheetName = 'Pay Register',
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers).font = { bold: true };
  for (const row of rows) {
    sheet.addRow(row);
  }
  sheet.columns.forEach((column) => {
    column.width = 20;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
