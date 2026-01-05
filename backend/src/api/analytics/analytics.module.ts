import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsConfigEntity } from './entities/analytics-config.entity';
import { SiteVerificationEntity } from './entities/site-verification.entity';
import { CustomScriptEntity } from './entities/custom-script.entity';
import { FeatureFlagEntity } from './entities/feature-flag.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsConfigEntity,
      SiteVerificationEntity,
      CustomScriptEntity,
      FeatureFlagEntity,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

