import { LeaveAccrualMethod } from '@/modules/country-config/enums/setup-wizard.enum';
import { countInclusiveDays } from './time-leave-scope.util';

export const ACCRUAL_CREDIT_ACTION = 'leave.accrual.credit';
export const ACCRUAL_CARRY_FORWARD_ACTION = 'leave.accrual.carryforward';

export function roundAccrualDays(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function padMonth(month: number): string {
  return String(month).padStart(2, '0');
}

export function lastDayOfMonth(year: number, month: number): string {
  return `${year}-${padMonth(month)}-${String(daysInMonth(year, month)).padStart(2, '0')}`;
}

export function buildAccrualPeriodKey(
  method: LeaveAccrualMethod,
  year: number,
  month: number,
): string {
  if (method === LeaveAccrualMethod.ANNUAL) {
    return `${year}`;
  }
  return `${year}-${padMonth(month)}`;
}

export function buildCarryForwardPeriodKey(year: number): string {
  return `${year}-carryforward`;
}

export function computeFullYearEntitlement(
  daysPerYear: number,
  fteFraction: number,
): number {
  return roundAccrualDays(Math.max(0, daysPerYear) * Math.max(0, fteFraction));
}

/**
 * Pro-rates annual allotment for mid-year joiners by remaining calendar days.
 * Workers who started on/before Jan 1 of the year receive the full entitlement.
 */
export function computeProRatedAnnualEntitlement(
  daysPerYear: number,
  fteFraction: number,
  startDate: string,
  year: number,
): number {
  const full = computeFullYearEntitlement(daysPerYear, fteFraction);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  if (startDate > yearEnd) {
    return 0;
  }
  if (startDate <= yearStart) {
    return full;
  }

  const remainingDays = countInclusiveDays(startDate, yearEnd);
  return roundAccrualDays(full * (remainingDays / daysInYear(year)));
}

/**
 * Monthly slice of the FTE-adjusted annual allotment.
 * Mid-month joiners are pro-rated by remaining days in the month.
 */
export function computeMonthlyCredit(
  daysPerYear: number,
  fteFraction: number,
  startDate: string,
  year: number,
  month: number,
): number {
  const fullYear = computeFullYearEntitlement(daysPerYear, fteFraction);
  if (fullYear <= 0) {
    return 0;
  }

  const monthly = fullYear / 12;
  const periodStart = `${year}-${padMonth(month)}-01`;
  const periodEnd = lastDayOfMonth(year, month);

  if (startDate > periodEnd) {
    return 0;
  }
  if (startDate <= periodStart) {
    return roundAccrualDays(monthly);
  }

  const remaining = countInclusiveDays(startDate, periodEnd);
  return roundAccrualDays(monthly * (remaining / daysInMonth(year, month)));
}

export function computeCarryForwardDays(
  priorUnused: number,
  carryForwardCap: number,
): number {
  const unused = Math.max(0, priorUnused);
  const cap = Math.max(0, carryForwardCap);
  return roundAccrualDays(Math.min(unused, cap));
}

export function resolveDaysPerYear(
  leaveTypeDaysPerYear: number,
  leaveTypeCode: string,
  configJson: Record<string, unknown> | null | undefined,
): number {
  const entitlements = configJson?.leaveEntitlements;
  if (
    entitlements &&
    typeof entitlements === 'object' &&
    !Array.isArray(entitlements)
  ) {
    const override = (entitlements as Record<string, unknown>)[leaveTypeCode];
    if (typeof override === 'number' && Number.isFinite(override)) {
      return override;
    }
    if (typeof override === 'string' && override.trim() !== '') {
      const parsed = Number.parseFloat(override);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return leaveTypeDaysPerYear;
}
