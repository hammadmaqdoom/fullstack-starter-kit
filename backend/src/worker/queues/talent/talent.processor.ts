import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { PreBoardingMergeService } from '@/modules/talent/pre-boarding-merge.service';
import { TalentService } from '@/modules/talent/talent.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor(QueueEnum.Talent)
export class TalentProcessor extends WorkerHost {
  private readonly logger = new Logger(TalentProcessor.name);

  constructor(
    private readonly preBoardingMergeService: PreBoardingMergeService,
    private readonly talentService: TalentService,
  ) {
    super();
  }

  async process(job: Job): Promise<Record<string, unknown>> {
    switch (job.name) {
      case JobEnum.Talent.PreBoardingMergeOnStartDate: {
        const packetId = (job.data as { packetId?: string })?.packetId;
        if (packetId) {
          return this.preBoardingMergeService.mergePacket(packetId);
        }
        return this.preBoardingMergeService.runDailyMergeScan();
      }
      case JobEnum.Talent.ProbationAutoCycle: {
        return this.talentService.runProbationAutoCycle();
      }
      default:
        this.logger.warn(`Unknown talent job: ${job.name}`);
        return {};
    }
  }
}
