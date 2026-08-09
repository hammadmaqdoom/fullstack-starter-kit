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
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  CreateHolidayAdminDto,
  CreateHolidayCalendarAdminDto,
  CreateLeaveTypeAdminDto,
  UpdateHolidayAdminDto,
  UpdateHolidayCalendarAdminDto,
  UpdateLeaveTypeAdminDto,
} from './dto/leave-admin.dto';
import { LeaveAdminService } from './leave-admin.service';

const ADMIN_ROLES = [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN];

@ApiTags('leave-admin')
@Controller({ path: 'leave/admin', version: '1' })
@UseGuards(AuthGuard)
export class LeaveAdminController {
  constructor(private readonly leaveAdminService: LeaveAdminService) {}

  @Get('types')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'List all leave types for tenant' })
  listTypes(@CurrentUserSession() session: CurrentUserSession) {
    return this.leaveAdminService.listLeaveTypes(resolveTenantId(session));
  }

  @Post('types')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Create leave type' })
  createType(
    @Body() dto: CreateLeaveTypeAdminDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.leaveAdminService.createLeaveType(
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Patch('types/:id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update leave type' })
  updateType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveTypeAdminDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.leaveAdminService.updateLeaveType(
      id,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Get('holiday-calendars')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'List holiday calendars with holidays' })
  listCalendars(@CurrentUserSession() session: CurrentUserSession) {
    return this.leaveAdminService.listHolidayCalendars(
      resolveTenantId(session),
    );
  }

  @Post('holiday-calendars')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Create holiday calendar' })
  createCalendar(
    @Body() dto: CreateHolidayCalendarAdminDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.leaveAdminService.createHolidayCalendar(
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Patch('holiday-calendars/:id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update holiday calendar' })
  updateCalendar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHolidayCalendarAdminDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.leaveAdminService.updateHolidayCalendar(
      id,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Post('holiday-calendars/:id/holidays')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Add holiday to calendar' })
  createHoliday(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateHolidayAdminDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.leaveAdminService.createHoliday(
      id,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }

  @Patch('holidays/:id')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update holiday' })
  updateHoliday(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHolidayAdminDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.leaveAdminService.updateHoliday(
      id,
      dto,
      session.user.id,
      resolveTenantId(session),
      correlationId,
      request?.ip,
    );
  }
}
