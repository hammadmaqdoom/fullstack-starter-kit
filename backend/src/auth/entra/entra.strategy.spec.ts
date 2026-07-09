import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_INSTANCE_KEY } from '@/constants/auth.constant';
import { EntraStrategy } from './entra.strategy';

describe('EntraStrategy', () => {
  let strategy: EntraStrategy;
  const authHandler = jest.fn();

  beforeEach(async () => {
    authHandler.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntraStrategy,
        {
          provide: AUTH_INSTANCE_KEY,
          useValue: { handler: authHandler },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'auth.entra') {
                return {
                  clientId: 'entra-client',
                  clientSecret: 'entra-secret',
                  tenantId: 'tenant-id',
                };
              }
              return undefined;
            }),
            getOrThrow: jest.fn((key: string) => {
              if (key === 'app') {
                return {
                  url: 'http://localhost:8000',
                  corsOrigin: ['http://localhost:3000'],
                };
              }
              throw new Error(`Unexpected key ${key}`);
            }),
          },
        },
      ],
    }).compile();

    strategy = module.get(EntraStrategy);
  });

  it('returns Microsoft redirect URL from Better Auth social sign-in', async () => {
    authHandler.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: 'https://login.microsoftonline.com/mock' },
      }),
    );

    await expect(
      strategy.getSignInRedirectUrl('/dashboard'),
    ).resolves.toBe('https://login.microsoftonline.com/mock');
  });

  it('throws when Entra is not configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntraStrategy,
        {
          provide: AUTH_INSTANCE_KEY,
          useValue: { handler: authHandler },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => ({})),
            getOrThrow: jest.fn(() => ({
              url: 'http://localhost:8000',
              corsOrigin: ['http://localhost:3000'],
            })),
          },
        },
      ],
    }).compile();

    const unconfigured = module.get(EntraStrategy);
    await expect(
      unconfigured.getSignInRedirectUrl('/dashboard'),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
