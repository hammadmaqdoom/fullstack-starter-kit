import type {
  CanActivate,
  ContextType,
  ExecutionContext,
} from '@nestjs/common';
import {
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Socket } from 'socket.io';

import { IS_PUBLIC } from '@/constants/app.constant';
import {
  AUTH_INSTANCE_KEY,
  IS_OPTIONAL_AUTH,
  IS_PUBLIC_AUTH,
} from '@/constants/auth.constant';
import type { Auth } from 'better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { FastifyRequest } from 'fastify';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    /** Optional so the worker process can boot queue modules that register HTTP controllers. */
    @Optional()
    @Inject(AUTH_INSTANCE_KEY)
    private readonly auth: Auth | null,
  ) {}

  /**
   * Validates if the current request is authenticated for all REST, GraphQL & Websockets
   * Attaches session and user information to the request object
   * @param context - The execution context of the current request
   * @returns True if the request is authorized to proceed, throws an error otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_AUTH, [
        context.getHandler(),
        context.getClass(),
      ]) ||
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (isPublic) return true;

    if (!this.auth) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
      });
    }

    const contextType: ContextType & 'graphql' = context.getType();

    if (contextType === 'ws') {
      const socket = context.switchToWs().getClient<Socket>();
      try {
        const session = await this.auth.api.getSession({
          headers: fromNodeHeaders(socket?.handshake?.headers),
        });
        socket['session'] = session;
      } catch (_) {
        socket.disconnect();
        return false;
      }
      return true;
    }

    let request: FastifyRequest;

    if (contextType === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      request = gqlCtx.getContext()?.req;
    } else {
      request = context.switchToHttp().getRequest();
    }

    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(request?.headers),
    });

    request['session'] = session;
    request['user'] = session?.user ?? null; // For Sentry

    const isAuthOptional = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH,
      [context.getHandler(), context.getClass()],
    );

    if (isAuthOptional && !session) return true;

    if (!session) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
      });
    }

    return true;
  }
}
