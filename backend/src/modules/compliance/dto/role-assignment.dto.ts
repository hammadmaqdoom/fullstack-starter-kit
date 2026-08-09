import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { ScopeType } from '../enums/scope-type.enum';

export class CreateUserRoleAssignmentDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty()
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({ enum: ScopeType, default: ScopeType.OWN })
  @IsOptional()
  @IsEnum(ScopeType)
  scopeType?: ScopeType;

  @ApiPropertyOptional({
    description: 'Required when scopeType is division or legal_entity',
  })
  @IsOptional()
  @IsUUID()
  scopeId?: string | null;

  @ApiPropertyOptional({
    description: 'ISO country code when scopeType is country',
    example: 'PK',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  scopeCountryCode?: string | null;

  @ApiPropertyOptional({ example: '2026-08-10' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null;

  @ApiPropertyOptional({ example: '2027-08-10' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class UpdateUserRoleAssignmentDto {
  @ApiPropertyOptional({ enum: ScopeType })
  @IsOptional()
  @IsEnum(ScopeType)
  scopeType?: ScopeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scopeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 2)
  scopeCountryCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null;

  @ApiPropertyOptional({
    description: 'Set to end access; pass null to clear end date',
  })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

export class QueryUserRoleAssignmentsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'When true (default), only currently effective assignments',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  activeOnly?: string;
}
