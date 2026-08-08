import { UserEntity } from '@/auth/entities/user.entity';
import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { AutomationModule } from '@/modules/automation/automation.module';
import { ScheduledReportSubscriptionEntity } from '@/modules/automation/entities/scheduled-report-subscription.entity';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { AuditLogEntity } from '@/modules/compliance/entities/audit-log.entity';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Queue as BullQueue } from 'bullmq';
import { ReportsProcessor } from './reports.processor';

@Module({
  imports: [
    AutomationModule,
    TypeOrmModule.forFeature([
      ScheduledReportSubscriptionEntity,
      UserEntity,
      AuditLogEntity,
    ]),
    BullModule.registerQueue({ name: QueueEnum.Reports }),
  ],
  providers: [ReportsProcessor, AuditLogService],
})
export class ReportsQueueModule implements OnModuleInit {
  constructor(
    @InjectQueue(QueueEnum.Reports)
    private readonly reportsQueue: BullQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reportsQueue.add(
      JobEnum.Reports.EvaluateDueSubscriptions,
      {},
      {
        repeat: { pattern: '0 5 * * *' },
        jobId: 'reports-daily-evaluate-due-subscriptions',
        removeOnComplete: true,
      },
    );
  }
}
