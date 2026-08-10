import { Job, Queue } from '@/constants/job.constant';
import { PayrollModule } from '@/modules/payroll/payroll.module';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Module, OnModuleInit } from '@nestjs/common';
import type { Queue as BullQueue } from 'bullmq';
import { BankFeedProcessor } from './bank-feed.processor';

@Module({
  imports: [
    PayrollModule,
    BullModule.registerQueue({
      name: Queue.BankFeed,
    }),
  ],
  providers: [BankFeedProcessor],
})
export class BankFeedQueueModule implements OnModuleInit {
  constructor(
    @InjectQueue(Queue.BankFeed) private readonly bankFeedQueue: BullQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bankFeedQueue.add(
      Job.BankFeed.SyncAspireFeeds,
      {},
      {
        repeat: { pattern: '0 7 * * *' },
        jobId: 'bank-feed-aspire-daily',
      },
    );
  }
}
