import { afterEach, describe, expect, it, vi } from 'vitest';
import { reverseGeocodeLabel } from './reverse-geocode';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('reverseGeocodeLabel', () => {
  it('returns city from BigDataCloud response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          city: 'Karachi',
          locality: 'Clifton',
          principalSubdivision: 'Sindh',
        }),
      }),
    );
    await expect(reverseGeocodeLabel(24.86, 67.0)).resolves.toBe('Karachi');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.bigdatacloud.net/data/reverse-geocode-client'),
    );
  });

  it('returns null on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    await expect(reverseGeocodeLabel(0, 0)).resolves.toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    await expect(reverseGeocodeLabel(0, 0)).resolves.toBeNull();
  });
});
