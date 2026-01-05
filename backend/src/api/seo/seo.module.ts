import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeoMetadataEntity } from './entities/seo-metadata.entity';
import { RedirectEntity } from './entities/redirect.entity';
import { ContentEntity } from '@/api/content/entities/content.entity';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [TypeOrmModule.forFeature([SeoMetadataEntity, RedirectEntity, ContentEntity])],
  controllers: [SeoController],
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {}

