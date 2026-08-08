import { LeaveAccrualMethod } from '@/modules/country-config/enums/setup-wizard.enum';
import {
  buildAccrualPeriodKey,
  buildCarryForwardPeriodKey,
  computeCarryForwardDays,
  computeFullYearEntitlement,
  computeMonthlyCredit,
  computeProRatedAnnualEntitlement,
  resolveDaysPerYear,
  roundAccrualDays,
} from '../leave-accrual.calculator';

describe('leave-accrual.calculator', () => {
  describe('computeFullYearEntitlement', () => {
    it('scales by FTE fraction', () => {
      expect(computeFullYearEntitlement(20, 0.5)).toBe(10);
      expect(computeFullYearEntitlement(30, 1)).toBe(30);
    });
  });

  describe('computeProRatedAnnualEntitlement', () => {
    it('returns full entitlement for Jan 1 starters', () => {
      expect(
        computeProRatedAnnualEntitlement(20, 1, '2026-01-01', 2026),
      ).toBe(20);
    });

    it('returns full entitlement for prior-year starters', () => {
      expect(
        computeProRatedAnnualEntitlement(20, 1, '2025-06-15', 2026),
      ).toBe(20);
    });

    it('pro-rates mid-year joiners by remaining calendar days', () => {
      // 2026 is not a leap year (365 days). Jul 1 → Dec 31 = 184 days.
      const result = computeProRatedAnnualEntitlement(
        20,
        1,
        '2026-07-01',
        2026,
      );
      expect(result).toBe(roundAccrualDays(20 * (184 / 365)));
    });

    it('returns 0 when start is after the year', () => {
      expect(
        computeProRatedAnnualEntitlement(20, 1, '2027-01-01', 2026),
      ).toBe(0);
    });

    it('applies FTE before pro-ration', () => {
      const result = computeProRatedAnnualEntitlement(
        20,
        0.5,
        '2026-07-01',
        2026,
      );
      expect(result).toBe(roundAccrualDays(10 * (184 / 365)));
    });
  });

  describe('computeMonthlyCredit', () => {
    it('credits 1/12 of annual allotment for full months', () => {
      expect(computeMonthlyCredit(24, 1, '2025-01-01', 2026, 3)).toBe(2);
    });

    it('pro-rates mid-month joiners', () => {
      // March 2026 has 31 days; join on 16th → 16 days remaining (16–31).
      const result = computeMonthlyCredit(24, 1, '2026-03-16', 2026, 3);
      expect(result).toBe(roundAccrualDays(2 * (16 / 31)));
    });

    it('returns 0 when worker has not started in the month', () => {
      expect(computeMonthlyCredit(24, 1, '2026-04-01', 2026, 3)).toBe(0);
    });
  });

  describe('computeCarryForwardDays', () => {
    it('caps unused days at carry-forward cap', () => {
      expect(computeCarryForwardDays(8, 5)).toBe(5);
      expect(computeCarryForwardDays(3, 5)).toBe(3);
      expect(computeCarryForwardDays(-1, 5)).toBe(0);
    });
  });

  describe('period keys', () => {
    it('builds annual and monthly period keys', () => {
      expect(
        buildAccrualPeriodKey(LeaveAccrualMethod.ANNUAL, 2026, 3),
      ).toBe('2026');
      expect(
        buildAccrualPeriodKey(LeaveAccrualMethod.MONTHLY, 2026, 3),
      ).toBe('2026-03');
      expect(buildCarryForwardPeriodKey(2026)).toBe('2026-carryforward');
    });
  });

  describe('resolveDaysPerYear', () => {
    it('uses leave type default when no override', () => {
      expect(resolveDaysPerYear(20, 'ANNUAL', {})).toBe(20);
    });

    it('prefers employment-type leaveEntitlements override', () => {
      expect(
        resolveDaysPerYear(20, 'ANNUAL', {
          leaveEntitlements: { ANNUAL: 24, SICK: 8 },
        }),
      ).toBe(24);
    });
  });
});
