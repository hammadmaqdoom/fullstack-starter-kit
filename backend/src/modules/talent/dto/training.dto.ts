import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import {
  TrainingAssignmentSource,
  TrainingAssignmentStatus,
  TrainingCourseType,
  TrainingVerificationMethod,
} from '../enums/training.enum';

export class CreateTrainingCourseDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TrainingCourseType })
  @IsEnum(TrainingCourseType)
  courseType: TrainingCourseType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  renewalPeriodMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachmentBlobUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  countsTowardAwarenessControl?: boolean;
}

export class UpdateTrainingCourseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  countsTowardAwarenessControl?: boolean;
}

export class AssignTrainingDto {
  @ApiProperty()
  @IsUUID()
  courseId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  workerIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: TrainingAssignmentSource })
  @IsOptional()
  @IsEnum(TrainingAssignmentSource)
  source?: TrainingAssignmentSource;
}

export class UpdateTrainingAssignmentDto {
  @ApiProperty({ enum: TrainingAssignmentStatus })
  @IsEnum(TrainingAssignmentStatus)
  status: TrainingAssignmentStatus;
}

export class CompleteTrainingAssignmentDto {
  @ApiPropertyOptional({ enum: TrainingVerificationMethod })
  @IsOptional()
  @IsEnum(TrainingVerificationMethod)
  verificationMethod?: TrainingVerificationMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateBlobUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryTrainingAssignmentsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ enum: TrainingAssignmentStatus })
  @IsOptional()
  @IsEnum(TrainingAssignmentStatus)
  status?: TrainingAssignmentStatus;
}
