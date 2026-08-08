import { LegalEntityRenderProfile } from '@/modules/core-hr/enums/org.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class LetterheadMarginsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  top?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bottom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  left?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  right?: number;
}

class LetterheadHeaderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showRegisteredName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showTradingName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showAddress?: boolean;
}

class LetterheadFooterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPageNumbers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customText?: string;
}

class LetterheadPhysicalStockDto {
  @ApiPropertyOptional({
    description:
      'Enables the print_on_letterhead render profile for this version',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Body top margin (mm) — calibrates content zone below pre-printed header',
  })
  @IsOptional()
  @IsNumber()
  contentTopMarginMm?: number;

  @ApiPropertyOptional({
    description:
      'Body bottom margin (mm) — calibrates footer/signature zone above pre-printed footer',
  })
  @IsOptional()
  @IsNumber()
  contentBottomMarginMm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPrintWatermark?: boolean;
}

export class LetterheadLayoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  logo?: { position?: string; maxHeightPx?: number };

  @ApiPropertyOptional({ type: LetterheadHeaderDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LetterheadHeaderDto)
  header?: LetterheadHeaderDto;

  @ApiPropertyOptional({ type: LetterheadFooterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LetterheadFooterDto)
  footer?: LetterheadFooterDto;

  @ApiPropertyOptional({ type: LetterheadMarginsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LetterheadMarginsDto)
  margins?: LetterheadMarginsDto;

  @ApiPropertyOptional({ type: LetterheadPhysicalStockDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LetterheadPhysicalStockDto)
  physicalStock?: LetterheadPhysicalStockDto;
}

export class CreateLetterheadConfigDto {
  @ApiProperty()
  @IsUUID()
  legalEntityId: string;

  @ApiProperty({ type: LetterheadLayoutDto })
  @ValidateNested()
  @Type(() => LetterheadLayoutDto)
  layout: LetterheadLayoutDto;

  @ApiPropertyOptional({
    description: 'Override entity logo for this version only',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoBlobUrl?: string;

  @ApiPropertyOptional({
    description: 'Defaults to now; changes apply to future generations only',
  })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}

export class UpdateLegalEntityDocumentOutputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresWetStamp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  stampInstructions?: string;

  @ApiPropertyOptional({ enum: LegalEntityRenderProfile })
  @IsOptional()
  @IsEnum(LegalEntityRenderProfile)
  defaultRenderProfile?: LegalEntityRenderProfile;
}
