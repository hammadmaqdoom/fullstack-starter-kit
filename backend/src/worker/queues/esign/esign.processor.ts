import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { EsignModule } from '@/modules/esign/esign.module';
import { EsignService } from '@/modules/esign/esign.service';
import type { IPadesSealingService } from '@/modules/esign/interfaces/pades-sealing.interface';
import { PADES_SEALING_SERVICE } from '@/modules/esign/interfaces/pades-sealing.interface';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

type SealJobData = { envelopeId: string; tenantId: string };

@Processor(QueueEnum.Esign)
export class EsignProcessor extends WorkerHost {
  private readonly logger = new Logger(EsignProcessor.name);

  constructor(
    private readonly esignService: EsignService,
    @Inject(PADES_SEALING_SERVICE)
    private readonly padesSealing: IPadesSealingService,
  ) {
    super();
  }

  async process(job: Job): Promise<Record<string, unknown>> {
    switch (job.name) {
      case JobEnum.Esign.SealPades: {
        const data = job.data as SealJobData;
        this.logger.log(
          `PAdES seal job ${job.id} for envelope ${data.envelopeId} (configured=${this.padesSealing.isConfigured()})`,
        );
        const result = await this.esignService.processSealJob(
          data.envelopeId,
          data.tenantId ?? DIGITARO_TENANT_ID,
        );
        this.logger.log(
          `PAdES seal job ${job.id} result: sealed=${result.sealed} reason=${result.reason}`,
        );
        return { sealed: result.sealed, reason: result.reason };
      }
      case JobEnum.Esign.SendReminders:
      case JobEnum.Esign.ExpireEnvelopes: {
        const tenantId =
          (job.data as { tenantId?: string })?.tenantId ?? DIGITARO_TENANT_ID;
        const result =
          await this.esignService.processReminderAndExpiryScan(tenantId);
        this.logger.log(
          `E-sign reminder/expiry scan: reminders=${result.remindersQueued} expired=${result.expired}`,
        );
        return result;
      }
      default:
        this.logger.warn(`Unknown esign job: ${job.name}`);
        return {};
    }
  }
}
