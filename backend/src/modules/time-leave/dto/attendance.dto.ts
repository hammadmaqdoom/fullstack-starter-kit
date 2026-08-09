import {
  EnumField,
  EnumFieldOptional,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { PunchSource, PunchType } from '../enums/attendance.enum';

export class CheckInDto {
  @NumberFieldOptional({ nullable: true })
  latitude?: number | null;

  @NumberFieldOptional({ nullable: true })
  longitude?: number | null;

  @EnumFieldOptional(() => PunchSource, { default: PunchSource.WEB })
  source?: PunchSource;

  @StringFieldOptional({ maxLength: 64 })
  timezone?: string;

  @StringFieldOptional()
  clientPunchedAt?: string;
}

export class CheckOutDto extends CheckInDto {}

export class QueryTodayAttendanceDto {
  @StringFieldOptional({ maxLength: 64 })
  timezone?: string;

  @StringFieldOptional()
  scope?: 'self' | 'team';
}

export class QueryPunchesDto extends PageOptionsDto {
  @UUIDFieldOptional()
  workerId?: string;

  @StringFieldOptional()
  from?: string;

  @StringFieldOptional()
  to?: string;
}

export class CreatePunchCorrectionDto {
  @UUIDFieldOptional({ nullable: true })
  punchId?: string | null;

  @EnumField(() => PunchType)
  proposedType!: PunchType;

  @StringField()
  proposedTime!: string;

  @StringField({ maxLength: 2000 })
  reason!: string;
}

export class RejectPunchCorrectionDto {
  @StringField({ maxLength: 2000 })
  reason!: string;
}
