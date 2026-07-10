import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import {
  EnumFieldOptional,
  NumberField,
  NumberFieldOptional,
  StringField,
  StringFieldOptional,
  UUIDField,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { PayFrequency } from '../enums/payroll.enum';

export class CreateCompensationDto {
  @UUIDField()
  workerId!: string;

  @UUIDField()
  payComponentId!: string;

  @NumberField({ min: 0 })
  amount!: number;

  @StringField({ minLength: 3, maxLength: 3 })
  currencyCode!: string;

  @EnumFieldOptional(() => PayFrequency)
  payFrequency?: PayFrequency = PayFrequency.MONTHLY;

  @StringField()
  effectiveFrom!: string;

  @StringFieldOptional({ nullable: true })
  effectiveTo?: string | null;
}

export class UpdateCompensationDto {
  @NumberFieldOptional({ min: 0 })
  amount?: number;

  @StringFieldOptional({ minLength: 3, maxLength: 3 })
  currencyCode?: string;

  @EnumFieldOptional(() => PayFrequency)
  payFrequency?: PayFrequency;

  @StringFieldOptional()
  effectiveFrom?: string;

  @StringFieldOptional({ nullable: true })
  effectiveTo?: string | null;
}

export class QueryCompensationDto extends PageOptionsDto {
  @UUIDFieldOptional()
  workerId?: string;
}
