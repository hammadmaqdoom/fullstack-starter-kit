import {
  EnumFieldOptional,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { ExportFileFormat } from '../enums/payroll.enum';

export class ExportPayRunDto {
  @EnumFieldOptional(() => ExportFileFormat)
  fileFormat?: ExportFileFormat;

  @UUIDFieldOptional()
  exportProfileId?: string;
}
