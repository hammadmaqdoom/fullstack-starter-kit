import { AUTH_INSTANCE_KEY } from '@/constants/auth.constant';
import { resolveAuthBaseUrl } from '@/auth/utils/auth-base-url';
import { GlobalConfig } from '@/config/config.type';
import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Auth } from 'better-auth/auth';
import type { FastifyRequest } from 'fastify';
import { ContractorLoginDto } from './dto/contractor-login.dto';
import { ContractorMagicLinkDto } from './dto/contractor-magic-link.dto';

@Injectable()
export class ContractorAuthService {
  constructor(
    @Inject(AUTH_INSTANCE_KEY)
    private readonly auth: Auth,
    private readonly configService: ConfigService<GlobalConfig>,
  ) {}

  async signInWithEmail(
    dto: ContractorLoginDto,
    request: FastifyRequest,
  ): Promise<{ token: string | null }> {
    const authBaseUrl = resolveAuthBaseUrl(
      this.configService.getOrThrow('app', { infer: true }),
    );

    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (request.headers.cookie) {
      headers.append('Cookie', request.headers.cookie);
    }

    const response = await this.auth.handler(
      new Request(`${authBaseUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: dto.email,
          password: dto.password,
        }),
      }),
    );

    const body = (await response.json().catch(() => null)) as {
      token?: string;
      message?: string;
    } | null;

    if (!response.ok) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: body?.message ?? 'Invalid email or password',
      });
    }

    return { token: body?.token ?? null };
  }

  async sendMagicLink(dto: ContractorMagicLinkDto): Promise<{ sent: true }> {
    const authBaseUrl = resolveAuthBaseUrl(
      this.configService.getOrThrow('app', { infer: true }),
    );
    const callbackURL = dto.callbackURL ?? '/dashboard';

    const response = await this.auth.handler(
      new Request(`${authBaseUrl}/api/auth/sign-in/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dto.email,
          callbackURL,
        }),
      }),
    );

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      throw new UnauthorizedException({
        code: 'MAGIC_LINK_FAILED',
        message: body?.message ?? 'Unable to send magic link',
      });
    }

    return { sent: true };
  }
}
