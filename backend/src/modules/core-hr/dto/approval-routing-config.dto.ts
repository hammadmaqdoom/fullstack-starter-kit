import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { ApprovalMode, ApprovalWorkflowType } from '../enums/approval-routing.enum';

export class CreateApprovalRoutingConfigDto {
  @ApiProperty({ enum: ApprovalWorkflowType })
  @IsEnum(ApprovalWorkflowType)
  workflowType: ApprovalWorkflowType;

  @ApiPropertyOptional({ description: 'ISO 3166-1 alpha-2 country code; omit for tenant-wide' })
  @IsOptional()
  @Length(2, 2)
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  legalEntityId?: string;

  @ApiPropertyOptional({ description: 'Amount above which this tier applies (expense/travel)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amountThreshold?: number;

  @ApiProperty({ enum: ApprovalMode, default: ApprovalMode.SERIAL })
  @IsEnum(ApprovalMode)
  approverMode: ApprovalMode;

  @ApiPropertyOptional({ description: 'Escalate to next approver after N days without action' })
  @IsOptional()
  @IsInt()
  @Min(1)
  escalationAfterDays?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateApprovalRoutingConfigDto {
  @ApiPropertyOptional({ description: 'Amount above which this tier applies (expense/travel)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amountThreshold?: number;

  @ApiPropertyOptional({ enum: ApprovalMode })
  @IsOptional()
  @IsEnum(ApprovalMode)
  approverMode?: ApprovalMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  escalationAfterDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
