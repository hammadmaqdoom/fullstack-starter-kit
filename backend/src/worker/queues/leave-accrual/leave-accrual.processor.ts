import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { LeaveAccrualService } from '@/modules/time-leave/leave-accrual.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Monthly leave accrual — Phase 1 §1.2.
 * Credits leave_balances from leave_types.accrualMethod × daysPerYear,
 * employment_type_country_configs (leaveEnabled + leaveEntitlements overrides),
 * with pro-ration and carry-forward. Idempotent via audit_log leave.accrual.*.
 */
@Processor(QueueEnum.LeaveAccrual)
export class LeaveAccrualProcessor extends WorkerHost {
  private readonly logger = new Logger(LeaveAccrualProcessor.name);

  constructor(private readonly leaveAccrualService: LeaveAccrualService) {
    super();
  }

  async process(job: Job): Promise<{ processed: number; credited: number }> {
    if (job.name !== JobEnum.LeaveAccrual.MonthlyAccrue) {
      return { processed: 0, credited: 0 };
    }

    const asOfRaw = job.data?.asOf as string | undefined;
    const asOf = asOfRaw ? new Date(asOfRaw) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      this.logger.warn(`Invalid asOf on job ${job.id}: ${asOfRaw}`);
      return { processed: 0, credited: 0 };
    }

    const result = await this.leaveAccrualService.runMonthlyAccrual(asOf);
    this.logger.log(
      `Leave accrual job ${job.id} complete: credited=${result.credited} processed=${result.processed}`,
    );
    return { processed: result.processed, credited: result.credited };
  }
}
