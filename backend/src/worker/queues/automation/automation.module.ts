import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { AutomationModule as AutomationBusinessModule } from '@/modules/automation/automation.module';
import { TimeLeaveModule } from '@/modules/time-leave/time-leave.module';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Module, OnModuleInit } from '@nestjs/common';
import type { Queue as BullQueue } from 'bullmq';
import { AutomationProcessor } from './automation.processor';

@Module({
  imports: [
    AutomationBusinessModule,
    TimeLeaveModule,
    BullModule.registerQueue({ name: QueueEnum.Automation }),
  ],
  providers: [AutomationProcessor],
})
export class AutomationQueueModule implements OnModuleInit {
  constructor(
    @InjectQueue(QueueEnum.Automation)
    private readonly automationQueue: BullQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.automationQueue.add(
      JobEnum.Automation.ScanCheckInNudges,
      {},
      {
        repeat: { pattern: '0 10 * * 1-5' },
        jobId: 'automation-daily-check-in-nudge',
        removeOnComplete: true,
      },
    );
  }
}
