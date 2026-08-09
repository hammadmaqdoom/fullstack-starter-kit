import { PDFDocument } from 'pdf-lib';
import { inflateSync } from 'zlib';
import {
  buildDocumentPdf,
  htmlToPlainTextParagraphs,
  resolveMergeTokens,
} from '../document-pdf.builder';
import { RenderProfile } from '../enums/document.enum';

/**
 * pdf-lib flate-compresses content streams and draws text as WinAnsi hex
 * strings (`<48656C6C6F>`), not literal `(Hello)` strings. Decompress each
 * stream and decode hex-string operands so tests can search drawn text.
 */
function extractPdfText(bytes: Buffer): string {
  const raw = bytes.toString('latin1');
  const streamPattern = /stream\r?\n([\s\S]*?)endstream/g;
  let combined = '';
  let match: RegExpExecArray | null;
  while ((match = streamPattern.exec(raw))) {
    let body = Buffer.from(match[1], 'latin1');
    if (body[body.length - 1] === 0x0a) body = body.subarray(0, -1);
    if (body[body.length - 1] === 0x0d) body = body.subarray(0, -1);
    let decompressed: string;
    try {
      decompressed = inflateSync(body).toString('latin1');
    } catch {
      decompressed = body.toString('latin1');
    }
    combined += decompressed;
    combined += decompressed.replace(
      /<([0-9A-Fa-f]{2,})>/g,
      (_, hex: string) =>
        hex.length % 2 === 0 ? Buffer.from(hex, 'hex').toString('latin1') : '',
    );
  }
  return combined;
}

describe('resolveMergeTokens', () => {
  it('substitutes known tokens and leaves unknown ones untouched', () => {
    const result = resolveMergeTokens(
      'Dear {{worker.firstName}}, your role is {{employment.jobTitle}}. {{unknown.token}}',
      { 'worker.firstName': 'Ada', 'employment.jobTitle': 'Engineer' },
    );

    expect(result).toBe('Dear Ada, your role is Engineer. {{unknown.token}}');
  });
});

describe('htmlToPlainTextParagraphs', () => {
  it('converts breaks/paragraph tags to line breaks and strips markup', () => {
    const paragraphs = htmlToPlainTextParagraphs(
      '<p>Dear Ada,</p><p>Your offer is confirmed.<br/>Welcome aboard.</p>',
    );

    expect(paragraphs).toEqual([
      'Dear Ada,',
      'Your offer is confirmed.',
      'Welcome aboard.',
    ]);
  });

  it('decodes common HTML entities', () => {
    const paragraphs = htmlToPlainTextParagraphs(
      '<p>Terms &amp; conditions apply &mdash; see &quot;Schedule A&quot;</p>',
    );
    expect(paragraphs[0]).toContain('Terms & conditions apply');
    expect(paragraphs[0]).toContain('"Schedule A"');
  });
});

describe('buildDocumentPdf', () => {
  const legalEntity = {
    registeredName: 'Digitaro Labs (Private) Limited',
    tradingName: 'Digitaro Labs',
    addressLines: ['Office 12, Plot 45', 'Islamabad, ICT, 44000', 'PK'],
    statutoryLines: ['NTN: 1234567-8', 'SECP Registration: 0123456'],
    phone: '+92 51 8899 0100',
    email: 'legal.pk@digitaro.co',
    website: 'https://digitaro.co',
    requiresWetStamp: true,
    stampInstructions: 'Affix company seal before employee signature',
  };

  const baseInput = {
    documentNumber: 'DIGITARO_LABS_PK-OFR-2026-0042',
    issuedAt: new Date('2026-07-10T00:00:00Z'),
    bodyHtml:
      '<p>Dear {{worker.firstName}},</p><p>Your offer for {{employment.jobTitle}} is confirmed.</p>',
    mergeData: { 'worker.firstName': 'Ada', 'employment.jobTitle': 'Engineer' },
    legalEntity,
    letterhead: {
      header: { showRegisteredName: true, showTradingName: true },
      footer: { showPageNumbers: true, customText: 'Confidential' },
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      physicalStock: {
        enabled: true,
        contentTopMarginMm: 45,
        contentBottomMarginMm: 25,
        showPrintWatermark: true,
      },
    },
  };

  it('produces valid, parseable PDF bytes for full_digital', async () => {
    const bytes = await buildDocumentPdf({
      ...baseInput,
      renderProfile: RenderProfile.FULL_DIGITAL,
    });

    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('includes the entity header for full_digital but omits it for print_on_letterhead', async () => {
    const digitalBytes = await buildDocumentPdf({
      ...baseInput,
      renderProfile: RenderProfile.FULL_DIGITAL,
    });
    const printBytes = await buildDocumentPdf({
      ...baseInput,
      renderProfile: RenderProfile.PRINT_ON_LETTERHEAD,
    });

    const digitalText = extractPdfText(digitalBytes);
    expect(digitalText).toContain('Digitaro Labs');
    expect(digitalText).toContain('NTN: 1234567-8');
    expect(digitalText).toContain('legal.pk@digitaro.co');
    expect(extractPdfText(printBytes)).not.toContain('Digitaro Labs');
  });

  it('draws a stamp placement zone only when requiresWetStamp is true', async () => {
    const withStamp = await buildDocumentPdf({
      ...baseInput,
      renderProfile: RenderProfile.PRINT_ON_LETTERHEAD,
    });
    const withoutStamp = await buildDocumentPdf({
      ...baseInput,
      legalEntity: { ...legalEntity, requiresWetStamp: false },
      renderProfile: RenderProfile.PRINT_ON_LETTERHEAD,
    });

    expect(extractPdfText(withStamp)).toContain('Company stamp');
    expect(extractPdfText(withoutStamp)).not.toContain('Company stamp');
  });

  it('shows the no-signature banner for informational documents', async () => {
    const bytes = await buildDocumentPdf({
      ...baseInput,
      renderProfile: RenderProfile.INFORMATIONAL,
    });

    expect(extractPdfText(bytes)).toContain('no wet signature required');
  });

  it('renders draft documents (no document number) without throwing', async () => {
    const bytes = await buildDocumentPdf({
      ...baseInput,
      documentNumber: null,
      issuedAt: null,
      renderProfile: RenderProfile.FULL_DIGITAL,
    });

    expect(extractPdfText(bytes)).toContain('DRAFT');
  });
});
