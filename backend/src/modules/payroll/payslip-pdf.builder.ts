import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface PayslipPdfInput {
  payslipId: string;
  workerName: string;
  legalEntityName: string;
  periodStart: string;
  periodEnd: string;
  grossPay: string;
  totalDeductions: string;
  netPay: string;
  currencyCode: string;
  releasedAt: Date;
}

/**
 * Minimal text-summary payslip PDF (no letterhead/branding — Wave 1 scope).
 * Sufficient for employee self-service download; richer layout can reuse
 * `document-pdf.builder.ts` letterhead machinery in a later wave.
 */
export async function buildPayslipPdf(input: PayslipPdfInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([595.28, 841.89]);

  const margin = 60;
  let y = page.getHeight() - margin;

  const drawLine = (
    text: string,
    options: { size?: number; bold?: boolean; gap?: number } = {},
  ) => {
    const size = options.size ?? 11;
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: options.bold ? boldFont : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= options.gap ?? size + 8;
  };

  drawLine(input.legalEntityName, { size: 16, bold: true, gap: 24 });
  drawLine('Payslip', { size: 13, bold: true, gap: 22 });
  drawLine(`Employee: ${input.workerName}`);
  drawLine(`Pay period: ${input.periodStart} to ${input.periodEnd}`);
  y -= 8;
  drawLine(`Gross pay: ${input.currencyCode} ${input.grossPay}`);
  drawLine(`Total deductions: ${input.currencyCode} ${input.totalDeductions}`);
  drawLine(`Net pay: ${input.currencyCode} ${input.netPay}`, { bold: true });
  y -= 8;
  drawLine(`Released: ${input.releasedAt.toISOString().slice(0, 10)}`, {
    size: 9,
  });
  drawLine(`Payslip ID: ${input.payslipId}`, { size: 9 });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
