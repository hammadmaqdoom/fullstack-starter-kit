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
import { AttendanceService } from './attendance.service';
import {
  CheckInDto,
  CheckOutDto,
  CreatePunchCorrectionDto,
  QueryPunchesDto,
  QueryTodayAttendanceDto,
  RejectPunchCorrectionDto,
} from './dto/attendance.dto';

const ATTENDANCE_ROLES = [
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

@ApiTags('attendance')
@Controller({ path: 'attendance', version: '1' })
@UseGuards(AuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

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

  @Post('punches/check-in')
  @Roles(...ATTENDANCE_ROLES)
  @ApiOperation({ summary: 'One-tap check-in' })
  checkIn(
    @Body() dto: CheckInDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.attendanceService.checkIn(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('punches/check-out')
  @Roles(...ATTENDANCE_ROLES)
  @ApiOperation({ summary: 'One-tap check-out' })
  checkOut(
    @Body() dto: CheckOutDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.attendanceService.checkOut(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Get('punches/today')
  @Roles(...ATTENDANCE_ROLES)
  @ApiOperation({ summary: "Today's attendance status" })
  getToday(
    @Query() query: QueryTodayAttendanceDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.attendanceService.getToday(
      session.user.id,
      DIGITARO_TENANT_ID,
      query.timezone,
    );
  }

  @Get('punches')
  @Roles(...ATTENDANCE_ROLES)
  @ApiOperation({ summary: 'Punch history (scoped, paginated)' })
  listPunches(
    @Query() query: QueryPunchesDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.attendanceService.listPunches(query, session.user.id);
  }

  @Post('punch-corrections')
  @Roles(...ATTENDANCE_ROLES)
  @ApiOperation({ summary: 'Request a punch correction' })
  createCorrection(
    @Body() dto: CreatePunchCorrectionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.attendanceService.createCorrection(
      dto,
      this.actor(session, correlationId, request),
    );
  }

  @Post('punch-corrections/:id/approve')
  @Roles(...APPROVER_ROLES)
  @ApiOperation({ summary: 'Approve punch correction' })
  approveCorrection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.attendanceService.approveCorrection(
      id,
      this.actor(session, correlationId, request),
    );
  }

  @Post('punch-corrections/:id/reject')
  @Roles(...APPROVER_ROLES)
  @ApiOperation({ summary: 'Reject punch correction' })
  rejectCorrection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPunchCorrectionDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.attendanceService.rejectCorrection(
      id,
      dto.reason,
      this.actor(session, correlationId, request),
    );
  }
}
