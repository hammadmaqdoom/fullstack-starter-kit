import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import {
  EnumFieldOptional,
  StringFieldOptional,
  UUIDField,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';
import { EmployeeBenefitStatus } from '../enums/payroll.enum';

export class CreateEmployeeBenefitDto {
  @UUIDField()
  workerId!: string;

  @UUIDField()
  benefitTypeId!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  fieldValues?: Record<string, unknown>;

  @StringFieldOptional()
  effectiveFrom?: string;

  @StringFieldOptional({ nullable: true })
  effectiveTo?: string | null;

  @EnumFieldOptional(() => EmployeeBenefitStatus)
  status?: EmployeeBenefitStatus = EmployeeBenefitStatus.ACTIVE;

  @StringFieldOptional({ maxLength: 3 })
  currencyCode?: string;

  @StringFieldOptional({ maxLength: 2000 })
  notes?: string;
}

export class UpdateEmployeeBenefitDto {
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  fieldValues?: Record<string, unknown>;

  @StringFieldOptional({ nullable: true })
  effectiveTo?: string | null;

  @EnumFieldOptional(() => EmployeeBenefitStatus)
  status?: EmployeeBenefitStatus;

  @StringFieldOptional({ maxLength: 3 })
  currencyCode?: string;

  @StringFieldOptional({ maxLength: 2000 })
  notes?: string;
}

export class QueryEmployeeBenefitsDto extends PageOptionsDto {
  @UUIDFieldOptional()
  workerId?: string;

  @EnumFieldOptional(() => EmployeeBenefitStatus)
  status?: EmployeeBenefitStatus;
}
