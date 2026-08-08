import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreatePolicyDto,
  CreatePolicyVersionDto,
  PublishPolicyDto,
} from './dto/policy.dto';
import { PolicyService } from './policy.service';

const PEOPLE_OPS_ROLES = [
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const WORKER_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.CONTRACTOR,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('policies')
@Controller({ path: 'policies', version: '1' })
@UseGuards(AuthGuard)
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get('pending-acknowledgements')
  @Roles(...WORKER_ROLES)
  @ApiOperation({
    summary: 'List pending policy acknowledgements for current worker',
  })
  getPending(@CurrentUserSession() session: CurrentUserSession) {
    return this.policyService.getPendingAcknowledgements(session.user.id);
  }

  @Get('compliance-dashboard')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({
    summary: 'Policy acknowledgement compliance dashboard (People Ops)',
  })
  getComplianceDashboard() {
    return this.policyService.getComplianceDashboard();
  }

  @Get()
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'List policies' })
  list() {
    return this.policyService.list();
  }

  @Post()
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Create policy with optional population rules' })
  create(
    @Body() dto: CreatePolicyDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.policyService.create(
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/versions')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Create a draft policy version' })
  createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePolicyVersionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.policyService.createVersion(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/publish')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({
    summary: 'Publish a policy version (immutable — archives prior published)',
  })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishPolicyDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.policyService.publish(
      id,
      dto,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':versionId/acknowledge')
  @Roles(...WORKER_ROLES)
  @ApiOperation({ summary: 'Acknowledge a published policy version' })
  acknowledge(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.policyService.acknowledge(
      versionId,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }
}
