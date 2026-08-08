import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  CreateScheduledReportDto,
  UpdateNotificationPreferencesDto,
} from './dto/automation.dto';
import { ComplianceAlertEntity } from './entities/compliance-alert.entity';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';
import { ScheduledReportSubscriptionEntity } from './entities/scheduled-report-subscription.entity';
import {
  ComplianceAlertStatus,
  ReportCadence,
  ReportType,
} from './enums/automation.enum';

export type ReportRow = Record<string, string | number | boolean | null>;

export type ReportResult = {
  reportType: string;
  generatedAt: string;
  rows: ReportRow[];
};

@Injectable()
export class AutomationService {
  constructor(
    @InjectRepository(NotificationPreferenceEntity)
    private readonly preferenceRepository: Repository<NotificationPreferenceEntity>,
    @InjectRepository(ScheduledReportSubscriptionEntity)
    private readonly reportRepository: Repository<ScheduledReportSubscriptionEntity>,
    @InjectRepository(ComplianceAlertEntity)
    private readonly complianceAlertRepository: Repository<ComplianceAlertEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async getNotificationPreferences(
    userId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<NotificationPreferenceEntity> {
    let prefs = await this.preferenceRepository.findOne({
      where: { tenantId, userId },
    });

    if (!prefs) {
      prefs = await this.preferenceRepository.save(
        this.preferenceRepository.create({
          tenantId,
          userId,
          emailApprovals: true,
          emailLeave: true,
          emailPolicies: true,
          pushEnabled: false,
          teamsAdaptiveCards: true,
        }),
      );
    }

    return prefs;
  }

  async updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<NotificationPreferenceEntity> {
    const prefs = await this.getNotificationPreferences(userId, tenantId);
    const before = { ...prefs };

    Object.assign(prefs, {
      emailApprovals: dto.emailApprovals ?? prefs.emailApprovals,
      emailLeave: dto.emailLeave ?? prefs.emailLeave,
      emailPolicies: dto.emailPolicies ?? prefs.emailPolicies,
      pushEnabled: dto.pushEnabled ?? prefs.pushEnabled,
      teamsAdaptiveCards: dto.teamsAdaptiveCards ?? prefs.teamsAdaptiveCards,
    });

    const saved = await this.preferenceRepository.save(prefs);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'notification_preferences.update',
      entityType: 'notification_preference',
      entityId: saved.id,
      changes: {
        emailApprovals: {
          old: before.emailApprovals,
          new: saved.emailApprovals,
        },
        pushEnabled: { old: before.pushEnabled, new: saved.pushEnabled },
      },
    });

    return saved;
  }

  async listScheduledReports(
    userId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ScheduledReportSubscriptionEntity[]> {
    return this.reportRepository.find({
      where: { tenantId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createScheduledReport(
    userId: string,
    dto: CreateScheduledReportDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ScheduledReportSubscriptionEntity> {
    const saved = await this.reportRepository.save(
      this.reportRepository.create({
        tenantId,
        userId,
        reportType: dto.reportType,
        cadence: dto.cadence ?? ReportCadence.WEEKLY,
        filters: dto.filters ?? {},
        isActive: true,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'scheduled_report.create',
      entityType: 'scheduled_report_subscription',
      entityId: saved.id,
      changes: {
        reportType: { old: null, new: saved.reportType },
        cadence: { old: null, new: saved.cadence },
      },
    });

    return saved;
  }

  async listComplianceAlerts(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ComplianceAlertEntity[]> {
    return this.complianceAlertRepository.find({
      where: { tenantId, status: ComplianceAlertStatus.OPEN },
      relations: ['worker'],
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Standard report runners backing both the on-demand `GET /reports/:type/run`
   * endpoint and the async CSV export job (`ReportsProcessor`).
   */
  async runReport(
    reportType: string,
    filters: Record<string, unknown> = {},
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ReportResult> {
    const rows = await this.queryReportRows(
      reportType as ReportType,
      filters,
      tenantId,
    );
    return {
      reportType,
      generatedAt: new Date().toISOString(),
      rows,
    };
  }

  private async queryReportRows(
    reportType: ReportType,
    filters: Record<string, unknown>,
    tenantId: string,
  ): Promise<ReportRow[]> {
    switch (reportType) {
      case ReportType.HEADCOUNT:
        return this.runHeadcountReport(tenantId);
      case ReportType.ATTRITION:
        return this.runAttritionReport(tenantId);
      case ReportType.LEAVE_LIABILITY:
        return this.runLeaveLiabilityReport(tenantId, filters);
      case ReportType.POLICY_COMPLIANCE:
        return this.runPolicyComplianceReport(tenantId);
      case ReportType.VISA_EXPIRY:
        return this.runVisaExpiryReport(tenantId);
      default:
        return [];
    }
  }

  private async runHeadcountReport(tenantId: string): Promise<ReportRow[]> {
    return this.dataSource.query(
      `
      SELECT
        w."countryCode" AS "countryCode",
        COALESCE(d.name, 'Unassigned') AS "divisionName",
        COALESCE(dept.name, 'Unassigned') AS "departmentName",
        COUNT(*)::int AS "workerCount"
      FROM workers w
      LEFT JOIN divisions d ON d.id = w."divisionId"
      LEFT JOIN departments dept ON dept.id = w."departmentId"
      WHERE w."tenantId" = $1
        AND w.status = 'active'
      GROUP BY w."countryCode", d.name, dept.name
      ORDER BY w."countryCode", d.name, dept.name
      `,
      [tenantId],
    );
  }

  private async runAttritionReport(tenantId: string): Promise<ReportRow[]> {
    return this.dataSource.query(
      `
      WITH months AS (
        SELECT to_char(date_trunc('month', gs), 'YYYY-MM') AS month,
               date_trunc('month', gs) AS month_start,
               (date_trunc('month', gs) + INTERVAL '1 month' - INTERVAL '1 day') AS month_end
        FROM generate_series(
          date_trunc('month', now()) - INTERVAL '11 months',
          date_trunc('month', now()),
          INTERVAL '1 month'
        ) AS gs
      ),
      headcount AS (
        SELECT m.month,
               (SELECT COUNT(*) FROM workers w
                WHERE w."tenantId" = $1
                  AND w."startDate" <= m.month_end::date
                  AND (w."endDate" IS NULL OR w."endDate" > m.month_end::date))::int AS "activeHeadcount"
        FROM months m
      ),
      separations AS (
        SELECT to_char(date_trunc('month', sc."lastWorkingDay"), 'YYYY-MM') AS month,
               COUNT(*)::int AS "separations"
        FROM separation_cases sc
        WHERE sc."tenantId" = $1
          AND sc."lastWorkingDay" >= date_trunc('month', now()) - INTERVAL '11 months'
        GROUP BY 1
      )
      SELECT
        h.month,
        h."activeHeadcount",
        COALESCE(s."separations", 0) AS "separations",
        CASE WHEN h."activeHeadcount" > 0
          THEN ROUND((COALESCE(s."separations", 0)::numeric / h."activeHeadcount") * 100, 2)
          ELSE 0
        END AS "attritionRatePercent"
      FROM headcount h
      LEFT JOIN separations s ON s.month = h.month
      ORDER BY h.month
      `,
      [tenantId],
    );
  }

  private async runLeaveLiabilityReport(
    tenantId: string,
    filters: Record<string, unknown>,
  ): Promise<ReportRow[]> {
    const year =
      typeof filters.year === 'number'
        ? filters.year
        : new Date().getUTCFullYear();

    return this.dataSource.query(
      `
      SELECT
        w.id AS "workerId",
        (w."firstName" || ' ' || w."lastName") AS "workerName",
        w."countryCode" AS "countryCode",
        lt.name AS "leaveTypeName",
        lb.entitled AS "entitledDays",
        lb.used AS "usedDays",
        (lb.entitled - lb.used) AS "outstandingDays"
      FROM leave_balances lb
      INNER JOIN workers w ON w.id = lb."workerId"
      INNER JOIN leave_types lt ON lt.id = lb."leaveTypeId"
      WHERE lb."tenantId" = $1
        AND lb.year = $2
        AND w.status = 'active'
        AND (lb.entitled - lb.used) > 0
      ORDER BY "outstandingDays" DESC
      `,
      [tenantId, year],
    );
  }

  private async runPolicyComplianceReport(
    tenantId: string,
  ): Promise<ReportRow[]> {
    return this.dataSource.query(
      `
      WITH published_versions AS (
        SELECT DISTINCT ON (pv."policyId")
          pv.id AS "versionId", pv."policyId", pv.version
        FROM policy_versions pv
        WHERE pv."tenantId" = $1
          AND pv.status = 'published'
        ORDER BY pv."policyId", pv.version DESC
      ),
      eligible AS (
        SELECT COUNT(*)::int AS "eligibleWorkers"
        FROM workers w
        WHERE w."tenantId" = $1 AND w.status = 'active'
      )
      SELECT
        p.code AS "policyCode",
        p.title AS "policyTitle",
        pv.version AS "version",
        e."eligibleWorkers" AS "eligibleWorkers",
        COUNT(DISTINCT pa."workerId")::int AS "acknowledgedWorkers",
        CASE WHEN e."eligibleWorkers" > 0
          THEN ROUND((COUNT(DISTINCT pa."workerId")::numeric / e."eligibleWorkers") * 100, 2)
          ELSE 0
        END AS "complianceRatePercent"
      FROM published_versions pv
      INNER JOIN policies p ON p.id = pv."policyId"
      CROSS JOIN eligible e
      LEFT JOIN policy_acknowledgements pa
        ON pa."policyVersionId" = pv."versionId" AND pa."tenantId" = $1
      WHERE p."tenantId" = $1 AND p."isActive" = true
      GROUP BY p.code, p.title, pv.version, e."eligibleWorkers"
      ORDER BY "complianceRatePercent" ASC
      `,
      [tenantId],
    );
  }

  private async runVisaExpiryReport(tenantId: string): Promise<ReportRow[]> {
    return this.dataSource.query(
      `
      SELECT
        w.id AS "workerId",
        (w."firstName" || ' ' || w."lastName") AS "workerName",
        v."countryCode" AS "countryCode",
        v."recordType" AS "recordType",
        to_char(v."expiryDate", 'YYYY-MM-DD') AS "expiryDate",
        (v."expiryDate" - CURRENT_DATE)::int AS "daysRemaining"
      FROM worker_visa_records v
      INNER JOIN workers w ON w.id = v."workerId"
      WHERE v."tenantId" = $1
        AND w.status = 'active'
        AND v."expiryDate" IS NOT NULL
        AND v."cancellationDate" IS NULL
        AND v."supersededById" IS NULL
        AND v."expiryDate" <= (CURRENT_DATE + 90)
      ORDER BY v."expiryDate" ASC
      `,
      [tenantId],
    );
  }
}
