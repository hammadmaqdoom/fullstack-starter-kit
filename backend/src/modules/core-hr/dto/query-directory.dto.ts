import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { StringFieldOptional } from '@/decorators/field.decorators';

export class QueryDirectoryDto extends PageOptionsDto {
  @StringFieldOptional()
  divisionId?: string;

  @StringFieldOptional()
  departmentId?: string;

  @StringFieldOptional()
  countryCode?: string;
}
