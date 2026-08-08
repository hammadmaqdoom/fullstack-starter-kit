import { Queue as QueueEnum } from '@/constants/job.constant';
import { EsignModule } from '@/modules/esign/esign.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EsignProcessor } from './esign.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: QueueEnum.Esign }),
    EsignModule,
  ],
  providers: [EsignProcessor],
})
export class EsignQueueModule {}
