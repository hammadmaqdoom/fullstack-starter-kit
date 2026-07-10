import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface ExportPdfInput {
  title: string;
  legalEntityName: string;
  periodStart: string;
  periodEnd: string;
  headers: string[];
  rows: string[][];
  exportedAt: Date;
}

const COLUMN_WIDTH = 90;
const ROW_HEIGHT = 16;

/**
 * Minimal text-table PDF summary of an export pack (FLW-PAY-001 step 5).
 * Mirrors `payslip-pdf.builder.ts` — no letterhead branding, Wave 1 scope.
 */
export async function buildExportPdf(input: ExportPdfInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = Math.max(
    595.28,
    60 * 2 + input.headers.length * COLUMN_WIDTH,
  );
  let page = pdfDoc.addPage([pageWidth, 841.89]);
  const margin = 60;
  let y = page.getHeight() - margin;

  const drawText = (
    text: string,
    x: number,
    options: { size?: number; bold?: boolean } = {},
  ) => {
    page.drawText(text, {
      x,
      y,
      size: options.size ?? 9,
      font: options.bold ? boldFont : font,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  drawText(input.legalEntityName, margin, { size: 16, bold: true });
  y -= 24;
  drawText(input.title, margin, { size: 13, bold: true });
  y -= 20;
  drawText(`Pay period: ${input.periodStart} to ${input.periodEnd}`, margin);
  y -= 20;

  const drawRow = (cells: string[], bold: boolean) => {
    cells.forEach((cell, index) => {
      drawText(cell, margin + index * COLUMN_WIDTH, { bold });
    });
    y -= ROW_HEIGHT;
  };

  drawRow(input.headers, true);

  for (const row of input.rows) {
    if (y < margin + ROW_HEIGHT) {
      page = pdfDoc.addPage([pageWidth, 841.89]);
      y = page.getHeight() - margin;
      drawRow(input.headers, true);
    }
    drawRow(row, false);
  }

  y -= 8;
  drawText(`Exported: ${input.exportedAt.toISOString().slice(0, 10)}`, margin, {
    size: 8,
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
