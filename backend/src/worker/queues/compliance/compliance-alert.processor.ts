import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { ComplianceAlertScannerService } from '@/modules/automation/compliance-alert-scanner.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Daily compliance alert scan — Phase 1J.
 * Runs the baseline probation-end / visa-expiry scans, then evaluates any
 * tenant-defined `alert_rules` on top. See ComplianceAlertScannerService.
 */
@Processor(QueueEnum.Compliance)
export class ComplianceAlertProcessor extends WorkerHost {
  private readonly logger = new Logger(ComplianceAlertProcessor.name);

  constructor(private readonly scannerService: ComplianceAlertScannerService) {
    super();
  }

  async process(job: Job): Promise<{ alerts: number }> {
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
