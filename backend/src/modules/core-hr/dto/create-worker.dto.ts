import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SUPPORTED_COUNTRY_CODES } from '@/modules/country-config/constants/country-config.seed-data';
import { BillingModel, WorkMode } from '../enums/worker.enum';

export class ContractorProfileInputDto {
  @ApiProperty({ enum: BillingModel })
  @IsEnum(BillingModel)
  billingModel: BillingModel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contractStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contractEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  paymentTermsDays?: number;

  @ApiPropertyOptional({ example: 'PKR' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  paymentCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agencyName?: string;
}

export class CompensationBandInputDto {
  @ApiProperty({ example: 'PKR' })
  @IsString()
  @MinLength(3)
  currency: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  baseSalary: number;

  @ApiProperty({ enum: ['monthly', 'weekly'] })
  @IsIn(['monthly', 'weekly'])
  payFrequency: 'monthly' | 'weekly';
}

export class CreateWorkerDto {
  @ApiProperty()
  @IsUUID()
  employmentTypeId: string;

  @ApiProperty({ enum: SUPPORTED_COUNTRY_CODES })
  @IsIn([...SUPPORTED_COUNTRY_CODES])
  countryCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn([...SUPPORTED_COUNTRY_CODES])
  bankCountryCode?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: WorkMode })
  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '1995-08-10' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  divisionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  legalEntityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1)
  fteFraction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  @IsObject()
  statutoryFields: Record<string, string>;

  @ApiPropertyOptional({ type: CompensationBandInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompensationBandInputDto)
  compensationBand?: CompensationBandInputDto;

  @ApiPropertyOptional({ type: ContractorProfileInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractorProfileInputDto)
  contractorProfile?: ContractorProfileInputDto;
}
