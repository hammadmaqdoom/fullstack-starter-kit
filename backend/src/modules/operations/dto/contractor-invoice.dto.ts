import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { StringFieldOptional } from '@/decorators/field.decorators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ContractorInvoiceStatus } from '../enums/contractor-invoice.enum';

/** OCR-assist stub (PRD §6.20.2) — no real OCR provider wired up in Phase 2 Wave 4. */
export interface ContractorInvoiceOcrPrefill {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  currencyCode?: string;
  grossAmount?: number;
  [key: string]: unknown;
}

export class OcrPrefillInvoiceDto {
  @ApiPropertyOptional({
    description: 'Blob URL of the uploaded invoice file to prefill fields from',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  blobUrl?: string;
}

export class ContractorInvoiceLineItemDto {
  @ApiProperty({ example: 'Backend development — Sprint 42' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateContractorInvoiceDto {
  @ApiProperty()
  @IsUUID()
  legalEntityId: string;

  @ApiPropertyOptional({
    description:
      'Contractor-linked worker. Omit when the contractor is creating their own invoice.',
  })
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiProperty({ example: 'INV-2026-0042' })
  @IsString()
  @MaxLength(50)
  invoiceNumber: string;

  @ApiProperty()
  @IsDateString()
  invoiceDate: string;

  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  servicePeriodFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  servicePeriodTo?: string;

  @ApiProperty({ minLength: 3, maxLength: 3, example: 'USD' })
  @IsString()
  @MaxLength(3)
  currencyCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({ description: "Contractor's own invoice PDF/image" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pdfBlobUrl?: string;

  @ApiProperty({ type: [ContractorInvoiceLineItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContractorInvoiceLineItemDto)
  lineItems: ContractorInvoiceLineItemDto[];
}

export class UpdateContractorInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  servicePeriodFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  servicePeriodTo?: string;

  @ApiPropertyOptional({ minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pdfBlobUrl?: string;

  @ApiPropertyOptional({ type: [ContractorInvoiceLineItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContractorInvoiceLineItemDto)
  lineItems?: ContractorInvoiceLineItemDto[];
}

export class QueryContractorInvoicesDto extends PageOptionsDto {
  @StringFieldOptional()
  workerId?: string;

  @ApiPropertyOptional({ enum: ContractorInvoiceStatus })
  @IsOptional()
  @IsEnum(ContractorInvoiceStatus)
  status?: ContractorInvoiceStatus;
}

export class RejectContractorInvoiceDto {
  @ApiProperty({ example: 'Amount does not match approved SOW budget' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}
