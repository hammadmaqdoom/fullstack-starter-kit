import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { DelegationScope } from '../enums/delegation.enum';

export class CreateApprovalDelegationDto {
  @ApiProperty()
  @IsUUID()
  delegatorWorkerId: string;

  @ApiProperty()
  @IsUUID()
  delegateWorkerId: string;

  @ApiPropertyOptional({ enum: DelegationScope, default: DelegationScope.APPROVALS })
  @IsOptional()
  @IsEnum(DelegationScope)
  scope?: DelegationScope;

  @ApiProperty()
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty()
  @IsDateString()
  effectiveTo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateApprovalDelegationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  delegateWorkerId?: string;

  @ApiPropertyOptional({ enum: DelegationScope })
  @IsOptional()
  @IsEnum(DelegationScope)
  scope?: DelegationScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
