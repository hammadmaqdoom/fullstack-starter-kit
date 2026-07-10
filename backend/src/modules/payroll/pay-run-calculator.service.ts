import { Injectable } from '@nestjs/common';

export interface WorkerPayCashBenefit {
  code: string;
  amount: number;
  includeInGross: boolean;
}

export interface WorkerPayStatutoryRate {
  rateKey: string;
  rateValue: number;
  rateUnit: 'percentage' | 'fixed_amount';
}

export interface WorkerPayInput {
  workerId: string;
  baseSalary: number;
  currencyCode: string;
  cashBenefits: WorkerPayCashBenefit[];
  lopDays: number;
  workingDaysInPeriod: number;
  daysEmployedInPeriod: number;
  statutoryRates: WorkerPayStatutoryRate[];
  hasBankDetails: boolean;
  priorNetPay?: number;
  varianceThresholdPercent?: number;
}

export interface WorkerPayResult {
  workerId: string;
  currencyCode: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  employerCost: number;
  calculationSnapshot: Record<string, unknown>;
  anomalyFlags: string[];
}

const DEFAULT_VARIANCE_THRESHOLD_PERCENT = 20;

/**
 * Pure, config-driven pay calculation for a single worker/period.
 *
 * No database access and no branching on country or currency — every
 * jurisdiction-specific behaviour must flow in via `statutoryRates`
 * (resolved upstream from country config tables).
 */
@Injectable()
export class PayRunCalculatorService {
  calculate(input: WorkerPayInput): WorkerPayResult {
    const grossBase = this.sumGrossBase(input);
    const prorationFactor = this.resolveProrationFactor(input);
    const grossAfterProration = round2(grossBase * prorationFactor);
    const lopDeduction = this.calculateLopDeduction(
      grossAfterProration,
      input.workingDaysInPeriod,
      input.lopDays,
    );
    const grossPay = Math.max(0, round2(grossAfterProration - lopDeduction));

    const nonGrossEarnings = round2(
      input.cashBenefits
        .filter((benefit) => !benefit.includeInGross)
        .reduce((sum, benefit) => sum + benefit.amount, 0),
    );

    const { employeeDeductions, employerContributions } =
      this.applyStatutoryRates(input.statutoryRates, grossPay);

    const totalDeductions = round2(sumAmounts(employeeDeductions));
    const employerContributionsTotal = round2(
      sumAmounts(employerContributions),
    );

    const netPay = round2(grossPay + nonGrossEarnings - totalDeductions);
    const employerCost = round2(
      grossPay + nonGrossEarnings + employerContributionsTotal,
    );

    const anomalyFlags = this.detectAnomalies(input, netPay);

    return {
      workerId: input.workerId,
      currencyCode: input.currencyCode,
      grossPay,
      totalDeductions,
      netPay,
      employerCost,
      calculationSnapshot: {
        baseSalary: input.baseSalary,
        grossBaseBeforeProration: round2(grossBase),
        prorationFactor,
        grossAfterProration,
        lopDeduction: round2(lopDeduction),
        grossPay,
        nonGrossEarnings,
        employeeDeductions,
        employerContributions,
        employerContributionsTotal,
      },
      anomalyFlags,
    };
  }

  private sumGrossBase(input: WorkerPayInput): number {
    const grossBenefits = input.cashBenefits
      .filter((benefit) => benefit.includeInGross)
      .reduce((sum, benefit) => sum + benefit.amount, 0);
    return input.baseSalary + grossBenefits;
  }

  private resolveProrationFactor(input: WorkerPayInput): number {
    if (input.workingDaysInPeriod <= 0) {
      return 1;
    }
    if (input.daysEmployedInPeriod >= input.workingDaysInPeriod) {
      return 1;
    }
    return input.daysEmployedInPeriod / input.workingDaysInPeriod;
  }

  private calculateLopDeduction(
    grossAfterProration: number,
    workingDaysInPeriod: number,
    lopDays: number,
  ): number {
    if (workingDaysInPeriod <= 0 || lopDays <= 0) {
      return 0;
    }
    return (grossAfterProration / workingDaysInPeriod) * lopDays;
  }

  private applyStatutoryRates(
    statutoryRates: WorkerPayStatutoryRate[],
    grossPay: number,
  ): {
    employeeDeductions: Array<{ rateKey: string; amount: number }>;
    employerContributions: Array<{ rateKey: string; amount: number }>;
  } {
    const employeeDeductions: Array<{ rateKey: string; amount: number }> = [];
    const employerContributions: Array<{ rateKey: string; amount: number }> =
      [];

    for (const rate of statutoryRates) {
      const amount = round2(
        rate.rateUnit === 'percentage'
          ? (grossPay * rate.rateValue) / 100
          : rate.rateValue,
      );
      const line = { rateKey: rate.rateKey, amount };

      if (isEmployerRateKey(rate.rateKey)) {
        employerContributions.push(line);
      } else {
        employeeDeductions.push(line);
      }
    }

    return { employeeDeductions, employerContributions };
  }

  private detectAnomalies(input: WorkerPayInput, netPay: number): string[] {
    const flags: string[] = [];

    if (netPay === 0) {
      flags.push('zero_net');
    }

    if (!input.hasBankDetails) {
      flags.push('missing_bank');
    }

    if (input.priorNetPay !== undefined) {
      const threshold =
        input.varianceThresholdPercent ?? DEFAULT_VARIANCE_THRESHOLD_PERCENT;
      const variancePercent =
        input.priorNetPay === 0
          ? netPay === 0
            ? 0
            : Number.POSITIVE_INFINITY
          : (Math.abs(netPay - input.priorNetPay) /
              Math.abs(input.priorNetPay)) *
            100;

      if (variancePercent > threshold) {
        flags.push('variance');
      }
    }

    return flags;
  }
}

function isEmployerRateKey(rateKey: string): boolean {
  const normalized = rateKey.toLowerCase();
  return normalized.includes('employer') || normalized.endsWith('_employer');
}

function sumAmounts(lines: Array<{ amount: number }>): number {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
