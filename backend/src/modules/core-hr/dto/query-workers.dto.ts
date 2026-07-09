import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { EnumFieldOptional, StringFieldOptional } from '@/decorators/field.decorators';
import { WorkerStatus } from '../enums/worker.enum';

export class QueryWorkersDto extends PageOptionsDto {
  @EnumFieldOptional(() => WorkerStatus)
  status?: WorkerStatus;

  @StringFieldOptional()
  countryCode?: string;

  @StringFieldOptional()
  employmentTypeId?: string;

  @StringFieldOptional()
  divisionId?: string;
}
