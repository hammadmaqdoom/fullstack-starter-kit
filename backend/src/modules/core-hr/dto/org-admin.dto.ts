import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { EntityStatus } from '../enums/org.enum';

export class CreateDivisionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  headWorkerId?: string | null;
}

export class UpdateDivisionDto extends PartialType(CreateDivisionDto) {}

export class CreateDepartmentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  divisionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentDepartmentId?: string | null;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}

export class CreateLegalEntityDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  registeredName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradingName?: string | null;

  @ApiProperty({ example: 'PK' })
  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @ApiProperty({ example: 'PKR' })
  @IsString()
  @Length(3, 3)
  functionalCurrency!: string;

  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ enum: EntityStatus })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateLegalEntityDto extends PartialType(CreateLegalEntityDto) {}

export class CreateOfficeLocationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'PK' })
  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiProperty({ example: '24.8607000' })
  @IsString()
  latitude!: string;

  @ApiProperty({ example: '67.0011000' })
  @IsString()
  longitude!: string;

  @ApiPropertyOptional({ default: 200 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  geofenceRadiusM?: number;
}

export class UpdateOfficeLocationDto extends PartialType(
  CreateOfficeLocationDto,
) {}

export class CreateLegalEntityDivisionMappingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  divisionId?: string | null;

  @ApiProperty({ example: 'PK' })
  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class CreateLegalEntityCurrencyDto {
  @ApiProperty({ example: 'PKR' })
  @IsString()
  @Length(3, 3)
  currencyCode!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLegalEntityCurrencyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateLegalEntitySignatoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workerId?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class UpdateLegalEntitySignatoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}
