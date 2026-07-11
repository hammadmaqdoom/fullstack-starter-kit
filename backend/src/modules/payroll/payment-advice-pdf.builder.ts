import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface PaymentAdvicePdfInput {
  packId: string;
  workerName: string;
  legalEntityName: string;
  periodStart: string;
  periodEnd: string;
  netPay: string;
  currencyCode: string;
  paymentReference: string | null;
  generatedAt: Date;
}

/**
 * FLW-PAY-005 — minimal text-summary payment advice PDF, confirming a cross-
 * border remittance amount/reference to the beneficiary worker. Mirrors
 * `payslip-pdf.builder.ts` (Wave 1 scope: no letterhead/branding).
 */
export async function buildPaymentAdvicePdf(
  input: PaymentAdvicePdfInput,
): Promise<Buffer> {
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
  drawLine('Payment Advice', { size: 13, bold: true, gap: 22 });
  drawLine(`Beneficiary: ${input.workerName}`);
  drawLine(`Pay period: ${input.periodStart} to ${input.periodEnd}`);
  y -= 8;
  drawLine(`Amount remitted: ${input.currencyCode} ${input.netPay}`, {
    bold: true,
  });
  drawLine(`Payment reference: ${input.paymentReference ?? 'Pending'}`);
  y -= 8;
  drawLine(`Generated: ${input.generatedAt.toISOString().slice(0, 10)}`, {
    size: 9,
  });
  drawLine(`Remittance pack ID: ${input.packId}`, { size: 9 });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
