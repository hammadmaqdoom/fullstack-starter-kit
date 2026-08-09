import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PayoutRail } from '../enums/payout.enum';

export class UpdatePayoutRailProfileDto {
  @ApiProperty({ enum: PayoutRail })
  @IsEnum(PayoutRail)
  primaryRail!: PayoutRail;

  @ApiPropertyOptional({ enum: PayoutRail, nullable: true })
  @IsOptional()
  @IsEnum(PayoutRail)
  secondaryRail?: PayoutRail | null;

  @ApiProperty({ enum: PayoutRail })
  @IsEnum(PayoutRail)
  fallbackRail!: PayoutRail;
}

export class UpsertCorridorOverrideDto {
  @ApiProperty()
  @IsString()
  @Length(2, 2)
  payerCountryCode!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 2)
  recipientBankCountryCode!: string;

  @ApiProperty({ enum: PayoutRail })
  @IsEnum(PayoutRail)
  primaryRail!: PayoutRail;

  @ApiPropertyOptional({ enum: PayoutRail, nullable: true })
  @IsOptional()
  @IsEnum(PayoutRail)
  secondaryRail?: PayoutRail | null;

  @ApiProperty({ enum: PayoutRail })
  @IsEnum(PayoutRail)
  fallbackRail!: PayoutRail;
}

export class CsvColumnDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty()
  @IsInt()
  order!: number;
}

export class CreateCsvExportProfileDto {
  @ApiProperty()
  @IsUUID()
  legalEntityId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ type: [CsvColumnDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CsvColumnDto)
  columns!: CsvColumnDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includePayerFromFundingAccount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateCsvExportProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ type: [CsvColumnDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CsvColumnDto)
  columns?: CsvColumnDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includePayerFromFundingAccount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
