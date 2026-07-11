import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  ManpowerPlanStatus,
  ManpowerPositionStatus,
} from '../enums/manpower.enum';

export class CreateManpowerPlanDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  divisionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty()
  @IsInt()
  @Min(2020)
  planYear: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  budgetedFte?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  budgetedContractorCapacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  plannedAttritionPercent?: number;
}

export class UpdateManpowerPlanDto {
  @ApiPropertyOptional({ enum: ManpowerPlanStatus })
  @IsOptional()
  @IsEnum(ManpowerPlanStatus)
  status?: ManpowerPlanStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  budgetedFte?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  budgetedContractorCapacity?: number;
}

export class CreateManpowerPositionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  roleTitle: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty()
  @IsUUID()
  employmentTypeId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  headcount?: number;
}

export class UpdateManpowerPositionDto {
  @ApiPropertyOptional({ enum: ManpowerPositionStatus })
  @IsOptional()
  @IsEnum(ManpowerPositionStatus)
  status?: ManpowerPositionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  headcount?: number;
}
