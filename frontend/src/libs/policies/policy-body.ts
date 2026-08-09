export type PolicyBodySource = {
  contentHtml?: string | null;
  contentSummary?: string | null;
  blobUrl?: string | null;
};

export type ResolvedPolicyBody = {
  html: string | null;
  summary: string | null;
  blobUrl: string | null;
  hasReadableBody: boolean;
};

/** Strip script tags and inline event handlers from trusted admin HTML before render. */
export function sanitizePolicyHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"])[\s\S]*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
}

function plainTextFromHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function resolvePolicyBody(source: PolicyBodySource): ResolvedPolicyBody {
  const rawHtml = source.contentHtml?.trim() || null;
  const html = rawHtml ? sanitizePolicyHtml(rawHtml) : null;
  const summary = source.contentSummary?.trim() || null;
  const blobUrl = source.blobUrl?.trim() || null;

  const htmlPlain = html ? plainTextFromHtml(html) : '';
  const hasReadableBody = Boolean(
    (html && htmlPlain.length > 0) || blobUrl || (summary && summary.length > 0),
  );

  return { html, summary, blobUrl, hasReadableBody };
}
