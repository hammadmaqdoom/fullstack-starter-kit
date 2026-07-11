import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  Length,
  Max,
} from 'class-validator';

export class OverrideExchangeRateDto {
  @ApiProperty({ description: 'ISO 4217 currency code, e.g. USD' })
  @Length(3, 3)
  fromCurrency: string;

  @ApiProperty({ description: 'ISO 4217 currency code, e.g. PKR' })
  @Length(3, 3)
  toCurrency: string;

  @ApiProperty({ description: 'Rate: 1 fromCurrency = rate toCurrency' })
  @IsNumber()
  @IsPositive()
  rate: number;

  @ApiProperty({ description: 'Date the override rate takes effect (YYYY-MM-DD)' })
  effectiveFrom: string;

  @ApiPropertyOptional({ description: 'Reason for the manual override' })
  @IsOptional()
  reason?: string;
}

export class UpsertFxVarianceAlertConfigDto {
  @ApiProperty()
  @Length(3, 3)
  fromCurrency: string;

  @ApiProperty()
  @Length(3, 3)
  toCurrency: string;

  @ApiProperty({ description: 'Day-over-day percentage move that triggers an alert' })
  @IsNumber()
  @IsPositive()
  @Max(100)
  thresholdPercent: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
