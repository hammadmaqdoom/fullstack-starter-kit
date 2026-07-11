import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type LeadershipAnalyticsRow = Record<
  string,
  string | number | boolean | null
>;

/**
 * tasks.md §2.0 "Leadership analytics — headcount, attrition, leave
 * liability, visa pipeline by division + legal entity + location".
 * `location` has no dedicated table in Polaris — database-design.md uses
 * `countryCode` as the work-location dimension, so these reports group by
 * it directly. Leave/visa data is owned by time-leave/talent, which import
 * CoreHrModule — so it's read here via raw SQL rather than importing those
 * modules back, which would create a circular dependency.
 */
@Injectable()
export class LeadershipAnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async headcountByEntity(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<LeadershipAnalyticsRow[]> {
    return this.dataSource.query(
      `
      SELECT
        le.code AS "legalEntityCode",
        COALESCE(d.name, 'Unassigned') AS "divisionName",
        w."countryCode" AS "location",
        COUNT(*)::int AS "headcount"
      FROM workers w
      LEFT JOIN legal_entities le ON le.id = w."legalEntityId"
      LEFT JOIN divisions d ON d.id = w."divisionId"
      WHERE w."tenantId" = $1 AND w.status = 'active'
      GROUP BY le.code, d.name, w."countryCode"
      ORDER BY le.code, d.name, w."countryCode"
      `,
      [tenantId],
    );
  }

  async attritionByEntity(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<LeadershipAnalyticsRow[]> {
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
      entities AS (
        SELECT DISTINCT le.id, le.code FROM legal_entities le WHERE le."tenantId" = $1
      ),
      headcount AS (
        SELECT m.month, e.code AS "legalEntityCode",
               (SELECT COUNT(*) FROM workers w
                WHERE w."tenantId" = $1
                  AND w."legalEntityId" = e.id
                  AND w."startDate" <= m.month_end::date
                  AND (w."endDate" IS NULL OR w."endDate" > m.month_end::date))::int AS "activeHeadcount"
        FROM months m
        CROSS JOIN entities e
      ),
      separations AS (
        SELECT to_char(date_trunc('month', sc."lastWorkingDay"), 'YYYY-MM') AS month,
               le.code AS "legalEntityCode",
               COUNT(*)::int AS "separations"
        FROM separation_cases sc
        INNER JOIN workers w ON w.id = sc."workerId"
        LEFT JOIN legal_entities le ON le.id = w."legalEntityId"
        WHERE sc."tenantId" = $1
          AND sc."lastWorkingDay" >= date_trunc('month', now()) - INTERVAL '11 months'
        GROUP BY 1, 2
      )
      SELECT
        h.month,
        h."legalEntityCode",
        h."activeHeadcount",
        COALESCE(s."separations", 0) AS "separations",
        CASE WHEN h."activeHeadcount" > 0
          THEN ROUND((COALESCE(s."separations", 0)::numeric / h."activeHeadcount") * 100, 2)
          ELSE 0
        END AS "attritionRatePercent"
      FROM headcount h
      LEFT JOIN separations s ON s.month = h.month AND s."legalEntityCode" = h."legalEntityCode"
      ORDER BY h."legalEntityCode", h.month
      `,
      [tenantId],
    );
  }

  async leaveLiabilityByEntity(
    tenantId: string = DIGITARO_TENANT_ID,
    year: number = new Date().getUTCFullYear(),
  ): Promise<LeadershipAnalyticsRow[]> {
    return this.dataSource.query(
      `
      SELECT
        le.code AS "legalEntityCode",
        COALESCE(d.name, 'Unassigned') AS "divisionName",
        w."countryCode" AS "location",
        SUM(lb.entitled - lb.used) AS "outstandingDays"
      FROM leave_balances lb
      INNER JOIN workers w ON w.id = lb."workerId"
      LEFT JOIN legal_entities le ON le.id = w."legalEntityId"
      LEFT JOIN divisions d ON d.id = w."divisionId"
      WHERE lb."tenantId" = $1
        AND lb.year = $2
        AND w.status = 'active'
      GROUP BY le.code, d.name, w."countryCode"
      HAVING SUM(lb.entitled - lb.used) > 0
      ORDER BY "outstandingDays" DESC
      `,
      [tenantId, year],
    );
  }

  async visaPipelineByEntity(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<LeadershipAnalyticsRow[]> {
    return this.dataSource.query(
      `
      SELECT
        le.code AS "legalEntityCode",
        COALESCE(d.name, 'Unassigned') AS "divisionName",
        v."countryCode" AS "location",
        COUNT(*) FILTER (WHERE (v."expiryDate" - CURRENT_DATE) <= 30)::int AS "expiringWithin30Days",
        COUNT(*) FILTER (WHERE (v."expiryDate" - CURRENT_DATE) > 30 AND (v."expiryDate" - CURRENT_DATE) <= 60)::int AS "expiringWithin60Days",
        COUNT(*) FILTER (WHERE (v."expiryDate" - CURRENT_DATE) > 60 AND (v."expiryDate" - CURRENT_DATE) <= 90)::int AS "expiringWithin90Days",
        COUNT(*)::int AS "totalInPipeline"
      FROM worker_visa_records v
      INNER JOIN workers w ON w.id = v."workerId"
      LEFT JOIN legal_entities le ON le.id = w."legalEntityId"
      LEFT JOIN divisions d ON d.id = w."divisionId"
      WHERE v."tenantId" = $1
        AND w.status = 'active'
        AND v."expiryDate" IS NOT NULL
        AND v."cancellationDate" IS NULL
        AND v."supersededById" IS NULL
        AND v."expiryDate" <= (CURRENT_DATE + 90)
      GROUP BY le.code, d.name, v."countryCode"
      ORDER BY "expiringWithin30Days" DESC
      `,
      [tenantId],
    );
  }
}
