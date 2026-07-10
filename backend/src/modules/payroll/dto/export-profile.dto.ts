import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import {
  BooleanFieldOptional,
  ClassField,
  EnumFieldOptional,
  StringField,
  StringFieldOptional,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { ExportFileFormat } from '../enums/payroll.enum';

export class ColumnMappingDto {
  @StringField()
  key!: string;

  @StringField()
  header!: string;
}

export class CreateExportProfileDto {
  @UUIDFieldOptional({ nullable: true })
  legalEntityId?: string | null;

  @StringFieldOptional({ minLength: 2, maxLength: 2, nullable: true })
  countryCode?: string | null;

  @StringField({ maxLength: 100 })
  name!: string;

  @ClassField(() => ColumnMappingDto, { each: true })
  columnMappings!: ColumnMappingDto[];

  @EnumFieldOptional(() => ExportFileFormat, { each: true })
  fileFormats?: ExportFileFormat[];

  @BooleanFieldOptional()
  isDefault?: boolean;
}

export class QueryExportProfilesDto extends PageOptionsDto {
  @UUIDFieldOptional()
  legalEntityId?: string;
}
