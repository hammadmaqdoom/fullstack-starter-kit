import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RelationshipType } from '../enums/org.enum';

export class CreateManagerRelationshipDto {
  @ApiProperty()
  @IsUUID()
  workerId: string;

  @ApiProperty()
  @IsUUID()
  managerId: string;

  @ApiPropertyOptional({
    enum: RelationshipType,
    default: RelationshipType.DIRECT,
  })
  @IsOptional()
  @IsEnum(RelationshipType)
  relationshipType?: RelationshipType;

  @ApiProperty()
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ description: 'Omit for an open-ended assignment' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateManagerRelationshipDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ enum: RelationshipType })
  @IsOptional()
  @IsEnum(RelationshipType)
  relationshipType?: RelationshipType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    description: 'Pass null to reopen an end-dated assignment',
  })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}
