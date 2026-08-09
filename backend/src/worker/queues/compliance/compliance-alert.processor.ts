import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { ComplianceAlertScannerService } from '@/modules/automation/compliance-alert-scanner.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { ControlTestRunnerService } from '@/modules/compliance/control-test-runner.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Daily compliance jobs — alert scan + people-domain control tests.
 */
@Processor(QueueEnum.Compliance)
export class ComplianceAlertProcessor extends WorkerHost {
  private readonly logger = new Logger(ComplianceAlertProcessor.name);

  constructor(
    private readonly scannerService: ComplianceAlertScannerService,
    private readonly controlTestRunner: ControlTestRunnerService,
  ) {
    super();
  }

  async process(
    job: Job,
  ): Promise<{ alerts?: number; controlRuns?: number }> {
    if (job.name === JobEnum.Compliance.ScanControlTests) {
      const controlRuns =
        await this.controlTestRunner.runScheduledForAllTenants();
      this.logger.log(
        `Control test scan ${job.id}: runs=${controlRuns}`,
      );
      return { controlRuns };
    }

    if (job.name !== JobEnum.Compliance.ScanAlerts) {
      return { alerts: 0 };
    }

    const tenantId = (job.data?.tenantId as string) ?? DIGITARO_TENANT_ID;
    const result = await this.scannerService.scan(tenantId);
    this.logger.log(
      `Compliance scan ${job.id}: evaluated=${result.evaluated} created=${result.created}`,
    );
    return { alerts: result.created };
  }
}
