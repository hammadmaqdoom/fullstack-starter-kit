import { Module } from '@nestjs/common';
import { AnalyticsModule } from './analytics/analytics.module';
import { ContentModule } from './content/content.module';
import { FileModule } from './file/file.module';
import { GeoModule } from './geo/geo.module';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';
import { NavigationModule } from './navigation/navigation.module';
import { SeoModule } from './seo/seo.module';
import { StructuredDataModule } from './structured-data/structured-data.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    HealthModule,
    UserModule,
    FileModule,
    AnalyticsModule,
    ContentModule,
    SeoModule,
    StructuredDataModule,
    MediaModule,
    NavigationModule,
    GeoModule,
  ],
})
export class ApiModule {}
