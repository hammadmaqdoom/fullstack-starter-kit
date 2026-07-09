import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRED_ROLES_KEY,
  REQUIRED_SCOPE_KEY,
} from '@/constants/rbac.constant';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { RowScopeService } from '@/shared/scope/row-scope.service';
import { RbacGuard } from './rbac.guard';

describe('RbacGuard', () => {
  let guard: RbacGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let rbacService: jest.Mocked<Pick<RbacService, 'getAuthContext'>>;
  let rowScopeService: RowScopeService;

  const createContext = (session?: { user: { id: string } } | null) => {
    const request = { session, url: '/api/v1/workers' };
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    rbacService = {
      getAuthContext: jest.fn(),
    };
    rowScopeService = new RowScopeService();
    guard = new RbacGuard(
      reflector as unknown as Reflector,
      rbacService as unknown as RbacService,
      rowScopeService,
    );
  });

  it('allows requests without role or scope metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(rbacService.getAuthContext).not.toHaveBeenCalled();
  });

  it('requires authentication when role metadata is present', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === REQUIRED_ROLES_KEY) {
        return [PolarisRoleCode.MANAGER];
      }
      return undefined;
    });

    await expect(guard.canActivate(createContext(null))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('denies access when required role is missing', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === REQUIRED_ROLES_KEY) {
        return [PolarisRoleCode.FINANCE];
      }
      return undefined;
    });
    rbacService.getAuthContext.mockResolvedValue({
      tenantId: 'tenant-1',
      userId: 'user-1',
      roleCodes: [PolarisRoleCode.EMPLOYEE],
      assignments: [],
      broadestScope: ScopeType.OWN,
    });

    await expect(
      guard.canActivate(createContext({ user: { id: 'user-1' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows access when required role is present', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === REQUIRED_ROLES_KEY) {
        return [PolarisRoleCode.MANAGER];
      }
      return undefined;
    });
    rbacService.getAuthContext.mockResolvedValue({
      tenantId: 'tenant-1',
      userId: 'user-1',
      roleCodes: [PolarisRoleCode.MANAGER],
      assignments: [
        {
          roleId: 'role-1',
          roleCode: PolarisRoleCode.MANAGER,
          scopeType: ScopeType.TEAM,
          scopeId: null,
        },
      ],
      broadestScope: ScopeType.TEAM,
    });

    await expect(
      guard.canActivate(createContext({ user: { id: 'user-1' } })),
    ).resolves.toBe(true);
  });

  it('denies access when minimum scope is not met', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === REQUIRED_SCOPE_KEY) {
        return ScopeType.ALL;
      }
      return undefined;
    });
    rbacService.getAuthContext.mockResolvedValue({
      tenantId: 'tenant-1',
      userId: 'user-1',
      roleCodes: [PolarisRoleCode.MANAGER],
      assignments: [
        {
          roleId: 'role-1',
          roleCode: PolarisRoleCode.MANAGER,
          scopeType: ScopeType.TEAM,
          scopeId: null,
        },
      ],
      broadestScope: ScopeType.TEAM,
    });

    await expect(
      guard.canActivate(createContext({ user: { id: 'user-1' } })),
    ).rejects.toThrow(ForbiddenException);
  });
});
