import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { AutomationModule } from '@/modules/automation/automation.module';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Module, OnModuleInit } from '@nestjs/common';
import type { Queue as BullQueue } from 'bullmq';
import { ComplianceAlertProcessor } from './compliance-alert.processor';

@Module({
  imports: [
    AutomationModule,
    BullModule.registerQueue({ name: QueueEnum.Compliance }),
  ],
  providers: [ComplianceAlertProcessor],
})
export class ComplianceQueueModule implements OnModuleInit {
  constructor(
    @InjectQueue(QueueEnum.Compliance)
    private readonly complianceQueue: BullQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.complianceQueue.add(
      JobEnum.Compliance.ScanAlerts,
      {},
      {
        repeat: { pattern: '0 6 * * *' },
        jobId: 'compliance-daily-alert-scan',
        removeOnComplete: true,
      },
    );
  }
}
