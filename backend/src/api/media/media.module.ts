import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaEntity } from './entities/media.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { AwsModule } from '@/services/aws/aws.module';
import { LocalStorageService } from '@/services/local-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaEntity]),
    AwsModule,
  ],
  controllers: [MediaController],
  providers: [MediaService, LocalStorageService],
  exports: [MediaService],
})
export class MediaModule {}

