import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
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
import {
  DevelopmentActionStatus,
  DevelopmentActionType,
  DevelopmentPlanStatus,
  FeedbackType,
  GoalProgressStatus,
  GoalStatus,
  GoalType,
  KeyResultStatus,
  ObjectiveLevel,
  ObjectiveStatus,
  OneOnOneStatus,
  PeerFeedbackRole,
  PerformanceCycleStatus,
  PerformanceCycleType,
  ProbationOutcome,
  PulseSurveyStatus,
  ReviewOutcome,
  ReviewStatus,
} from '../enums/performance.enum';

export class CreateObjectiveDto {
  @ApiProperty({ enum: ObjectiveLevel })
  @IsEnum(ObjectiveLevel)
  level: ObjectiveLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  divisionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  periodStart: string;

  @ApiProperty()
  @IsDateString()
  periodEnd: string;
}

export class UpdateObjectiveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ObjectiveStatus })
  @IsOptional()
  @IsEnum(ObjectiveStatus)
  status?: ObjectiveStatus;
}

export class CreateKeyResultDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  targetValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  weightPercent?: number;
}

export class UpdateKeyResultDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  currentValue?: number;

  @ApiPropertyOptional({ enum: KeyResultStatus })
  @IsOptional()
  @IsEnum(KeyResultStatus)
  status?: KeyResultStatus;
}

export class CreateGoalDto {
  @ApiProperty()
  @IsUUID()
  workerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  keyResultId?: string;

  @ApiPropertyOptional({ enum: GoalType })
  @IsOptional()
  @IsEnum(GoalType)
  goalType?: GoalType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  weightPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateGoalDto {
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
  @IsInt()
  @Min(0)
  @Max(100)
  weightPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @ApiPropertyOptional({ enum: GoalProgressStatus })
  @IsOptional()
  @IsEnum(GoalProgressStatus)
  progressStatus?: GoalProgressStatus;

  @ApiPropertyOptional({ enum: GoalStatus })
  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  keyResultId?: string;
}

export class CreateGoalCheckInDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent: number;

  @ApiProperty({ enum: GoalProgressStatus })
  @IsEnum(GoalProgressStatus)
  progressStatus: GoalProgressStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateFeedbackDto {
  @ApiProperty()
  @IsUUID()
  recipientWorkerId: string;

  @ApiProperty({ enum: FeedbackType })
  @IsEnum(FeedbackType)
  feedbackType: FeedbackType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  competencyTag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class CreateRecognitionDto {
  @ApiProperty()
  @IsUUID()
  recipientWorkerId: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  valueTag?: string;
}

export class CreateOneOnOneDto {
  @ApiProperty()
  @IsUUID()
  employeeWorkerId: string;

  @ApiProperty()
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agenda?: string;
}

export class UpdateOneOnOneDto {
  @ApiPropertyOptional({ enum: OneOnOneStatus })
  @IsOptional()
  @IsEnum(OneOnOneStatus)
  status?: OneOnOneStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agenda?: string;
}

export class CreateOneOnOneNoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}

export class AssessmentQuestionOptionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  label: string;
}

export class AssessmentQuestionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({
    enum: [
      'short_text',
      'long_text',
      'rating',
      'yes_no',
      'single_choice',
      'multi_choice',
    ],
  })
  @IsIn([
    'short_text',
    'long_text',
    'rating',
    'yes_no',
    'single_choice',
    'multi_choice',
  ])
  type:
    | 'short_text'
    | 'long_text'
    | 'rating'
    | 'yes_no'
    | 'single_choice'
    | 'multi_choice';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty()
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  helpText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  scaleMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  scaleMax?: number;

  @ApiPropertyOptional({ type: [AssessmentQuestionOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionOptionDto)
  options?: AssessmentQuestionOptionDto[];
}

export class CreatePerformanceCycleDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ enum: PerformanceCycleType })
  @IsEnum(PerformanceCycleType)
  cycleType: PerformanceCycleType;

  @ApiProperty()
  @IsDateString()
  periodStart: string;

  @ApiProperty()
  @IsDateString()
  periodEnd: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  populationFilter?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  peerFeedbackEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  calibrationEnabled?: boolean;

  @ApiPropertyOptional({ type: [AssessmentQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionDto)
  selfAssessmentTemplate?: AssessmentQuestionDto[];

  @ApiPropertyOptional({ type: [AssessmentQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionDto)
  managerAssessmentTemplate?: AssessmentQuestionDto[];
}

export class UpdatePerformanceCycleDto {
  @ApiPropertyOptional({ enum: PerformanceCycleStatus })
  @IsOptional()
  @IsEnum(PerformanceCycleStatus)
  status?: PerformanceCycleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  peerFeedbackEnabled?: boolean;

  @ApiPropertyOptional({ type: [AssessmentQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionDto)
  selfAssessmentTemplate?: AssessmentQuestionDto[];

  @ApiPropertyOptional({ type: [AssessmentQuestionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionDto)
  managerAssessmentTemplate?: AssessmentQuestionDto[];
}

export class SubmitSelfAssessmentDto {
  @ApiProperty({
    description: 'Answers keyed by questionId',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  answers: Record<string, string | number | boolean | string[]>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  competencyRatings?: Record<string, number>;
}

export class SubmitManagerReviewDto {
  @ApiProperty({
    description: 'Answers keyed by questionId',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  answers: Record<string, string | number | boolean | string[]>;

  @ApiProperty({ enum: ReviewOutcome })
  @IsEnum(ReviewOutcome)
  outcome: ReviewOutcome;

  @ApiPropertyOptional({ enum: ProbationOutcome })
  @IsOptional()
  @IsEnum(ProbationOutcome)
  probationOutcome?: ProbationOutcome;

  @ApiPropertyOptional({
    description: 'Days to extend probation (required when probationOutcome=extend)',
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  probationExtensionDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  competencyRatings?: Record<string, number>;
}

export class DisputeReviewDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  reason: string;
}

export class ResolveDisputeDto {
  @ApiPropertyOptional({ enum: ReviewStatus })
  @IsOptional()
  @IsEnum(ReviewStatus)
  returnStatus?: ReviewStatus;
}

export class SubmitPeerFeedbackDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  feedback: string;

  @ApiPropertyOptional({ enum: PeerFeedbackRole })
  @IsOptional()
  @IsEnum(PeerFeedbackRole)
  reviewerRole?: PeerFeedbackRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  competencyRatings?: Record<string, number>;
}

export class CreateDevelopmentPlanDto {
  @ApiProperty()
  @IsUUID()
  workerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reviewId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;
}

export class UpdateDevelopmentPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ enum: DevelopmentPlanStatus })
  @IsOptional()
  @IsEnum(DevelopmentPlanStatus)
  status?: DevelopmentPlanStatus;
}

export class CreateDevelopmentActionDto {
  @ApiProperty({ enum: DevelopmentActionType })
  @IsEnum(DevelopmentActionType)
  actionType: DevelopmentActionType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateDevelopmentActionDto {
  @ApiPropertyOptional({ enum: DevelopmentActionStatus })
  @IsOptional()
  @IsEnum(DevelopmentActionStatus)
  status?: DevelopmentActionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

class PulseQuestionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty()
  @IsInt()
  scaleMin: number;

  @ApiProperty()
  @IsInt()
  scaleMax: number;
}

export class CreatePulseSurveyDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [PulseQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PulseQuestionDto)
  questions: PulseQuestionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  populationFilter?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  closesAt?: string;
}

export class UpdatePulseSurveyDto {
  @ApiPropertyOptional({ enum: PulseSurveyStatus })
  @IsOptional()
  @IsEnum(PulseSurveyStatus)
  status?: PulseSurveyStatus;
}

export class SubmitPulseResponseDto {
  @ApiProperty()
  @IsObject()
  answers: Record<string, number>;
}

export class QueryWorkerPerformanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workerId?: string;
}

export class UpdateReviewStatusDto {
  @ApiProperty({ enum: ReviewStatus })
  @IsEnum(ReviewStatus)
  status: ReviewStatus;
}

export class FinalizeCalibrationDto {
  @ApiPropertyOptional({ enum: ReviewOutcome })
  @IsOptional()
  @IsEnum(ReviewOutcome)
  calibratedOutcome?: ReviewOutcome;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  calibrationNotes?: string;
}

export class TriggerProbationSeparationDto {
  @ApiProperty({ example: '2026-08-31' })
  @IsDateString()
  lastWorkingDay: string;
}
