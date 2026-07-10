import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import {
  EnumField,
  EnumFieldOptional,
  NumberField,
  StringField,
  StringFieldOptional,
  UUIDField,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import {
  StatutoryRateUnit,
  StatutoryScheduleStatus,
} from '../enums/payroll.enum';

export class CreateStatutoryRateEntryDto {
  @StringField({ maxLength: 50 })
  rateKey!: string;

  @NumberField()
  rateValue!: number;

  @EnumField(() => StatutoryRateUnit)
  rateUnit!: StatutoryRateUnit;
}

export class CreateStatutoryRateScheduleDto {
  @UUIDField()
  legalEntityId!: string;

  @StringField({ minLength: 2, maxLength: 2 })
  countryCode!: string;

  @StringField({ maxLength: 100 })
  name!: string;

  @StringField()
  effectiveFrom!: string;

  @StringFieldOptional({ nullable: true })
  effectiveTo?: string | null;

  @ApiPropertyOptional({
    type: () => CreateStatutoryRateEntryDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStatutoryRateEntryDto)
  entries?: CreateStatutoryRateEntryDto[];
}

export class UpdateStatutoryRateScheduleDto {
  @StringFieldOptional({ maxLength: 100 })
  name?: string;

  @StringFieldOptional()
  effectiveFrom?: string;

  @StringFieldOptional({ nullable: true })
  effectiveTo?: string | null;
}

export class QueryStatutoryRateSchedulesDto extends PageOptionsDto {
  @UUIDFieldOptional()
  legalEntityId?: string;

  @StringFieldOptional({ minLength: 2, maxLength: 2 })
  countryCode?: string;

  @EnumFieldOptional(() => StatutoryScheduleStatus)
  status?: StatutoryScheduleStatus;
}
