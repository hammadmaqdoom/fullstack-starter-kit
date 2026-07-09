import {
  CanActivate,
  ContextType,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  POLARIS_AUTH_CONTEXT_KEY,
  REQUIRED_ROLES_KEY,
  REQUIRED_SCOPE_KEY,
} from '@/constants/rbac.constant';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { RowScopeService } from '@/shared/scope/row-scope.service';
import type { FastifyRequest } from 'fastify';
import type { UserSession } from '../auth.type';

type PolarisRequest = FastifyRequest & {
  session?: UserSession | null;
  [POLARIS_AUTH_CONTEXT_KEY]?: Awaited<
    ReturnType<RbacService['getAuthContext']>
  >;
};

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
    private readonly rowScopeService: RowScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredScope = this.reflector.getAllAndOverride<ScopeType>(
      REQUIRED_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length && !requiredScope) {
      return true;
    }

    const request = this.getRequest(context);
    const userId = request.session?.user?.id;

    if (!userId) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const authContext = await this.rbacService.getAuthContext(userId);
    request[POLARIS_AUTH_CONTEXT_KEY] = authContext;

    if (
      requiredRoles?.length &&
      !requiredRoles.some((role) =>
        authContext.roleCodes
          .map((code) => code.toLowerCase())
          .includes(role.toLowerCase()),
      )
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient role permissions',
      });
    }

    if (
      requiredScope &&
      !this.rowScopeService.meetsMinimumScope(authContext, requiredScope)
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient row-level scope',
      });
    }

    return true;
  }

  private getRequest(context: ExecutionContext): PolarisRequest {
    const contextType: ContextType & 'graphql' = context.getType();

    if (contextType === 'graphql') {
      return GqlExecutionContext.create(context).getContext()?.req;
    }

    return context.switchToHttp().getRequest<PolarisRequest>();
  }
}
