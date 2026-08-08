import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { MailService } from '@/shared/mail/mail.service';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AlertRuleEntity } from './entities/alert-rule.entity';
import { ComplianceAlertEntity } from './entities/compliance-alert.entity';
import {
  AlertRuleChannel,
  ComplianceAlertSeverity,
  ComplianceAlertStatus,
  ComplianceAlertType,
} from './enums/automation.enum';
import { TeamsNotificationService } from './teams-notification.service';

type ScanCondition = {
  metric: ComplianceAlertType;
  withinDays: number;
  severity: ComplianceAlertSeverity;
  sourceRuleId: string | null;
  channel: AlertRuleChannel | null;
};

type WorkerAlertRow = {
  id: string;
  firstName: string;
  lastName: string;
  dueDate: string;
  managerUserId: string | null;
  managerEmail: string | null;
  managerFirstName: string | null;
};

const frontendUrl = (): string =>
  process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Daily compliance alert scan (Phase 1J, tasks.md §1.7). Always runs the
 * baseline probation/visa expiry scans, then evaluates any tenant-defined
 * `alert_rules` on top — extends the processor rather than replacing the
 * baseline behaviour.
 */
@Injectable()
export class ComplianceAlertScannerService {
  private readonly logger = new Logger(ComplianceAlertScannerService.name);

  private static readonly BASELINE_CONDITIONS: Omit<
    ScanCondition,
    'sourceRuleId' | 'channel'
  >[] = [
    {
      metric: ComplianceAlertType.PROBATION_END,
      withinDays: 7,
      severity: ComplianceAlertSeverity.WARNING,
    },
    {
      metric: ComplianceAlertType.VISA_EXPIRY,
      withinDays: 30,
      severity: ComplianceAlertSeverity.WARNING,
    },
  ];

  constructor(
    @InjectRepository(ComplianceAlertEntity)
    private readonly alertRepository: Repository<ComplianceAlertEntity>,
    @InjectRepository(AlertRuleEntity)
    private readonly alertRuleRepository: Repository<AlertRuleEntity>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly teamsNotificationService: TeamsNotificationService,
  ) {}

  async scan(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<{ evaluated: number; created: number }> {
    const rules = await this.alertRuleRepository.find({
      where: { tenantId, isActive: true },
    });

    const conditions: ScanCondition[] = [
      ...ComplianceAlertScannerService.BASELINE_CONDITIONS.map((c) => ({
        ...c,
        sourceRuleId: null,
        channel: null,
      })),
      ...rules
        .filter((rule) => this.isSupportedMetric(rule.conditionJson?.metric))
        .map((rule) => ({
          metric: rule.conditionJson.metric,
          withinDays: rule.conditionJson.withinDays,
          severity:
            (rule.conditionJson.severity as ComplianceAlertSeverity) ??
            ComplianceAlertSeverity.INFO,
          sourceRuleId: rule.id,
          channel: rule.channel,
        })),
    ];

    let created = 0;
    for (const condition of conditions) {
      if (condition.metric === ComplianceAlertType.PROBATION_END) {
        created += await this.scanProbationEnd(tenantId, condition);
      } else if (condition.metric === ComplianceAlertType.VISA_EXPIRY) {
        created += await this.scanVisaExpiry(tenantId, condition);
      }
    }

    this.logger.log(
      `Compliance scan for tenant ${tenantId}: evaluated ${conditions.length} condition(s), created ${created} alert(s)`,
    );
    return { evaluated: conditions.length, created };
  }

  private isSupportedMetric(metric?: ComplianceAlertType): boolean {
    return (
      metric === ComplianceAlertType.PROBATION_END ||
      metric === ComplianceAlertType.VISA_EXPIRY
    );
  }

  private async scanProbationEnd(
    tenantId: string,
    condition: ScanCondition,
  ): Promise<number> {
    const rows: WorkerAlertRow[] = await this.dataSource.query(
      `
      SELECT
        w.id AS "id",
        w."firstName" AS "firstName",
        w."lastName" AS "lastName",
        to_char(w."probationEndDate", 'YYYY-MM-DD') AS "dueDate",
        m."userId" AS "managerUserId",
        m.email AS "managerEmail",
        m."firstName" AS "managerFirstName"
      FROM workers w
      LEFT JOIN workers m ON m.id = w."managerId"
      WHERE w."tenantId" = $1
        AND w.status = 'active'
        AND w."probationEndDate" IS NOT NULL
        AND w."probationEndDate" BETWEEN CURRENT_DATE AND (CURRENT_DATE + $2::int)
      `,
      [tenantId, condition.withinDays],
    );

    return this.persistAndDispatch(
      tenantId,
      condition,
      rows,
      (row) => `Probation ending soon for ${row.firstName} ${row.lastName}`,
    );
  }

  private async scanVisaExpiry(
    tenantId: string,
    condition: ScanCondition,
  ): Promise<number> {
    const rows: WorkerAlertRow[] = await this.dataSource.query(
      `
      SELECT
        w.id AS "id",
        w."firstName" AS "firstName",
        w."lastName" AS "lastName",
        to_char(v."expiryDate", 'YYYY-MM-DD') AS "dueDate",
        m."userId" AS "managerUserId",
        m.email AS "managerEmail",
        m."firstName" AS "managerFirstName"
      FROM worker_visa_records v
      INNER JOIN workers w ON w.id = v."workerId"
      LEFT JOIN workers m ON m.id = w."managerId"
      WHERE v."tenantId" = $1
        AND w.status = 'active'
        AND v."expiryDate" IS NOT NULL
        AND v."cancellationDate" IS NULL
        AND v."supersededById" IS NULL
        AND v."expiryDate" BETWEEN CURRENT_DATE AND (CURRENT_DATE + $2::int)
      `,
      [tenantId, condition.withinDays],
    );

    return this.persistAndDispatch(
      tenantId,
      condition,
      rows,
      (row) => `Visa/permit expiring for ${row.firstName} ${row.lastName}`,
    );
  }

  private async persistAndDispatch(
    tenantId: string,
    condition: ScanCondition,
    rows: WorkerAlertRow[],
    titleFor: (row: WorkerAlertRow) => string,
  ): Promise<number> {
    let created = 0;
    for (const row of rows) {
      const title = titleFor(row);
      const isNew = await this.upsertAlert({
        tenantId,
        workerId: row.id,
        alertType: condition.metric,
        title,
        dueDate: row.dueDate,
        severity: condition.severity,
        sourceRuleId: condition.sourceRuleId,
      });

      if (isNew) {
        created += 1;
        await this.dispatch(condition, row, title);
      }
    }
    return created;
  }

  private async upsertAlert(input: {
    tenantId: string;
    workerId: string;
    alertType: ComplianceAlertType;
    title: string;
    dueDate: string;
    severity: ComplianceAlertSeverity;
    sourceRuleId: string | null;
  }): Promise<boolean> {
    const existing = await this.alertRepository.findOne({
      where: {
        tenantId: input.tenantId,
        workerId: input.workerId,
        alertType: input.alertType,
        dueDate: input.dueDate,
        sourceRuleId: input.sourceRuleId ?? IsNull(),
        status: ComplianceAlertStatus.OPEN,
      },
    });
    if (existing) {
      return false;
    }

    await this.alertRepository.save(
      this.alertRepository.create({
        tenantId: input.tenantId,
        workerId: input.workerId,
        alertType: input.alertType,
        title: input.title,
        dueDate: input.dueDate,
        severity: input.severity,
        status: ComplianceAlertStatus.OPEN,
        sourceRuleId: input.sourceRuleId,
      }),
    );
    return true;
  }

  private async dispatch(
    condition: ScanCondition,
    row: WorkerAlertRow,
    title: string,
  ): Promise<void> {
    if (!condition.channel || !row.managerUserId) {
      // Baseline scans (no rule/channel) stay in-app only — surfaced via
      // GET /automation/alerts/compliance for managers / People Ops.
      return;
    }

    try {
      if (condition.channel === AlertRuleChannel.TEAMS) {
        await this.teamsNotificationService.sendComplianceAlertCard({
          userId: row.managerUserId,
          title,
          dueDate: row.dueDate,
          entityId: row.id,
        });
      } else if (
        condition.channel === AlertRuleChannel.EMAIL &&
        row.managerEmail
      ) {
        await this.mailService.sendComplianceAlertMail({
          email: row.managerEmail,
          recipientName: row.managerFirstName ?? 'there',
          alertTitle: title,
          dueDate: row.dueDate,
          url: `${frontendUrl()}/people-ops/dashboard`,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to dispatch compliance alert "${title}" via ${condition.channel}: ${(error as Error).message}`,
      );
    }
  }
}
