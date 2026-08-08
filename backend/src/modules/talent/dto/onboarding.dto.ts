import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OnboardingAssigneeRole } from '../enums/onboarding.enum';

export class CreateOnboardingTemplateTaskDto {
  @ApiProperty({ example: 'Complete profile verification' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ enum: OnboardingAssigneeRole })
  @IsEnum(OnboardingAssigneeRole)
  assigneeRole: OnboardingAssigneeRole;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Days after start date' })
  @IsOptional()
  @IsInt()
  dueOffsetDays?: number;
}

export class CreateOnboardingTemplateDto {
  @ApiProperty({ example: 'Standard PK FTE Day-1' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'PK' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employmentTypeId?: string;

  @ApiPropertyOptional({ type: [CreateOnboardingTemplateTaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOnboardingTemplateTaskDto)
  tasks?: CreateOnboardingTemplateTaskDto[];
}

export class CreateOnboardingCaseDto {
  @ApiProperty()
  @IsUUID()
  workerId: string;

  @ApiProperty()
  @IsUUID()
  templateId: string;

  @ApiProperty({ example: '2026-07-15' })
  @IsDateString()
  startDate: string;
}

export class CompleteOnboardingTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InitiateSeparationDto {
  @ApiProperty()
  @IsUUID()
  workerId: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsDateString()
  lastWorkingDay: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ClearClearanceItemDto {
  @ApiPropertyOptional({ description: 'Optional waiver note' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'When true, mark as waived instead of cleared',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  waive?: boolean;
}
