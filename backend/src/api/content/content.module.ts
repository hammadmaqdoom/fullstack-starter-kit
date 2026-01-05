import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentEntity } from './entities/content.entity';
import { CategoryEntity } from './entities/category.entity';
import { TagEntity } from './entities/tag.entity';
import { ContentVersionEntity } from './entities/content-version.entity';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentEntity,
      CategoryEntity,
      TagEntity,
      ContentVersionEntity,
    ]),
  ],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}

