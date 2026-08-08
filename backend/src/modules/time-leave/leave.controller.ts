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
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreateLeaveRequestDto,
  QueryLeaveRequestsDto,
  QueryTeamCalendarDto,
  RejectLeaveRequestDto,
} from './dto/leave.dto';
import { LeaveService } from './leave.service';

const LEAVE_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.SUPER_ADMIN,
];

const APPROVER_ROLES = [
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('leave')
@Controller({ path: 'leave', version: '1' })
@UseGuards(AuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

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

  @Get('types')
  @Roles(...LEAVE_ROLES)
  @ApiOperation({ summary: 'List leave types (country-filtered)' })
  listTypes(@CurrentUserSession() session: CurrentUserSession) {
    return this.leaveService.listTypes(session.user.id);
  }

  @Get('balances')
  @Roles(...LEAVE_ROLES)
  @ApiOperation({ summary: 'List leave balances' })
  listBalances(
    @CurrentUserSession() session: CurrentUserSession,
    @Query('workerId') workerId?: string,
  ) {
    return this.leaveService.listBalances(session.user.id, workerId);
  }

  @Get('requests')
  @Roles(...LEAVE_ROLES)
  @ApiOperation({ summary: 'List leave requests (scoped)' })
  listRequests(
    @Query() query: QueryLeaveRequestsDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.leaveService.listRequests(query, session.user.id);
  }

  @Post('requests')
  @Roles(...LEAVE_ROLES)
  @ApiOperation({ summary: 'Create leave request' })
  createRequest(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.leaveService.createRequest(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('requests/:id')
  @Roles(...LEAVE_ROLES)
  @ApiOperation({ summary: 'Get leave request detail' })
  getRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.leaveService.getRequest(id, session.user.id);
  }

  @Post('requests/:id/approve')
  @Roles(...APPROVER_ROLES)
  @ApiOperation({ summary: 'Approve leave request' })
  approveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.leaveService.approveRequest(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Post('requests/:id/reject')
  @Roles(...APPROVER_ROLES)
  @ApiOperation({ summary: 'Reject leave request' })
  rejectRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectLeaveRequestDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.leaveService.rejectRequest(
      id,
      dto.reason,
      this.actor(session, correlationId, request),
    );
  }

  @Post('requests/:id/cancel')
  @Roles(...LEAVE_ROLES)
  @ApiOperation({ summary: 'Cancel leave request' })
  cancelRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.leaveService.cancelRequest(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Get('team-calendar')
  @Roles(...LEAVE_ROLES)
  @ApiOperation({ summary: 'Team leave calendar' })
  teamCalendar(
    @Query() query: QueryTeamCalendarDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.leaveService.teamCalendar(query, session.user.id);
  }
}
