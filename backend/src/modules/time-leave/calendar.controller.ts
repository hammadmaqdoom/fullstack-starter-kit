import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { QueryCalendarRangeDto } from './dto/calendar.dto';
import { QueryStaffCalendarDto } from './dto/leave.dto';
import { LeaveService } from './leave.service';

const CALENDAR_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.SUPER_ADMIN,
];

const TEAM_CALENDAR_ROLES = [
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('calendars')
@Controller({ path: 'calendars', version: '1' })
@UseGuards(AuthGuard)
export class CalendarController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly calendarService: CalendarService,
  ) {}

  @Get('me')
  @Roles(...CALENDAR_ROLES)
  @ApiOperation({ summary: 'Own staff calendar with attendance heatmap cells' })
  me(
    @Query() query: QueryCalendarRangeDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.calendarService.getMyCalendar(query, session.user.id);
  }

  @Get('team')
  @Roles(...TEAM_CALENDAR_ROLES)
  @ApiOperation({ summary: 'Team calendar heatmap (leave + attendance)' })
  team(
    @Query() query: QueryCalendarRangeDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.calendarService.getTeamCalendar(query, session.user.id);
  }

  @Get('staff')
  @Roles(...CALENDAR_ROLES)
  @ApiOperation({
    summary: 'Staff calendar (holidays + leave overlay) — legacy',
    deprecated: true,
  })
  staffCalendar(
    @Query() query: QueryStaffCalendarDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.leaveService.staffCalendar(query, session.user.id);
  }

  @Get('staff/:workerId')
  @Roles(...CALENDAR_ROLES)
  @ApiOperation({ summary: 'Staff calendar for a worker (RBAC scoped)' })
  staffById(
    @Param('workerId') workerId: string,
    @Query() query: QueryCalendarRangeDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.calendarService.getStaffCalendar(
      workerId,
      query,
      session.user.id,
    );
  }
}
