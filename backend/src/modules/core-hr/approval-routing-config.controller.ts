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
import { ApprovalRoutingConfigService } from './approval-routing-config.service';
import {
  CreateApprovalRoutingConfigDto,
  UpdateApprovalRoutingConfigDto,
} from './dto/approval-routing-config.dto';
import { ApprovalWorkflowType } from './enums/approval-routing.enum';

@ApiTags('org')
@Controller({ path: 'org/approval-routing-configs', version: '1' })
@UseGuards(AuthGuard)
export class ApprovalRoutingConfigController {
  constructor(
    private readonly approvalRoutingConfigService: ApprovalRoutingConfigService,
  ) {}

  @Get()
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.FINANCE,
    PolarisRoleCode.HRBP,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'List approval routing config tiers' })
  async list(
    @CurrentUserSession() session: CurrentUserSession,
    @Query('workflowType') workflowType?: ApprovalWorkflowType,
  ) {
    return this.approvalRoutingConfigService.list(
      workflowType,
      resolveTenantId(session),
    );
  }

  @Post()
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create an approval routing config tier' })
  async create(
    @Body() dto: CreateApprovalRoutingConfigDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.approvalRoutingConfigService.create(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
      resolveTenantId(session),
    );
  }

  @Patch(':id')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update an approval routing config tier' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApprovalRoutingConfigDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.approvalRoutingConfigService.update(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
      resolveTenantId(session),
    );
  }

  @Delete(':id')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an approval routing config tier' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    await this.approvalRoutingConfigService.remove(
      id,
      session.user.id,
      correlationId,
      request?.ip,
      resolveTenantId(session),
    );
  }
}
