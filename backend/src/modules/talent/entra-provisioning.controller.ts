import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import {
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
import { EntraProvisioningService } from './entra-provisioning.service';

const ENTRA_ROLES = [
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
  PolarisRoleCode.IT_ADMIN,
];

@ApiTags('entra-provisioning')
@Controller({ path: 'entra-provisioning-jobs', version: '1' })
@UseGuards(AuthGuard)
export class EntraProvisioningController {
  constructor(
    private readonly entraProvisioningService: EntraProvisioningService,
  ) {}

  private actor(
    session: CurrentUserSession,
    correlationId?: string,
    request?: FastifyRequest,
  ) {
    return {
      userId: session.user.id,
      tenantId: DIGITARO_TENANT_ID,
      correlationId,
      ipAddress: request?.ip,
    };
  }

  @Get()
  @Roles(...ENTRA_ROLES)
  @ApiOperation({ summary: 'List Entra provisioning jobs (FLW-SEC-006)' })
  list(@CurrentUserSession() session: CurrentUserSession) {
    return this.entraProvisioningService.listJobs(session.user.id);
  }

  @Post(':id/retry')
  @Roles(...ENTRA_ROLES)
  @ApiOperation({ summary: 'Retry failed Graph provisioning job' })
  retry(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.entraProvisioningService.retry(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Post(':id/complete-manual')
  @Roles(...ENTRA_ROLES)
  @ApiOperation({ summary: 'Mark job as manually provisioned' })
  completeManual(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.entraProvisioningService.completeManual(
      id,
      this.actor(session, correlationId, request),
    );
  }
}
