import { PartialType } from '@nestjs/mapped-types';
import { CreateAnalyticsConfigDto } from './create-analytics-config.dto';

export class UpdateAnalyticsConfigDto extends PartialType(
  CreateAnalyticsConfigDto,
) {}

