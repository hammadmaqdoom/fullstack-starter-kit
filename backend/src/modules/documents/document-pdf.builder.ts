import {
  degrees,
  PDFDocument,
  PDFFont,
  PDFPage,
  rgb,
  StandardFonts,
} from 'pdf-lib';
import { LetterheadLayoutJson } from './entities/letterhead-config.entity';
import { RenderProfile } from './enums/document.enum';

const MM_TO_PT = 2.834645669;
const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4
const DEFAULT_MARGIN = 72;
const DEFAULT_PHYSICAL_TOP_MM = 45;
const DEFAULT_PHYSICAL_BOTTOM_MM = 25;
const FOOTER_ZONE = 40;

const MERGE_TOKEN_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export interface DocumentPdfLegalEntityInfo {
  registeredName: string;
  tradingName: string | null;
  footerText?: string | null;
  requiresWetStamp: boolean;
  stampInstructions: string | null;
}

export interface DocumentPdfInput {
  documentNumber: string | null;
  issuedAt: Date | null;
  bodyHtml: string;
  mergeData: Record<string, unknown>;
  renderProfile: RenderProfile;
  legalEntity: DocumentPdfLegalEntityInfo;
  letterhead: LetterheadLayoutJson | null;
}

/** Replaces `{{merge.field}}` tokens with resolved values (already validated at generation time). */
export function resolveMergeTokens(
  text: string,
  mergeData: Record<string, unknown>,
): string {
  return text.replace(MERGE_TOKEN_PATTERN, (match, token: string) => {
    const value = mergeData[token];
    return value === undefined || value === null ? match : String(value);
  });
}

/** Strips HTML tags from a rich-text template body, preserving paragraph/line breaks as newlines. */
export function htmlToPlainTextParagraphs(html: string): string[] {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const decoded = withBreaks
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return decoded
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function wrapLine(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.length > 0 ? lines : [''];
}

/**
 * Renders a `GeneratedDocument` to PDF bytes for the given render profile
 * (PRD §6.8.5). One canonical issued record; layout is chosen at render
 * time, so this is invoked fresh at every export/print/issue.
 */
export async function buildDocumentPdf(
  input: DocumentPdfInput,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const layout = input.letterhead ?? {};
  const isPhysical = input.renderProfile === RenderProfile.PRINT_ON_LETTERHEAD;

  const leftMargin = layout.margins?.left ?? DEFAULT_MARGIN;
  const rightMargin = layout.margins?.right ?? DEFAULT_MARGIN;
  const topMargin = isPhysical
    ? (layout.physicalStock?.contentTopMarginMm ?? DEFAULT_PHYSICAL_TOP_MM) *
      MM_TO_PT
    : (layout.margins?.top ?? DEFAULT_MARGIN);
  const bottomMargin = isPhysical
    ? (layout.physicalStock?.contentBottomMarginMm ??
        DEFAULT_PHYSICAL_BOTTOM_MM) *
        MM_TO_PT +
      FOOTER_ZONE
    : (layout.margins?.bottom ?? DEFAULT_MARGIN) + FOOTER_ZONE;

  const pages: PDFPage[] = [];
  let page = pdfDoc.addPage(PAGE_SIZE);
  pages.push(page);
  const contentWidth = page.getWidth() - leftMargin - rightMargin;
  let y = page.getHeight() - topMargin;

  const newPage = () => {
    page = pdfDoc.addPage(PAGE_SIZE);
    pages.push(page);
    y = page.getHeight() - topMargin;
  };

  const drawText = (
    text: string,
    options: {
      size?: number;
      bold?: boolean;
      gap?: number;
      color?: ReturnType<typeof rgb>;
    } = {},
  ) => {
    const size = options.size ?? 11;
    if (y < bottomMargin + size) {
      newPage();
    }
    page.drawText(text, {
      x: leftMargin,
      y,
      size,
      font: options.bold ? boldFont : font,
      color: options.color ?? rgb(0.1, 0.1, 0.1),
    });
    y -= options.gap ?? size + 6;
  };

  const drawWrapped = (
    text: string,
    options: { size?: number; bold?: boolean; gap?: number } = {},
  ) => {
    const size = options.size ?? 11;
    for (const line of wrapLine(
      text,
      options.bold ? boldFont : font,
      size,
      contentWidth,
    )) {
      drawText(line, options);
    }
  };

  // --- Header (full_digital / informational only — physical stock has no digital header per PRD §6.8.5) ---
  if (!isPhysical) {
    if (layout.header?.showRegisteredName ?? true) {
      drawText(input.legalEntity.registeredName, {
        size: 16,
        bold: true,
        gap: 20,
      });
    }
    if (layout.header?.showTradingName && input.legalEntity.tradingName) {
      drawText(input.legalEntity.tradingName, { size: 11, gap: 18 });
    }
    if (input.renderProfile === RenderProfile.INFORMATIONAL) {
      drawText('System-generated — no wet signature required', {
        size: 10,
        bold: true,
        color: rgb(0.4, 0.4, 0.4),
        gap: 22,
      });
    }
    y -= 6;
  }

  // --- Body ---
  const resolvedHtml = resolveMergeTokens(input.bodyHtml, input.mergeData);
  const paragraphs = htmlToPlainTextParagraphs(resolvedHtml);
  for (const paragraph of paragraphs) {
    drawWrapped(paragraph, { size: 11, gap: 15 });
    y -= 4;
  }

  // --- Signature / stamp zone (physical print path) ---
  if (isPhysical) {
    y -= 20;
    drawText('Signature: ______________________________', {
      size: 11,
      gap: 18,
    });
    const signatoryName = input.mergeData['signatory.name'];
    const signatoryTitle = input.mergeData['signatory.title'];
    drawText(
      `${signatoryName ? String(signatoryName) : 'Name'} — ${signatoryTitle ? String(signatoryTitle) : 'Title'}`,
      { size: 9, gap: 20 },
    );

    if (input.legalEntity.requiresWetStamp) {
      const boxWidth = 160;
      const boxHeight = 80;
      if (y < bottomMargin + boxHeight) {
        newPage();
      }
      page.drawRectangle({
        x: leftMargin,
        y: y - boxHeight,
        width: boxWidth,
        height: boxHeight,
        borderColor: rgb(0.4, 0.4, 0.4),
        borderWidth: 1,
        borderDashArray: [4, 4],
      });
      page.drawText('Company stamp', {
        x: leftMargin + 8,
        y: y - 16,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= boxHeight + 14;
      if (input.legalEntity.stampInstructions) {
        drawWrapped(input.legalEntity.stampInstructions, { size: 9, gap: 12 });
      }
    }

    if (layout.physicalStock?.showPrintWatermark) {
      page.drawText('PRINT ON OFFICIAL LETTERHEAD', {
        x: page.getWidth() / 2 - 160,
        y: page.getHeight() / 2,
        size: 24,
        font: boldFont,
        color: rgb(0.85, 0.85, 0.85),
        rotate: degrees(30),
      });
    }
  } else {
    y -= 20;
    drawText('Signature: ______________________________', {
      size: 11,
      gap: 18,
    });
  }

  // --- Footer (every page, all profiles) — document number + issue date always present (PRD §6.8.4) ---
  const issuedLabel = input.issuedAt
    ? input.issuedAt.toISOString().slice(0, 10)
    : 'Draft — not yet issued';
  const showPageNumbers = layout.footer?.showPageNumbers ?? true;
  const footerCustomText =
    layout.footer?.customText ?? input.legalEntity.footerText ?? null;

  pages.forEach((p, index) => {
    const footerY = 24;
    p.drawText(
      `Doc #: ${input.documentNumber ?? 'DRAFT'} | Issued: ${issuedLabel}`,
      { x: leftMargin, y: footerY, size: 8, font, color: rgb(0.4, 0.4, 0.4) },
    );
    if (footerCustomText) {
      p.drawText(footerCustomText, {
        x: leftMargin,
        y: footerY - 10,
        size: 7,
        font,
        color: rgb(0.55, 0.55, 0.55),
      });
    }
    if (showPageNumbers) {
      const label = `Page ${index + 1} of ${pages.length}`;
      const width = font.widthOfTextAtSize(label, 8);
      p.drawText(label, {
        x: p.getWidth() - rightMargin - width,
        y: footerY,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
