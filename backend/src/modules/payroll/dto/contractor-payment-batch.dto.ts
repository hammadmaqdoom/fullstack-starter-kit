import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import {
  EnumFieldOptional,
  StringField,
  StringFieldOptional,
  UUIDField,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { ContractorPaymentBatchStatus } from '../enums/payroll.enum';

export class CreateContractorPaymentBatchDto {
  @UUIDField()
  legalEntityId!: string;

  @StringField()
  periodStart!: string;

  @StringField()
  periodEnd!: string;

  @StringField({ minLength: 3, maxLength: 3 })
  currencyCode!: string;
}

export class QueryContractorPaymentBatchesDto extends PageOptionsDto {
  @UUIDFieldOptional()
  legalEntityId?: string;

  @EnumFieldOptional(() => ContractorPaymentBatchStatus)
  status?: ContractorPaymentBatchStatus;
}

export class MarkContractorPaymentLinePaidDto {
  @StringField({ maxLength: 100 })
  paymentReference!: string;

  @StringFieldOptional()
  paymentValueDate?: string;

  @StringFieldOptional({ maxLength: 50 })
  swiftUetr?: string;
}
