import { of, lastValueFrom } from 'rxjs';
import { ApiEnvelopeInterceptor } from './api-envelope.interceptor';

describe('ApiEnvelopeInterceptor', () => {
  const interceptor = new ApiEnvelopeInterceptor();

  const createContext = (url: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ url }),
      }),
    }) as Parameters<ApiEnvelopeInterceptor['intercept']>[0];

  it('wraps data in { data, meta, errors }', async () => {
    const ctx = createContext('/api/v1/workers');
    const next = { handle: () => of({ id: '1' }) };
    const result = await lastValueFrom(interceptor.intercept(ctx, next));
    expect(result).toEqual({ data: { id: '1' }, meta: {}, errors: [] });
  });

  it('passes through already-enveloped responses', async () => {
    const enveloped = { data: { id: '1' }, meta: { page: 1 }, errors: [] };
    const ctx = createContext('/api/v1/workers');
    const next = { handle: () => of(enveloped) };
    const result = await lastValueFrom(interceptor.intercept(ctx, next));
    expect(result).toEqual(enveloped);
  });

  it('maps paginated service results to envelope meta', async () => {
    const ctx = createContext('/api/v1/workers');
    const next = {
      handle: () =>
        of({
          items: [{ id: '1' }],
          meta: { page: 1, limit: 25, total: 1, totalPages: 1 },
        }),
    };
    const result = await lastValueFrom(interceptor.intercept(ctx, next));
    expect(result).toEqual({
      data: [{ id: '1' }],
      meta: { page: 1, limit: 25, total: 1, totalPages: 1 },
      errors: [],
    });
  });

  it('does not wrap non-v1 routes', async () => {
    const ctx = createContext('/api/health');
    const next = { handle: () => of({ status: 'ok' }) };
    const result = await lastValueFrom(interceptor.intercept(ctx, next));
    expect(result).toEqual({ status: 'ok' });
  });
});
