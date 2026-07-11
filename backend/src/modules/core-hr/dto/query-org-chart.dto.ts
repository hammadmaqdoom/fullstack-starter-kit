import { NumberFieldOptional, StringFieldOptional } from '@/decorators/field.decorators';

export class QueryOrgChartDto {
  @StringFieldOptional()
  rootId?: string;

  @NumberFieldOptional({ minimum: 0, maximum: 10, int: true, default: 2 })
  depth?: number = 2;
}
