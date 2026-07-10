import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { UUIDFieldOptional } from '@/decorators/field.decorators';

export class QueryPayslipsDto extends PageOptionsDto {
  @UUIDFieldOptional()
  workerId?: string;
}
