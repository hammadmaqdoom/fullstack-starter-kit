import {
  StringFieldOptional,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';

export class QueryCalendarRangeDto {
  @StringFieldOptional()
  from?: string;

  @StringFieldOptional()
  to?: string;

  @UUIDFieldOptional()
  divisionId?: string;
}
