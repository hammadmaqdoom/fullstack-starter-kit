import { Public } from '@/decorators/public.decorator';
import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { EntraStrategy } from './entra.strategy';

@ApiTags('auth')
@Controller({ path: 'auth/entra', version: '1' })
export class EntraAuthController {
  constructor(private readonly entraStrategy: EntraStrategy) {}

  @Public()
  @Get('login')
  @ApiOperation({ summary: 'Start Microsoft Entra OIDC sign-in for employees' })
  async login(
    @Query('redirect') redirect: string | undefined,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const callbackURL = redirect ?? '/dashboard';
    const location = await this.entraStrategy.getSignInRedirectUrl(callbackURL);
    reply.redirect(location, HttpStatus.FOUND);
  }

  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'Microsoft Entra OIDC callback' })
  async callback(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const authResponse = await this.entraStrategy.handleCallback(request);

    authResponse.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    const location = authResponse.headers.get('location');
    if (location) {
      reply.redirect(location, authResponse.status as 302 | 303 | 307);
      return;
    }

    const body = await authResponse.text();
    reply.status(authResponse.status).send(body || null);
  }
}
