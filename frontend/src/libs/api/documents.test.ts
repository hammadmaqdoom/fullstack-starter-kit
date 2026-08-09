import { describe, expect, it } from 'vitest';
import {
  extractMergeFieldTokens,
  publishedVersionNumber,
  resolveDocumentPreviewBody,
} from './documents';

describe('extractMergeFieldTokens', () => {
  it('extracts unique {{token}} paths from a body', () => {
    const body = 'Dear {{worker.firstName}},\nCC {{manager.email}} and {{worker.firstName}}.';
    expect(extractMergeFieldTokens(body)).toEqual([
      'worker.firstName',
      'manager.email',
    ]);
  });

  it('returns empty for bodies without tokens', () => {
    expect(extractMergeFieldTokens('Plain text only')).toEqual([]);
  });
});

describe('resolveDocumentPreviewBody', () => {
  it('substitutes merge values and leaves missing tokens intact', () => {
    expect(
      resolveDocumentPreviewBody('Dear {{worker.firstName}} ({{missing}})', {
        'worker.firstName': 'Ada',
      }),
    ).toBe('Dear Ada ({{missing}})');
  });
});

describe('publishedVersionNumber', () => {
  it('prefers currentVersion when set', () => {
    expect(publishedVersionNumber({
      id: '1',
      code: 'X',
      documentType: 'offer_letter',
      audience: 'employee',
      countryCode: null,
      status: 'active',
      currentVersion: 3,
      versions: [{ id: 'v', templateId: '1', version: 1, body: '', mergeFieldSchema: {}, status: 'published' }],
    })).toBe(3);
  });

  it('falls back to the highest published version', () => {
    expect(publishedVersionNumber({
      id: '1',
      code: 'X',
      documentType: 'offer_letter',
      audience: 'employee',
      countryCode: null,
      status: 'active',
      versions: [
        { id: 'a', templateId: '1', version: 1, body: '', mergeFieldSchema: {}, status: 'published' },
        { id: 'b', templateId: '1', version: 2, body: '', mergeFieldSchema: {}, status: 'draft' },
        { id: 'c', templateId: '1', version: 4, body: '', mergeFieldSchema: {}, status: 'published' },
      ],
    })).toBe(4);
  });
});
