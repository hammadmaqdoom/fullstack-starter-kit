import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCompOffCreditDto {
  @ApiProperty()
  @IsUUID()
  workerId: string;

  @ApiProperty({ description: 'Number of comp-off days credited', example: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  creditedDays: number;

  @ApiProperty({ description: 'Date the comp-off was earned (worked)' })
  @IsDateString()
  earnedDate: string;

  @ApiPropertyOptional({ description: 'Date the credit expires if unused' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Reference for the overtime/weekend work',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceReference?: string;
}

export class QueryCompOffCreditsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workerId?: string;
}
