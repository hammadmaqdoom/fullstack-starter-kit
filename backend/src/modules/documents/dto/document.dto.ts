import {
  DocumentAudience,
  DocumentTemplateStatus,
  DocumentType,
} from '@/modules/country-config/enums/setup-wizard.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { GeneratedDocumentStatus, RenderProfile } from '../enums/document.enum';

export class CreateDocumentTemplateDto {
  @ApiProperty({ example: 'PROBATION_CONFIRMATION' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ example: 'Probation Confirmation Letter' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiPropertyOptional({
    enum: DocumentAudience,
    default: DocumentAudience.EMPLOYEE,
  })
  @IsOptional()
  @IsEnum(DocumentAudience)
  audience?: DocumentAudience;

  @ApiPropertyOptional({
    example: 'AE',
    description: 'Null = applies to all countries',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employmentTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  divisionId?: string;
}

export class UpdateDocumentTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ enum: DocumentTemplateStatus })
  @IsOptional()
  @IsEnum(DocumentTemplateStatus)
  status?: DocumentTemplateStatus;

  @ApiPropertyOptional({ example: 'AE' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employmentTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  divisionId?: string;
}

export class CreateDocumentTemplateVersionDto {
  @ApiProperty({
    description: 'Rich-text HTML body with {{merge.field}} tokens',
    example: 'Dear {{worker.firstName}},<br/>Your offer is confirmed.',
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    description: 'Merge field descriptors keyed by token path',
    example: { 'worker.firstName': { type: 'string', label: 'First name' } },
  })
  @IsOptional()
  @IsObject()
  mergeFieldSchema?: Record<string, unknown>;
}

export class PublishDocumentTemplateVersionDto {
  @ApiPropertyOptional({
    description: 'Draft version to publish. Omit to publish the latest draft.',
  })
  @IsOptional()
  @IsUUID()
  versionId?: string;
}

export class GenerateDocumentDto {
  @ApiProperty({ description: 'Document template version to render' })
  @IsUUID()
  templateVersionId: string;

  @ApiProperty({ description: 'Worker the document is generated for' })
  @IsUUID()
  workerId: string;

  @ApiProperty({
    description:
      'Merge field values keyed by schema paths (e.g. worker.firstName)',
    example: { 'worker.firstName': 'Ada', 'worker.jobTitle': 'Engineer' },
  })
  @IsObject()
  mergeData: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Legal entity snapshot (optional for draft stub)',
  })
  @IsOptional()
  @IsUUID()
  legalEntityId?: string;
}

export class ExportDocumentQueryDto {
  @ApiPropertyOptional({
    enum: RenderProfile,
    default: RenderProfile.FULL_DIGITAL,
  })
  @IsOptional()
  @IsEnum(RenderProfile)
  renderProfile?: RenderProfile;
}

export class QueryDocumentRegisterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  legalEntityId?: string;

  @ApiPropertyOptional({ enum: GeneratedDocumentStatus })
  @IsOptional()
  @IsEnum(GeneratedDocumentStatus)
  status?: GeneratedDocumentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiPropertyOptional({
    description: 'Document template code, e.g. OFFER_LETTER',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  templateCode?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
