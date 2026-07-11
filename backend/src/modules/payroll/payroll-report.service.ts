import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  PayrollDeductionsQueryDto,
  PayrollRegisterQueryDto,
} from './dto/payroll-report.dto';

export type PayrollReportRow = Record<
  string,
  string | number | boolean | null
>;

/**
 * tasks.md §2.7 quality gate — "Payroll reports: register, deductions,
 * variance". Read-only Finance reports built directly off `pay_runs` /
 * `pay_run_line_items`; no new tables needed.
 */
@Injectable()
export class PayrollReportService {
  constructor(private readonly dataSource: DataSource) {}

  async register(
    query: PayrollRegisterQueryDto,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PayrollReportRow[]> {
    const conditions: string[] = ['li."tenantId" = $1'];
    const params: unknown[] = [tenantId];
    this.applyCommonFilters(query, conditions, params);

    return this.dataSource.query(
      `
      SELECT
        pr.id AS "payRunId",
        pr."periodStart", pr."periodEnd", pr.status AS "payRunStatus",
        le."registeredName" AS "legalEntityName",
        w.id AS "workerId",
        (w."firstName" || ' ' || w."lastName") AS "workerName",
        li."grossPay", li."totalDeductions", li."netPay",
        li."currencyCode", li."paymentReference", li."anomalyFlags"
      FROM pay_run_line_items li
      INNER JOIN pay_runs pr ON pr.id = li."payRunId"
      INNER JOIN workers w ON w.id = li."workerId"
      LEFT JOIN legal_entities le ON le.id = pr."legalEntityId"
      WHERE ${conditions.join(' AND ')}
      ORDER BY pr."periodStart" DESC, w."lastName", w."firstName"
      `,
      params,
    );
  }

  async deductions(
    query: PayrollDeductionsQueryDto,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PayrollReportRow[]> {
    const conditions: string[] = ['li."tenantId" = $1'];
    const params: unknown[] = [tenantId];
    this.applyCommonFilters(query, conditions, params);

    return this.dataSource.query(
      `
      SELECT
        pr.id AS "payRunId",
        pr."periodStart", pr."periodEnd",
        w.id AS "workerId",
        (w."firstName" || ' ' || w."lastName") AS "workerName",
        COALESCE(ded->>'rateKey', ded->>'code') AS "deductionCode",
        (ded->>'amount')::numeric AS "amount",
        li."currencyCode"
      FROM pay_run_line_items li
      INNER JOIN pay_runs pr ON pr.id = li."payRunId"
      INNER JOIN workers w ON w.id = li."workerId"
      CROSS JOIN LATERAL jsonb_array_elements(
        COALESCE(li."calculationSnapshot"->'employeeDeductions', '[]'::jsonb)
      ) AS ded
      WHERE ${conditions.join(' AND ')}
      ORDER BY pr."periodStart" DESC, w."lastName", "deductionCode"
      `,
      params,
    );
  }

  async variance(
    payRunId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PayrollReportRow> {
    const rows: PayrollReportRow[] = await this.dataSource.query(
      `
      WITH current_run AS (
        SELECT * FROM pay_runs WHERE id = $2 AND "tenantId" = $1
      ),
      prior_run AS (
        SELECT pr.*
        FROM pay_runs pr, current_run cr
        WHERE pr."tenantId" = $1
          AND pr."legalEntityId" = cr."legalEntityId"
          AND pr.id <> cr.id
          AND pr."periodEnd" < cr."periodStart"
          AND pr.status IN ('approved', 'exported', 'locked')
        ORDER BY pr."periodEnd" DESC
        LIMIT 1
      ),
      current_totals AS (
        SELECT
          COALESCE(SUM(li."grossPay"::numeric), 0) AS gross,
          COALESCE(SUM(li."totalDeductions"::numeric), 0) AS deductions,
          COALESCE(SUM(li."netPay"::numeric), 0) AS net,
          COUNT(*)::int AS headcount
        FROM pay_run_line_items li, current_run cr
        WHERE li."payRunId" = cr.id
      ),
      prior_totals AS (
        SELECT
          COALESCE(SUM(li."grossPay"::numeric), 0) AS gross,
          COALESCE(SUM(li."totalDeductions"::numeric), 0) AS deductions,
          COALESCE(SUM(li."netPay"::numeric), 0) AS net,
          COUNT(*)::int AS headcount
        FROM pay_run_line_items li, prior_run pr
        WHERE li."payRunId" = pr.id
      )
      SELECT
        cr.id AS "payRunId",
        cr."periodStart" AS "currentPeriodStart",
        cr."periodEnd" AS "currentPeriodEnd",
        pr.id AS "priorPayRunId",
        pr."periodStart" AS "priorPeriodStart",
        pr."periodEnd" AS "priorPeriodEnd",
        ct.gross AS "currentGross",
        ct.net AS "currentNet",
        ct.headcount AS "currentHeadcount",
        pt.gross AS "priorGross",
        pt.net AS "priorNet",
        pt.headcount AS "priorHeadcount",
        CASE WHEN pt.gross > 0
          THEN ROUND(((ct.gross - pt.gross) / pt.gross) * 100, 2)
          ELSE NULL
        END AS "grossVariancePercent",
        CASE WHEN pt.net > 0
          THEN ROUND(((ct.net - pt.net) / pt.net) * 100, 2)
          ELSE NULL
        END AS "netVariancePercent",
        (ct.headcount - pt.headcount) AS "headcountDelta"
      FROM current_run cr
      LEFT JOIN prior_run pr ON true
      CROSS JOIN current_totals ct
      CROSS JOIN prior_totals pt
      `,
      [tenantId, payRunId],
    );

    if (!rows.length) {
      throw new NotFoundException({
        code: 'PAY_RUN_NOT_FOUND',
        message: 'Pay run not found',
      });
    }
    return rows[0];
  }

  private applyCommonFilters(
    query: PayrollRegisterQueryDto,
    conditions: string[],
    params: unknown[],
  ): void {
    if (query.payRunId) {
      params.push(query.payRunId);
      conditions.push(`pr.id = $${params.length}`);
    }
    if (query.legalEntityId) {
      params.push(query.legalEntityId);
      conditions.push(`pr."legalEntityId" = $${params.length}`);
    }
    if (query.periodStart) {
      params.push(query.periodStart);
      conditions.push(`pr."periodStart" >= $${params.length}`);
    }
    if (query.periodEnd) {
      params.push(query.periodEnd);
      conditions.push(`pr."periodEnd" <= $${params.length}`);
    }
  }
}
