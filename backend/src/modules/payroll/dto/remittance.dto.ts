import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import {
  BooleanFieldOptional,
  EnumField,
  EnumFieldOptional,
  StringField,
  StringFieldOptional,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsOptional } from 'class-validator';
import {
  RemittanceCorridorAppliesTo,
  RemittanceDocumentType,
} from '../enums/remittance.enum';

export class CreateRemittanceCorridorConfigDto {
  @StringField({ minLength: 2, maxLength: 2, toUpperCase: true })
  payerCountryCode!: string;

  @StringField({ minLength: 2, maxLength: 2, toUpperCase: true })
  beneficiaryBankCountryCode!: string;

  @UUIDFieldOptional()
  legalEntityId?: string;

  @EnumField(() => RemittanceCorridorAppliesTo)
  appliesTo!: RemittanceCorridorAppliesTo;

  @ApiPropertyOptional({
    type: [String],
    enum: RemittanceDocumentType,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(RemittanceDocumentType, { each: true })
  requiredDocTypes!: RemittanceDocumentType[];

  @BooleanFieldOptional()
  isActive?: boolean;

  @StringField()
  effectiveFrom!: string;
}

export class UpdateRemittanceCorridorConfigDto {
  @UUIDFieldOptional()
  legalEntityId?: string;

  @EnumFieldOptional(() => RemittanceCorridorAppliesTo)
  appliesTo?: RemittanceCorridorAppliesTo;

  @ApiPropertyOptional({
    type: [String],
    enum: RemittanceDocumentType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(RemittanceDocumentType, { each: true })
  requiredDocTypes?: RemittanceDocumentType[];

  @BooleanFieldOptional()
  isActive?: boolean;

  @StringFieldOptional()
  effectiveFrom?: string;
}

export class QueryRemittanceCorridorConfigsDto extends PageOptionsDto {
  @UUIDFieldOptional()
  legalEntityId?: string;

  @StringFieldOptional({ minLength: 2, maxLength: 2, toUpperCase: true })
  payerCountryCode?: string;

  @StringFieldOptional({ minLength: 2, maxLength: 2, toUpperCase: true })
  beneficiaryBankCountryCode?: string;

  @EnumFieldOptional(() => RemittanceCorridorAppliesTo)
  appliesTo?: RemittanceCorridorAppliesTo;
}

export class UploadRemittanceDocumentDto {
  @EnumField(() => RemittanceDocumentType)
  documentType!: RemittanceDocumentType;
}
