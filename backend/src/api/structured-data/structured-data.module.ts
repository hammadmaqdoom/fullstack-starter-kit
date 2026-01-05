import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JsonLdSchemaEntity } from './entities/json-ld-schema.entity';
import { StructuredDataTemplateEntity } from './entities/structured-data-template.entity';
import { ContentEntity } from '@/api/content/entities/content.entity';
import { StructuredDataController } from './structured-data.controller';
import { StructuredDataService } from './structured-data.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JsonLdSchemaEntity,
      StructuredDataTemplateEntity,
      ContentEntity,
    ]),
  ],
  controllers: [StructuredDataController],
  providers: [StructuredDataService],
  exports: [StructuredDataService],
})
export class StructuredDataModule {}

