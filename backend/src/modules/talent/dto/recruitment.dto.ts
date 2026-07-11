import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CandidateStatus,
  RequisitionStatus,
  ScorecardRecommendation,
} from '../enums/recruitment.enum';

export class CreateJobRequisitionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  divisionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty()
  @IsUUID()
  employmentTypeId: string;

  @ApiProperty()
  @IsString()
  countryCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  manpowerPositionId?: string;

  @ApiProperty()
  @IsUUID()
  hiringManagerWorkerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  headcount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  budgetBandMin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  budgetBandMax?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justification?: string;
}

export class UpdateJobRequisitionDto {
  @ApiPropertyOptional({ enum: RequisitionStatus })
  @IsOptional()
  @IsEnum(RequisitionStatus)
  status?: RequisitionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  headcount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justification?: string;
}

export class CreateCandidateDto {
  @ApiProperty()
  @IsUUID()
  requisitionId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cvBlobUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCandidateStatusDto {
  @ApiProperty({ enum: CandidateStatus })
  @IsEnum(CandidateStatus)
  status: CandidateStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectedReason?: string;
}

class ScorecardCriterionDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(10)
  score: number;
}

export class CreateInterviewScorecardDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  stage: string;

  @ApiProperty({ type: [ScorecardCriterionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScorecardCriterionDto)
  criteria: ScorecardCriterionDto[];

  @ApiPropertyOptional({ enum: ScorecardRecommendation })
  @IsOptional()
  @IsEnum(ScorecardRecommendation)
  recommendation?: ScorecardRecommendation;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  interviewedAt?: string;
}

export class QueryCandidatesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requisitionId?: string;

  @ApiPropertyOptional({ enum: CandidateStatus })
  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;
}
