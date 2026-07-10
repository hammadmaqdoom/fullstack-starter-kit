import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import {
  BooleanFieldOptional,
  EnumFieldOptional,
  StringField,
  StringFieldOptional,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import {
  BenefitDeliveryMode,
  BenefitPayrollTreatment,
  BenefitTypeStatus,
} from '@/modules/country-config/enums/setup-wizard.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { BenefitTypeFieldType } from '../enums/payroll.enum';

export class CreateBenefitTypeFieldDto {
  @StringField({ maxLength: 50 })
  fieldCode!: string;

  @StringField({ maxLength: 100 })
  label!: string;

  @EnumFieldOptional(() => BenefitTypeFieldType)
  fieldType?: BenefitTypeFieldType = BenefitTypeFieldType.TEXT;

  @BooleanFieldOptional()
  required?: boolean;

  @BooleanFieldOptional()
  employeeVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  validationRules?: Record<string, unknown>;
}

export class CreateBenefitTypeDto {
  @StringField({ maxLength: 50 })
  code!: string;

  @StringField({ maxLength: 100 })
  name!: string;

  @StringField({ maxLength: 50 })
  category!: string;

  @StringFieldOptional({ maxLength: 2 })
  countryCode?: string;

  @EnumFieldOptional(() => BenefitDeliveryMode)
  deliveryMode?: BenefitDeliveryMode = BenefitDeliveryMode.NON_CASH;

  @BooleanFieldOptional()
  affectsPayroll?: boolean;

  @BooleanFieldOptional()
  affectsTax?: boolean;

  @EnumFieldOptional(() => BenefitTypeStatus)
  status?: BenefitTypeStatus = BenefitTypeStatus.DRAFT;

  @EnumFieldOptional(() => BenefitPayrollTreatment)
  payrollTreatment?: BenefitPayrollTreatment;

  @UUIDFieldOptional()
  payComponentId?: string;

  @BooleanFieldOptional()
  employeeVisible?: boolean;

  @ApiPropertyOptional({ type: () => CreateBenefitTypeFieldDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBenefitTypeFieldDto)
  fields?: CreateBenefitTypeFieldDto[];
}

export class UpdateBenefitTypeDto {
  @StringFieldOptional({ maxLength: 100 })
  name?: string;

  @StringFieldOptional({ maxLength: 50 })
  category?: string;

  @StringFieldOptional({ maxLength: 2, nullable: true })
  countryCode?: string | null;

  @EnumFieldOptional(() => BenefitDeliveryMode)
  deliveryMode?: BenefitDeliveryMode;

  @BooleanFieldOptional()
  affectsPayroll?: boolean;

  @BooleanFieldOptional()
  affectsTax?: boolean;

  @EnumFieldOptional(() => BenefitTypeStatus)
  status?: BenefitTypeStatus;

  @EnumFieldOptional(() => BenefitPayrollTreatment)
  payrollTreatment?: BenefitPayrollTreatment;

  @UUIDFieldOptional({ nullable: true })
  payComponentId?: string | null;

  @BooleanFieldOptional()
  employeeVisible?: boolean;
}

export class QueryBenefitTypesDto extends PageOptionsDto {
  @StringFieldOptional({ maxLength: 2 })
  countryCode?: string;

  @EnumFieldOptional(() => BenefitTypeStatus)
  status?: BenefitTypeStatus;
}
