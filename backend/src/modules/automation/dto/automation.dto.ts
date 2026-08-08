import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  AlertRuleChannel,
  ComplianceAlertType,
  ReportCadence,
  ReportType,
} from '../enums/automation.enum';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailApprovals?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailLeave?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailPolicies?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  teamsAdaptiveCards?: boolean;
}

export class CreateScheduledReportDto {
  @ApiPropertyOptional({ enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiPropertyOptional({ enum: ReportCadence })
  @IsOptional()
  @IsEnum(ReportCadence)
  cadence?: ReportCadence;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}

export class AlertRuleConditionDto {
  @ApiProperty({ enum: ComplianceAlertType })
  @IsEnum(ComplianceAlertType)
  metric: ComplianceAlertType;

  @ApiProperty({
    description: 'Fire the alert this many days before the due date',
    example: 30,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  withinDays: number;

  @ApiPropertyOptional({ enum: ['info', 'warning', 'critical'] })
  @IsOptional()
  @IsIn(['info', 'warning', 'critical'])
  severity?: 'info' | 'warning' | 'critical';
}

export class CreateAlertRuleDto {
  @ApiProperty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({ type: AlertRuleConditionDto })
  @ValidateNested()
  @Type(() => AlertRuleConditionDto)
  condition: AlertRuleConditionDto;

  @ApiPropertyOptional({ enum: AlertRuleChannel })
  @IsOptional()
  @IsEnum(AlertRuleChannel)
  channel?: AlertRuleChannel;
}

export class UpdateAlertRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ type: AlertRuleConditionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AlertRuleConditionDto)
  condition?: AlertRuleConditionDto;

  @ApiPropertyOptional({ enum: AlertRuleChannel })
  @IsOptional()
  @IsEnum(AlertRuleChannel)
  channel?: AlertRuleChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
