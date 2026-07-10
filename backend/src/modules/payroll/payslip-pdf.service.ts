import { Injectable } from '@nestjs/common';
import { buildPayslipPdf, PayslipPdfInput } from './payslip-pdf.builder';

@Injectable()
export class PayslipPdfService {
  async render(input: PayslipPdfInput): Promise<Buffer> {
    return buildPayslipPdf(input);
  }
}
