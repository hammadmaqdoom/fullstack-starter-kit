import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LeaveAccrualMethod } from '@/modules/country-config/enums/setup-wizard.enum';

export class CreateLeaveTypeAdminDto {
  @ApiProperty({ example: 'PK' })
  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @ApiProperty({ example: 'ANNUAL' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Annual leave' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ enum: LeaveAccrualMethod })
  @IsOptional()
  @IsEnum(LeaveAccrualMethod)
  accrualMethod?: LeaveAccrualMethod;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  daysPerYear?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  carryForwardCap?: number;
}

export class UpdateLeaveTypeAdminDto extends PartialType(
  CreateLeaveTypeAdminDto,
) {}

export class CreateHolidayCalendarAdminDto {
  @ApiProperty({ example: 'PK' })
  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @ApiProperty({ example: 'Pakistan 2026' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2020)
  @Max(2100)
  effectiveYear!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateHolidayCalendarAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateHolidayAdminDto {
  @ApiProperty({ example: 'Independence Day' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: '2026-08-14' })
  @IsDateString()
  holidayDate!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCompanyClosure?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOptionalWorking?: boolean;
}

export class UpdateHolidayAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  holidayDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompanyClosure?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOptionalWorking?: boolean;
}
