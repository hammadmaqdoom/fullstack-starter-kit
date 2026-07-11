import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { TalentModule as TalentBusinessModule } from '@/modules/talent/talent.module';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Module, OnModuleInit } from '@nestjs/common';
import type { Queue as BullQueue } from 'bullmq';
import { TalentProcessor } from './talent.processor';

@Module({
  imports: [
    TalentBusinessModule,
    BullModule.registerQueue({ name: QueueEnum.Talent }),
  ],
  providers: [TalentProcessor],
})
export class TalentQueueModule implements OnModuleInit {
  constructor(
    @InjectQueue(QueueEnum.Talent)
    private readonly talentQueue: BullQueue,
  ) {}

  /**
   * Daily cron — merges submitted/approved pre-boarding packets for workers
   * whose start date has arrived (FLW-TAL-006). Runs after the check-in
   * nudge scan so morning HR ops see freshly merged profiles.
   */
  async onModuleInit(): Promise<void> {
    await this.talentQueue.add(
      JobEnum.Talent.PreBoardingMergeOnStartDate,
      {},
      {
        repeat: { pattern: '30 1 * * *' },
        jobId: 'pre-boarding-merge-on-start-date',
        removeOnComplete: true,
      },
    );

    // FLW-TAL-004 — auto-creates a probation review cycle T-14 days before
    // `probationEndDate` so People Ops/managers have runway to complete it.
    await this.talentQueue.add(
      JobEnum.Talent.ProbationAutoCycle,
      {},
      {
        repeat: { pattern: '0 2 * * *' },
        jobId: 'probation-auto-cycle',
        removeOnComplete: true,
      },
    );
  }
}
