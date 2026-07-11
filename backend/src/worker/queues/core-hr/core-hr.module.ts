import { Queue as QueueEnum } from '@/constants/job.constant';
import { CoreHrModule as CoreHrBusinessModule } from '@/modules/core-hr/core-hr.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CoreHrProcessor } from './core-hr.processor';

@Module({
  imports: [
    CoreHrBusinessModule,
    BullModule.registerQueue({ name: QueueEnum.CoreHr }),
  ],
  providers: [CoreHrProcessor],
})
export class CoreHrQueueModule {}
