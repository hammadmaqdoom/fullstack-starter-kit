import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreateUserRoleAssignmentDto,
  QueryUserRoleAssignmentsDto,
  UpdateUserRoleAssignmentDto,
} from './dto/role-assignment.dto';
import { PolarisRoleCode } from './enums/polaris-role-code.enum';
import { RoleAssignmentService } from './role-assignment.service';
import { resolveTenantId } from './tenant-context.util';

const READ_ROLES = [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN];
const WRITE_ROLES = [PolarisRoleCode.SUPER_ADMIN];

@ApiTags('roles')
@Controller({ path: 'roles', version: '1' })
@UseGuards(AuthGuard)
export class RolesController {
  constructor(private readonly roleAssignmentService: RoleAssignmentService) {}

  @Get()
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List tenant roles' })
  listRoles(@CurrentUserSession() session: CurrentUserSession) {
    return this.roleAssignmentService.listRoles(resolveTenantId(session));
  }
}

@ApiTags('user-roles')
@Controller({ path: 'user-roles', version: '1' })
@UseGuards(AuthGuard)
export class UserRolesController {
  constructor(private readonly roleAssignmentService: RoleAssignmentService) {}

  @Get()
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List role assignments' })
  list(
    @Query() query: QueryUserRoleAssignmentsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.roleAssignmentService.listAssignments(
      resolveTenantId(session),
      query,
    );
  }

  @Get('assignable-users')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'List workers with linked auth users' })
  listAssignableUsers(@CurrentUserSession() session: CurrentUserSession) {
    return this.roleAssignmentService.listAssignableUsers(
      resolveTenantId(session),
    );
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Assign a role to a user' })
  create(
    @Body() dto: CreateUserRoleAssignmentDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.roleAssignmentService.createAssignment(
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Update role assignment dating / scope' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleAssignmentDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.roleAssignmentService.updateAssignment(
      id,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Revoke role assignment (sets effectiveTo = today)' })
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.roleAssignmentService.revokeAssignment(
      id,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }
}
