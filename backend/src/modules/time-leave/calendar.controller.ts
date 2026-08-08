import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueryStaffCalendarDto } from './dto/leave.dto';
import { LeaveService } from './leave.service';

const CALENDAR_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('calendars')
@Controller({ path: 'calendars', version: '1' })
@UseGuards(AuthGuard)
export class CalendarController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get('staff')
  @Roles(...CALENDAR_ROLES)
  @ApiOperation({ summary: 'Staff calendar (holidays + leave overlay)' })
  staffCalendar(
    @Query() query: QueryStaffCalendarDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.leaveService.staffCalendar(query, session.user.id);
  }
}
