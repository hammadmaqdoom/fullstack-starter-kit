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
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreateManpowerPlanDto,
  CreateManpowerPositionDto,
  UpdateManpowerPlanDto,
  UpdateManpowerPositionDto,
} from './dto/manpower.dto';
import { ManpowerService } from './manpower.service';

const MANPOWER_VIEW_ROLES = [
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('talent-manpower')
@Controller({ path: 'talent/manpower', version: '1' })
@UseGuards(AuthGuard)
export class ManpowerController {
  constructor(private readonly manpowerService: ManpowerService) {}

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

  @Get('plans')
  @Roles(...MANPOWER_VIEW_ROLES)
  @ApiOperation({ summary: 'List manpower plans' })
  listPlans() {
    return this.manpowerService.listPlans();
  }

  @Get('plans/:id')
  @Roles(...MANPOWER_VIEW_ROLES)
  @ApiOperation({ summary: 'Get a manpower plan' })
  getPlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.manpowerService.getPlan(id);
  }

  @Post('plans')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a manpower plan' })
  createPlan(
    @Body() dto: CreateManpowerPlanDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.manpowerService.createPlan(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('plans/:id')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a manpower plan' })
  updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateManpowerPlanDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.manpowerService.updatePlan(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('plans/:planId/positions')
  @Roles(...MANPOWER_VIEW_ROLES)
  @ApiOperation({ summary: 'List positions for a manpower plan' })
  listPositions(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.manpowerService.listPositions(planId);
  }

  @Post('plans/:planId/positions')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a position to a manpower plan' })
  createPosition(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CreateManpowerPositionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.manpowerService.createPosition(
      planId,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Patch('positions/:id')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a manpower position' })
  updatePosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateManpowerPositionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.manpowerService.updatePosition(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}
