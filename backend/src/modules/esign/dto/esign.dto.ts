import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { EsignFieldType } from '../enums/esign.enum';

export class CreateEsignSignatoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiProperty({ example: 'signer@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  signingOrder: number;
}

export class CreateEsignFieldDto {
  @ApiProperty({ description: '0-based index into signatories array' })
  @IsInt()
  @Min(0)
  signatoryIndex: number;

  @ApiProperty({ enum: EsignFieldType })
  @IsEnum(EsignFieldType)
  fieldType: EsignFieldType;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  page: number;

  @ApiProperty()
  @IsNumber()
  x: number;

  @ApiProperty()
  @IsNumber()
  y: number;

  @ApiProperty()
  @IsNumber()
  width: number;

  @ApiProperty()
  @IsNumber()
  height: number;
}

export class CreateEsignEnvelopeDto {
  @ApiProperty({ example: 'Offer letter — Jane Doe' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  documentBlobUrl?: string;

  @ApiProperty({ type: [CreateEsignSignatoryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateEsignSignatoryDto)
  signatories: CreateEsignSignatoryDto[];

  @ApiPropertyOptional({ type: [CreateEsignFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEsignFieldDto)
  fields?: CreateEsignFieldDto[];
}

export class SignEsignEnvelopeDto {
  @ApiProperty()
  @IsUUID()
  signatoryId: string;

  @ApiProperty({ description: 'Captured signature image blob URL or data URL' })
  @IsString()
  @MaxLength(500)
  signatureBlobUrl: string;
}

export class VoidEsignEnvelopeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ManualUploadEsignDto {
  @ApiProperty({ description: 'Blob URL of wet-signed PDF' })
  @IsString()
  @MaxLength(500)
  signedCopyBlobUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class IssueSigningTokenDto {
  @ApiProperty()
  @IsUUID()
  signatoryId: string;

  @ApiPropertyOptional({
    description: 'Token TTL in hours (default 72)',
    example: 72,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  ttlHours?: number;
}

export class CompleteSigningWithTokenDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  token: string;

  @ApiProperty({ description: 'Captured signature image blob URL or data URL' })
  @IsString()
  @MaxLength(500)
  signatureBlobUrl: string;
}
