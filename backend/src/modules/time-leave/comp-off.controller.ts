import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CompOffService } from './comp-off.service';
import {
  CreateCompOffCreditDto,
  QueryCompOffCreditsDto,
} from './dto/comp-off.dto';

const COMP_OFF_VIEW_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.SUPER_ADMIN,
];

const COMP_OFF_GRANT_ROLES = [
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('comp-off')
@Controller({ path: 'time-leave/comp-off', version: '1' })
@UseGuards(AuthGuard)
export class CompOffController {
  constructor(private readonly compOffService: CompOffService) {}

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

  @Post('credits')
  @Roles(...COMP_OFF_GRANT_ROLES)
  @ApiOperation({ summary: 'Grant comp-off credit to a worker' })
  grantCredit(
    @Body() dto: CreateCompOffCreditDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.compOffService.grantCredit(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('credits')
  @Roles(...COMP_OFF_VIEW_ROLES)
  @ApiOperation({ summary: 'List comp-off credits (scoped)' })
  listCredits(
    @Query() query: QueryCompOffCreditsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.compOffService.listCredits(session.user.id, query.workerId);
  }

  @Get('balance')
  @Roles(...COMP_OFF_VIEW_ROLES)
  @ApiOperation({ summary: 'Get comp-off balance summary for a worker' })
  getBalance(
    @Query() query: QueryCompOffCreditsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.compOffService.getBalance(session.user.id, query.workerId);
  }
}
