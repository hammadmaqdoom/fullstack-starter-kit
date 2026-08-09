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
  CreatePreBoardingPacketDto,
  UpsertPreBoardingFieldDto,
} from './dto/pre-boarding.dto';
import { PreBoardingService } from './pre-boarding.service';

const PEOPLE_OPS_ROLES = [
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('pre-boarding')
@Controller({ path: 'pre-boarding', version: '1' })
@UseGuards(AuthGuard)
export class PreBoardingController {
  constructor(private readonly preBoardingService: PreBoardingService) {}

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

  @Get()
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'List pre-boarding packets (board view)' })
  list(@CurrentUserSession() session: CurrentUserSession) {
    return this.preBoardingService.listPackets(session.user.id);
  }

  @Post()
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Create pre-boarding packet (FLW-TAL-006)' })
  create(
    @Body() dto: CreatePreBoardingPacketDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.preBoardingService.createPacket(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get(':id')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Get pre-boarding packet detail' })
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.preBoardingService.getPacket(id, session.user.id);
  }

  @Post(':id/invite')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Invite candidate via magic link email' })
  invite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.preBoardingService.invite(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Post(':id/fields')
  @Roles(...PEOPLE_OPS_ROLES)
  @ApiOperation({ summary: 'Upsert pre-boarding field value' })
  upsertField(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertPreBoardingFieldDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.preBoardingService.upsertField(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}
