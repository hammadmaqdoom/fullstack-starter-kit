import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { FundingAccountProvider } from '../enums/payout.enum';

export class CreateFundingAccountDto {
  @ApiProperty()
  @IsUUID()
  legalEntityId!: string;

  @ApiProperty({ enum: FundingAccountProvider })
  @IsEnum(FundingAccountProvider)
  provider!: FundingAccountProvider;

  @ApiProperty({ example: 'SGD' })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  bankDetails?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFundingAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalAccountId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  bankDetails?: Record<string, string> | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryFundingAccountsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  legalEntityId?: string;

  @ApiPropertyOptional({ enum: FundingAccountProvider })
  @IsOptional()
  @IsEnum(FundingAccountProvider)
  provider?: FundingAccountProvider;
}
