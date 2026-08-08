import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import {
  BooleanFieldOptional,
  ClassField,
  EnumField,
  StringField,
  StringFieldOptional,
  UUIDField,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { ShiftType } from '../enums/shift-roster.enum';

export class CreateShiftRosterDto {
  @StringField({ maxLength: 100 })
  name!: string;

  @UUIDFieldOptional({ nullable: true })
  divisionId?: string | null;

  @StringField()
  effectiveFrom!: string;

  @StringFieldOptional({ nullable: true })
  effectiveTo?: string | null;
}

export class UpdateShiftRosterDto {
  @StringFieldOptional({ maxLength: 100 })
  name?: string;

  @StringFieldOptional()
  effectiveFrom?: string;

  @StringFieldOptional({ nullable: true })
  effectiveTo?: string | null;
}

export class QueryShiftRostersDto extends PageOptionsDto {
  @UUIDFieldOptional()
  divisionId?: string;
}

export class ShiftAssignmentInputDto {
  @UUIDField()
  workerId!: string;

  @StringField()
  shiftDate!: string;

  @EnumField(() => ShiftType, { default: ShiftType.MORNING })
  shiftType!: ShiftType;

  @StringField()
  startTime!: string;

  @StringField()
  endTime!: string;
}

export class PublishShiftAssignmentsDto {
  @ClassField(() => ShiftAssignmentInputDto, { each: true })
  assignments!: ShiftAssignmentInputDto[];

  /** When true, publish despite conflicts with approved leave. */
  @BooleanFieldOptional()
  force?: boolean;
}

export class QueryShiftAssignmentsDto extends PageOptionsDto {
  @StringField()
  from!: string;

  @StringField()
  to!: string;

  @UUIDFieldOptional()
  workerId?: string;

  @UUIDFieldOptional()
  divisionId?: string;

  @UUIDFieldOptional()
  shiftRosterId?: string;
}
