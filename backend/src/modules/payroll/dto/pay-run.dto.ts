import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import {
  EnumFieldOptional,
  StringField,
  UUIDField,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { PayRunStatus } from '../enums/payroll.enum';

export class CreatePayRunDto {
  @UUIDField()
  legalEntityId!: string;

  @StringField({ minLength: 2, maxLength: 2 })
  countryCode!: string;

  @StringField()
  periodStart!: string;

  @StringField()
  periodEnd!: string;

  @StringField({ minLength: 3, maxLength: 3 })
  functionalCurrency!: string;
}

export class QueryPayRunsDto extends PageOptionsDto {
  @UUIDFieldOptional()
  legalEntityId?: string;

  @EnumFieldOptional(() => PayRunStatus)
  status?: PayRunStatus;
}
