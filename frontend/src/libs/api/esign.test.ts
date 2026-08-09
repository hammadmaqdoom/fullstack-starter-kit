import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/libs/Env', () => ({
  Env: { NEXT_PUBLIC_BACKEND_URL: 'http://localhost:8000' },
}));

import { listPendingEnvelopes } from './esign';

describe('listPendingEnvelopes', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads pending envelopes from GET /api/v1/esign/envelopes without hub type filter', async () => {
    const envelopes = [
      {
        id: 'env-1',
        title: 'Offer letter',
        status: 'sent',
        documentBlobUrl: null,
        signatories: [],
        completedAt: null,
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ];

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: envelopes, meta: {}, errors: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await listPendingEnvelopes();

    expect(result.data).toEqual(envelopes);
    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = String(vi.mocked(fetch).mock.calls[0]?.[0]);
    expect(calledUrl).toContain('/api/v1/esign/envelopes');
    expect(calledUrl).not.toContain('type=esign');
    expect(calledUrl).not.toContain('/api/v1/hub');
  });
});
