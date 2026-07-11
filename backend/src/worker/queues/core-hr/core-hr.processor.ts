import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { WorkerImportService } from '@/modules/core-hr/worker-import.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

interface ImportWorkersJobData {
  batchId: string;
  tenantId: string;
  actorId: string;
}

@Processor(QueueEnum.CoreHr)
export class CoreHrProcessor extends WorkerHost {
  private readonly logger = new Logger(CoreHrProcessor.name);

  constructor(private readonly workerImportService: WorkerImportService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JobEnum.CoreHr.ImportWorkers: {
        const { batchId, tenantId, actorId } = job.data as ImportWorkersJobData;
        await this.workerImportService.processBatch(batchId, tenantId, actorId);
        return;
      }
      default:
        this.logger.warn(`Unknown core-hr job: ${job.name}`);
    }
  }
}
