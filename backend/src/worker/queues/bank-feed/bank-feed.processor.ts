import { Job, Queue } from '@/constants/job.constant';
import { BankFeedSyncService } from '@/modules/payroll/bank-feed-sync.service';
import { PayrollModule } from '@/modules/payroll/payroll.module';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job as BullJob } from 'bullmq';

@Injectable()
@Processor(Queue.BankFeed)
export class BankFeedProcessor extends WorkerHost {
  private readonly logger = new Logger(BankFeedProcessor.name);

  constructor(private readonly bankFeedSyncService: BankFeedSyncService) {
    super();
  }

  async process(job: BullJob): Promise<void> {
    if (job.name !== Job.BankFeed.SyncAspireFeeds) {
      return;
    }
    const total = await this.bankFeedSyncService.syncAllTenantsAspireAccounts();
    this.logger.log(`Aspire bank feed sync completed — upserted ${total} rows`);
  }
}
