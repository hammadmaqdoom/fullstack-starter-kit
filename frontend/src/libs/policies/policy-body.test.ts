import { describe, expect, it } from 'vitest';
import { resolvePolicyBody, sanitizePolicyHtml } from './policy-body';

describe('sanitizePolicyHtml', () => {
  it('strips script tags and inline handlers', () => {
    const dirty
      = '<p onclick="alert(1)">Hello</p><script>alert(2)</script><p>World</p>';
    expect(sanitizePolicyHtml(dirty)).toBe('<p>Hello</p><p>World</p>');
  });
});

describe('resolvePolicyBody', () => {
  it('prefers full HTML body over truncated summary for reading', () => {
    const resolved = resolvePolicyBody({
      contentHtml: '<h2>Code of Conduct</h2><p>Respect colleagues.</p>',
      contentSummary: 'Short blurb',
      blobUrl: null,
    });

    expect(resolved.html).toContain('<h2>Code of Conduct</h2>');
    expect(resolved.html).toContain('Respect colleagues');
    expect(resolved.summary).toBe('Short blurb');
    expect(resolved.hasReadableBody).toBe(true);
  });

  it('exposes blobUrl when HTML is absent so the document can be opened', () => {
    const resolved = resolvePolicyBody({
      contentHtml: null,
      contentSummary: null,
      blobUrl: 'https://example.com/policies/conduct.pdf',
    });

    expect(resolved.html).toBeNull();
    expect(resolved.blobUrl).toBe('https://example.com/policies/conduct.pdf');
    expect(resolved.hasReadableBody).toBe(true);
  });

  it('marks empty payloads as not readable', () => {
    expect(
      resolvePolicyBody({
        contentHtml: null,
        contentSummary: '   ',
        blobUrl: null,
      }).hasReadableBody,
    ).toBe(false);
  });
});
