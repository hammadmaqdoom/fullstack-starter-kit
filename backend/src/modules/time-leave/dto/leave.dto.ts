import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import {
  EnumFieldOptional,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
  UUIDField,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { LeaveRequestStatus } from '../enums/leave.enum';

export class CreateLeaveRequestDto {
  @UUIDField()
  leaveTypeId!: string;

  @StringField()
  startDate!: string;

  @StringField()
  endDate!: string;

  @NumberFieldOptional({ min: 0.5 })
  days?: number;

  @StringFieldOptional({ maxLength: 2000 })
  reason?: string;

  @EnumFieldOptional(() => LeaveRequestStatus)
  status?: LeaveRequestStatus.DRAFT | LeaveRequestStatus.SUBMITTED;
}

export class QueryLeaveRequestsDto extends PageOptionsDto {
  @UUIDFieldOptional()
  workerId?: string;

  @EnumFieldOptional(() => LeaveRequestStatus)
  status?: LeaveRequestStatus;
}

export class RejectLeaveRequestDto {
  @StringField({ maxLength: 2000 })
  reason!: string;
}

export class QueryTeamCalendarDto {
  @StringField()
  from!: string;

  @StringField()
  to!: string;

  @UUIDFieldOptional()
  divisionId?: string;
}

export class QueryStaffCalendarDto {
  @StringField()
  from!: string;

  @StringField()
  to!: string;

  @UUIDFieldOptional()
  workerId?: string;

  @StringFieldOptional({ maxLength: 2 })
  countryCode?: string;
}
