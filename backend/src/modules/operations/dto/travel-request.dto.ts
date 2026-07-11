import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { StringFieldOptional } from '@/decorators/field.decorators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TravelRequestStatus, TravelType } from '../enums/travel.enum';

export class TravelItineraryDto {
  @ApiProperty({ example: 'flight' })
  @IsString()
  @MaxLength(50)
  legType: string;

  @ApiProperty({ example: 'PIA PK-301 KHI → DXB' })
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  departureAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  arrivalAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTravelRequestDto {
  @ApiPropertyOptional({
    description: 'Omit when the employee is submitting their own request.',
  })
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiProperty({ type: [String], example: ['Dubai, UAE'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  destinations: string[];

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 'Client workshop and quarterly review' })
  @IsString()
  purpose: string;

  @ApiProperty({ enum: TravelType })
  @IsEnum(TravelType)
  travelType: TravelType;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  @Min(0)
  estimatedCost: number;

  @ApiProperty({ minLength: 3, maxLength: 3, example: 'USD' })
  @IsString()
  @MaxLength(3)
  currencyCode: string;

  @ApiPropertyOptional({ type: [TravelItineraryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TravelItineraryDto)
  itineraries?: TravelItineraryDto[];
}

export class UpdateTravelRequestDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  destinations?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ enum: TravelType })
  @IsOptional()
  @IsEnum(TravelType)
  travelType?: TravelType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional({ minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional({ type: [TravelItineraryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TravelItineraryDto)
  itineraries?: TravelItineraryDto[];
}

export class QueryTravelRequestsDto extends PageOptionsDto {
  @StringFieldOptional()
  workerId?: string;

  @ApiPropertyOptional({ enum: TravelRequestStatus })
  @IsOptional()
  @IsEnum(TravelRequestStatus)
  status?: TravelRequestStatus;
}

export class RejectTravelRequestDto {
  @ApiProperty({ example: 'Budget exceeds division travel allowance for Q3' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class ReconcileTravelRequestDto {
  @ApiProperty({ example: 1340.5 })
  @IsNumber()
  @Min(0)
  actualCost: number;
}

export class UpsertTravelApprovalRuleDto {
  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountThreshold?: number;

  @ApiPropertyOptional({ minLength: 3, maxLength: 3, example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  requireFinance: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  requirePeopleOpsForInternational: boolean;
}
