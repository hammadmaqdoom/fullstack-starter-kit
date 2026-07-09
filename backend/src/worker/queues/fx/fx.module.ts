import { Queue } from '@/constants/job.constant';
import {
  ExchangeRateEntity,
  ExchangeRateFetchBatchEntity,
} from '@/modules/country-config/entities/exchange-rate.entity';
import { BullModule } from '@nestjs/bullmq';
import { Module, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Queue as BullQueue } from 'bullmq';
import { Job } from '@/constants/job.constant';
import { FxFetchProcessor } from './fx-fetch.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExchangeRateEntity, ExchangeRateFetchBatchEntity]),
    BullModule.registerQueue({
      name: Queue.Fx,
    }),
  ],
  providers: [FxFetchProcessor],
})
export class FxQueueModule implements OnModuleInit {
  constructor(@InjectQueue(Queue.Fx) private readonly fxQueue: BullQueue) {}

  async onModuleInit(): Promise<void> {
    await this.fxQueue.add(
      Job.Fx.FetchRates,
      {},
      {
        repeat: { pattern: '0 6 * * *' },
        jobId: 'fx-fetch-daily',
      },
    );
  }
}
