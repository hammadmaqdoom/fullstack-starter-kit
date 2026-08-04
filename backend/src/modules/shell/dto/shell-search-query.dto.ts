import { NumberFieldOptional, StringFieldOptional } from '@/decorators/field.decorators';

export class ShellSearchQueryDto {
  @StringFieldOptional()
  q?: string;

  @NumberFieldOptional({ int: true, minimum: 1, maximum: 50 })
  limit?: number;
}
