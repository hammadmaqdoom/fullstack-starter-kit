import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { resolveTenantId } from '@/modules/compliance/tenant-context.util';
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
  ClearClearanceItemDto,
  InitiateSeparationDto,
} from './dto/onboarding.dto';
import { UpsertExitInterviewDto } from './dto/pre-boarding.dto';
import { ExitInterviewService } from './exit-interview.service';
import { SeparationService } from './separation.service';

const PEOPLE_OPS_ROLES = [
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const SEPARATION_READ_ROLES = [
  ...PEOPLE_OPS_ROLES,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.DIVISION_HEAD,
];

@ApiTags('separations')
@Controller({ path: 'separations', version: '1' })
@UseGuards(AuthGuard)
export class SeparationController {
  constructor(
    private readonly separationService: SeparationService,
    private readonly exitInterviewService: ExitInterviewService,
  ) {}

  private actor(
    session: CurrentUserSession,
    correlationId?: string,
    request?: FastifyRequest,
  ) {
    return {
      userId: session.user.id,
      tenantId: resolveTenantId(session),
      correlationId,
      ipAddress: request?.ip,
    };
  }

  @Get('board')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Separation clearance board by status' })
  getBoard(@CurrentUserSession() session: CurrentUserSession) {
    return this.separationService.getBoard(session.user.id);
  }

  @Post()
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Initiate separation with default clearance items' })
  initiate(
    @Body() dto: InitiateSeparationDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.separationService.initiate(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get(':id')
  @Roles(...SEPARATION_READ_ROLES)
  @ApiOperation({ summary: 'Get separation case with clearance items' })
  getSeparation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.separationService.getSeparation(id, session.user.id);
  }

  @Post(':id/clearance/:itemId/clear')
  @Roles(...SEPARATION_READ_ROLES)
  @ApiOperation({ summary: 'Clear or waive a clearance item' })
  clearItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ClearClearanceItemDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.separationService.clearItem(
      id,
      itemId,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get(':id/exit-interview')
  @Roles(...SEPARATION_READ_ROLES)
  @ApiOperation({
    summary: 'Get exit interview (People Ops full; managers redacted)',
  })
  getExitInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.exitInterviewService.get(id, session.user.id);
  }

  @Post(':id/exit-interview')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Create/update exit interview (People Ops only)' })
  upsertExitInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertExitInterviewDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.exitInterviewService.upsert(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}
