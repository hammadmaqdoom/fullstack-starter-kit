import { AUTH_INSTANCE_KEY } from '@/constants/auth.constant';
import { GlobalConfig } from '@/config/config.type';
import { resolveAuthBaseUrl } from '@/auth/utils/auth-base-url';
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Auth } from 'better-auth/auth';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class EntraStrategy {
  constructor(
    @Inject(AUTH_INSTANCE_KEY)
    private readonly auth: Auth,
    private readonly configService: ConfigService<GlobalConfig>,
  ) {}

  isConfigured(): boolean {
    const entra = this.configService.get('auth.entra', { infer: true });
    return Boolean(entra?.clientId && entra?.clientSecret);
  }

  async getSignInRedirectUrl(callbackURL: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'ENTRA_NOT_CONFIGURED',
        message: 'Microsoft Entra sign-in is not configured',
      });
    }

    const authBaseUrl = resolveAuthBaseUrl(
      this.configService.getOrThrow('app', { infer: true }),
    );
    const request = new Request(`${authBaseUrl}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'microsoft',
        callbackURL,
      }),
    });

    const response = await this.auth.handler(request);
    const location = response.headers.get('location');
    if (location) {
      return location;
    }

    const body = (await response.json().catch(() => null)) as {
      url?: string;
    } | null;
    if (body?.url) {
      return body.url;
    }

    throw new ServiceUnavailableException({
      code: 'ENTRA_SIGN_IN_FAILED',
      message: 'Unable to start Microsoft Entra sign-in',
    });
  }

  async handleCallback(request: FastifyRequest): Promise<Response> {
    const authBaseUrl = resolveAuthBaseUrl(
      this.configService.getOrThrow('app', { infer: true }),
    );
    const url = new URL(request.url, authBaseUrl);
    url.pathname = '/api/auth/callback/microsoft';

    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === 'string') {
        headers.append(key, value);
      } else if (Array.isArray(value)) {
        for (const entry of value) {
          headers.append(key, entry);
        }
      }
    }

    return this.auth.handler(
      new Request(url.toString(), {
        method: 'GET',
        headers,
      }),
    );
  }
}
