import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { resolveTenantId } from '@/modules/compliance/tenant-context.util';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
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
import { ApprovalDelegationService } from './approval-delegation.service';
import {
  CreateApprovalDelegationDto,
  UpdateApprovalDelegationDto,
} from './dto/approval-delegation.dto';

@ApiTags('org')
@Controller({ path: 'org/approval-delegations', version: '1' })
@UseGuards(AuthGuard)
export class ApprovalDelegationController {
  constructor(
    private readonly approvalDelegationService: ApprovalDelegationService,
  ) {}

  @Get()
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.DIVISION_HEAD,
  )
  @ApiOperation({ summary: 'List approval delegations (scoped)' })
  async list(
    @Query('delegatorWorkerId') delegatorWorkerId: string | undefined,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.approvalDelegationService.list(
      session.user.id,
      delegatorWorkerId,
      resolveTenantId(session),
    );
  }

  @Post()
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
  )
  @ApiOperation({ summary: 'Create approval delegation' })
  async create(
    @Body() dto: CreateApprovalDelegationDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.approvalDelegationService.create(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
      resolveTenantId(session),
    );
  }

  @Patch(':id')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
  )
  @ApiOperation({ summary: 'Update approval delegation' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApprovalDelegationDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.approvalDelegationService.update(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
      resolveTenantId(session),
    );
  }

  @Delete(':id')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete approval delegation' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    await this.approvalDelegationService.remove(
      id,
      session.user.id,
      correlationId,
      request?.ip,
      resolveTenantId(session),
    );
  }
}
