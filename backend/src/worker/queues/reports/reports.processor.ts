import { UserEntity } from '@/auth/entities/user.entity';
import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { AutomationService } from '@/modules/automation/automation.service';
import { ScheduledReportSubscriptionEntity } from '@/modules/automation/entities/scheduled-report-subscription.entity';
import { ReportCadence } from '@/modules/automation/enums/automation.enum';
import { ReportBlobStorageService } from '@/modules/automation/report-blob-storage.service';
import { rowsToCsv } from '@/modules/automation/utils/csv.util';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { MailService } from '@/shared/mail/mail.service';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job, Queue } from 'bullmq';
import { Repository } from 'typeorm';

const REPORT_LABELS: Record<string, string> = {
  headcount: 'Headcount',
  attrition: 'Attrition',
  leave_liability: 'Leave liability',
  policy_compliance: 'Policy compliance',
  visa_expiry: 'Visa expiry',
};

function isSubscriptionDue(
  subscription: ScheduledReportSubscriptionEntity,
  now: Date,
): boolean {
  if (!subscription.lastDeliveredAt) {
    return true;
  }

  const last = new Date(subscription.lastDeliveredAt);
  const msPerDay = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.floor((now.getTime() - last.getTime()) / msPerDay);

  switch (subscription.cadence) {
    case ReportCadence.DAILY:
      return elapsedDays >= 1;
    case ReportCadence.WEEKLY:
      return elapsedDays >= 7;
    case ReportCadence.MONTHLY:
      return (
        now.getUTCFullYear() !== last.getUTCFullYear() ||
        now.getUTCMonth() !== last.getUTCMonth()
      );
    default:
      return elapsedDays >= 7;
  }
}

/**
 * Async report export delivery — Phase 1 §1.7 (tasks.md).
 * `EvaluateDueSubscriptions` runs on a daily cron and fans out one
 * `DeliverSubscription` job per subscription whose cadence is due;
 * `DeliverSubscription` generates the CSV, stores it, and emails the link.
 */
@Processor(QueueEnum.Reports)
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(
    @InjectRepository(ScheduledReportSubscriptionEntity)
    private readonly subscriptionRepository: Repository<ScheduledReportSubscriptionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectQueue(QueueEnum.Reports)
    private readonly reportsQueue: Queue,
    private readonly automationService: AutomationService,
    private readonly reportBlobStorageService: ReportBlobStorageService,
    private readonly mailService: MailService,
    private readonly auditLogService: AuditLogService,
  ) {
    super();
  }

  async process(job: Job): Promise<Record<string, unknown>> {
    switch (job.name) {
      case JobEnum.Reports.EvaluateDueSubscriptions:
        return this.evaluateDueSubscriptions();
      case JobEnum.Reports.DeliverSubscription:
        return this.deliverSubscription(job.data?.subscriptionId as string);
      default:
        this.logger.warn(`Unknown reports job: ${job.name}`);
        return {};
    }
  }

  private async evaluateDueSubscriptions(): Promise<{ queued: number }> {
    const now = new Date();
    const subscriptions = await this.subscriptionRepository.find({
      where: { isActive: true },
    });

    let queued = 0;
    for (const subscription of subscriptions) {
      if (!isSubscriptionDue(subscription, now)) {
        continue;
      }
      await this.reportsQueue.add(
        JobEnum.Reports.DeliverSubscription,
        { subscriptionId: subscription.id },
        {
          removeOnComplete: true,
          attempts: 3,
          backoff: { type: 'exponential', delay: 10000 },
          jobId: `report-delivery-${subscription.id}-${now.toISOString().slice(0, 10)}`,
        },
      );
      queued += 1;
    }

    this.logger.log(
      `Report subscription evaluation: queued ${queued} delivery job(s)`,
    );
    return { queued };
  }

  private async deliverSubscription(
    subscriptionId: string,
  ): Promise<{ delivered: boolean; rows?: number }> {
    if (!subscriptionId) {
      return { delivered: false };
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });
    if (!subscription || !subscription.isActive) {
      this.logger.warn(
        `Subscription ${subscriptionId} not found or inactive — skipping delivery`,
      );
      return { delivered: false };
    }

    const tenantId = subscription.tenantId ?? DIGITARO_TENANT_ID;
    const recipient = await this.userRepository.findOne({
      where: { id: subscription.userId },
    });
    if (!recipient?.email) {
      this.logger.warn(
        `No recipient email for subscription ${subscriptionId} — skipping delivery`,
      );
      return { delivered: false };
    }

    const report = await this.automationService.runReport(
      subscription.reportType,
      subscription.filters ?? {},
      tenantId,
    );

    const csv = rowsToCsv(report.rows);
    const reportLabel =
      REPORT_LABELS[subscription.reportType] ?? subscription.reportType;
    const filename = `${subscription.reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
    const url = await this.reportBlobStorageService.uploadCsv(csv, filename);

    await this.mailService.sendReportExportReadyMail({
      email: recipient.email,
      recipientName: recipient.firstName ?? recipient.username ?? 'there',
      reportName: reportLabel,
      url,
    });

    subscription.lastDeliveredAt = new Date();
    await this.subscriptionRepository.save(subscription);

    await this.auditLogService.append({
      tenantId,
      actorId: subscription.userId,
      action: 'scheduled_report.deliver',
      entityType: 'scheduled_report_subscription',
      entityId: subscription.id,
      changes: {
        reportType: { old: null, new: subscription.reportType },
        rowCount: { old: null, new: report.rows.length },
        url: { old: null, new: url },
      },
    });

    this.logger.log(
      `Delivered ${subscription.reportType} export to ${recipient.email} (${report.rows.length} rows)`,
    );
    return { delivered: true, rows: report.rows.length };
  }
}
