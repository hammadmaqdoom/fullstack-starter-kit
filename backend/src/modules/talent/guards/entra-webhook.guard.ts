import { GlobalConfig } from '@/config/config.type';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';

export const ENTRA_WEBHOOK_SECRET_HEADER = 'x-entra-webhook-secret';

/**
 * FLW-SEC-006 — Entra Graph → Polaris lifecycle webhook. Authenticated by a
 * shared secret header, never a Better Auth session: this endpoint is
 * invoked server-to-server (Azure Function/Logic App relaying Graph change
 * notifications), not by a browser session.
 */
@Injectable()
export class EntraWebhookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<GlobalConfig>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const configuredSecret = this.configService.get('entraWebhook', {
      infer: true,
    })?.secret;

    if (!configuredSecret) {
      throw new UnauthorizedException({
        code: 'ENTRA_WEBHOOK_NOT_CONFIGURED',
        message: 'Entra webhook secret is not configured',
      });
    }

    const providedSecret = request.headers[ENTRA_WEBHOOK_SECRET_HEADER];
    if (providedSecret !== configuredSecret) {
      throw new UnauthorizedException({
        code: 'ENTRA_WEBHOOK_UNAUTHORIZED',
        message: 'Invalid or missing webhook secret',
      });
    }

    return true;
  }
}
