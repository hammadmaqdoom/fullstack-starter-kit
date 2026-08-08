import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
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
  CreateShiftRosterDto,
  PublishShiftAssignmentsDto,
  QueryShiftAssignmentsDto,
  QueryShiftRostersDto,
  UpdateShiftRosterDto,
} from './dto/shift-roster.dto';
import { ShiftRosterService } from './shift-roster.service';

const ROSTER_PUBLISHER_ROLES = [
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.SUPER_ADMIN,
];

const ROSTER_READER_ROLES = [
  ...ROSTER_PUBLISHER_ROLES,
  PolarisRoleCode.EMPLOYEE,
];

@ApiTags('shift-rosters')
@Controller({ path: 'shift-rosters', version: '1' })
@UseGuards(AuthGuard)
export class ShiftRosterController {
  constructor(private readonly shiftRosterService: ShiftRosterService) {}

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
  @Roles(...ROSTER_PUBLISHER_ROLES)
  @ApiOperation({ summary: 'List shift rosters (scoped)' })
  listRosters(
    @Query() query: QueryShiftRostersDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.shiftRosterService.listRosters(query, session.user.id);
  }

  @Post()
  @Roles(...ROSTER_PUBLISHER_ROLES)
  @ApiOperation({ summary: 'Create shift roster' })
  createRoster(
    @Body() dto: CreateShiftRosterDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.shiftRosterService.createRoster(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('assignments')
  @Roles(...ROSTER_READER_ROLES)
  @ApiOperation({ summary: 'List shift assignments by team/date range' })
  listAssignments(
    @Query() query: QueryShiftAssignmentsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.shiftRosterService.listAssignments(query, session.user.id);
  }

  @Get(':id')
  @Roles(...ROSTER_PUBLISHER_ROLES)
  @ApiOperation({ summary: 'Get shift roster detail' })
  getRoster(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.shiftRosterService.getRoster(id, session.user.id);
  }

  @Patch(':id')
  @Roles(...ROSTER_PUBLISHER_ROLES)
  @ApiOperation({ summary: 'Update shift roster' })
  updateRoster(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShiftRosterDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.shiftRosterService.updateRoster(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Delete(':id')
  @Roles(...ROSTER_PUBLISHER_ROLES)
  @ApiOperation({ summary: 'Delete shift roster (no assignments)' })
  deleteRoster(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.shiftRosterService.deleteRoster(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Post(':id/publish')
  @Roles(...ROSTER_PUBLISHER_ROLES)
  @ApiOperation({ summary: 'Publish shift assignments for a roster' })
  publishAssignments(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishShiftAssignmentsDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.shiftRosterService.publishAssignments(
      id,
      dto,
      this.actor(session, correlationId, request),
    );
  }
}
