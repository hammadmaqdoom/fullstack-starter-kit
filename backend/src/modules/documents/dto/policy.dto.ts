import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PolicyCategory } from '../enums/policy.enum';

export class PolicyPopulationRuleDto {
  @ApiPropertyOptional({ description: 'Null = all countries', example: 'PK' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string | null;

  @ApiPropertyOptional({ description: 'Null = all divisions' })
  @IsOptional()
  @IsUUID()
  divisionId?: string | null;

  @ApiPropertyOptional({ description: 'Null = all employment types' })
  @IsOptional()
  @IsUUID()
  employmentTypeId?: string | null;
}

export class CreatePolicyDto {
  @ApiProperty({ example: 'ISO_INFOSEC' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Information Security Policy' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ enum: PolicyCategory })
  @IsEnum(PolicyCategory)
  category: PolicyCategory;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [PolicyPopulationRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyPopulationRuleDto)
  populationRules?: PolicyPopulationRuleDto[];
}

export class CreatePolicyVersionDto {
  @ApiPropertyOptional({ description: 'HTML body of the policy' })
  @ValidateIf((o: CreatePolicyVersionDto) => !o.blobUrl)
  @IsString()
  contentHtml?: string;

  @ApiPropertyOptional({
    description: 'Blob URL when content is stored externally',
  })
  @ValidateIf((o: CreatePolicyVersionDto) => !o.contentHtml)
  @IsString()
  @MaxLength(500)
  blobUrl?: string;

  @ApiProperty({ example: '2026-07-10' })
  @IsDateString()
  effectiveFrom: string;
}

export class PublishPolicyDto {
  @ApiPropertyOptional({
    description:
      'Optional draft version to publish. If omitted, publishes latest draft or creates from body.',
  })
  @IsOptional()
  @IsUUID()
  versionId?: string;

  @ApiPropertyOptional({
    description: 'HTML body when creating a new published version',
  })
  @IsOptional()
  @IsString()
  contentHtml?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  blobUrl?: string;

  @ApiPropertyOptional({ example: '2026-07-10' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}
