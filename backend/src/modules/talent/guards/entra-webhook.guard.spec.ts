import { GlobalConfig } from '@/config/config.type';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ENTRA_WEBHOOK_SECRET_HEADER,
  EntraWebhookGuard,
} from './entra-webhook.guard';

describe('EntraWebhookGuard', () => {
  let guard: EntraWebhookGuard;
  let configService: jest.Mocked<Pick<ConfigService<GlobalConfig>, 'get'>>;

  const createContext = (headers: Record<string, string>) => {
    const request = { headers };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    configService = { get: jest.fn() };
    guard = new EntraWebhookGuard(
      configService as unknown as ConfigService<GlobalConfig>,
    );
  });

  it('throws when no webhook secret is configured', () => {
    configService.get.mockReturnValue({ secret: undefined });

    expect(() =>
      guard.canActivate(createContext({ [ENTRA_WEBHOOK_SECRET_HEADER]: 'x' })),
    ).toThrow(UnauthorizedException);
  });

  it('throws when the provided secret does not match', () => {
    configService.get.mockReturnValue({ secret: 'correct-secret' });

    expect(() =>
      guard.canActivate(
        createContext({ [ENTRA_WEBHOOK_SECRET_HEADER]: 'wrong-secret' }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('allows requests with the matching secret header', () => {
    configService.get.mockReturnValue({ secret: 'correct-secret' });

    expect(
      guard.canActivate(
        createContext({ [ENTRA_WEBHOOK_SECRET_HEADER]: 'correct-secret' }),
      ),
    ).toBe(true);
  });
});
