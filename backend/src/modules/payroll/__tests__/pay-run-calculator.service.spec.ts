import {
  PayRunCalculatorService,
  WorkerPayInput,
} from '../pay-run-calculator.service';

describe('PayRunCalculatorService', () => {
  let service: PayRunCalculatorService;

  const baseInput: WorkerPayInput = {
    workerId: 'w0000000-0000-4000-8000-000000000001',
    baseSalary: 100000,
    currencyCode: 'PKR',
    cashBenefits: [],
    lopDays: 0,
    workingDaysInPeriod: 22,
    daysEmployedInPeriod: 22,
    statutoryRates: [],
    hasBankDetails: true,
  };

  beforeEach(() => {
    service = new PayRunCalculatorService();
  });

  it('computes gross from base salary plus cash benefits marked includeInGross', () => {
    const result = service.calculate({
      ...baseInput,
      cashBenefits: [
        { code: 'housing', amount: 20000, includeInGross: true },
        { code: 'meal_voucher', amount: 5000, includeInGross: false },
      ],
    });

    expect(result.grossPay).toBe(120000);
    expect(result.calculationSnapshot.nonGrossEarnings).toBe(5000);
    expect(result.netPay).toBe(125000);
  });

  it('applies LOP deduction proportionally against the working days in period', () => {
    const result = service.calculate({
      ...baseInput,
      baseSalary: 22000,
      workingDaysInPeriod: 22,
      daysEmployedInPeriod: 22,
      lopDays: 2,
    });

    // 22000 / 22 working days = 1000/day; 2 LOP days => 2000 deduction
    expect(result.calculationSnapshot.lopDeduction).toBe(2000);
    expect(result.grossPay).toBe(20000);
    expect(result.netPay).toBe(20000);
  });

  it('applies statutory percentage rates from schedule entries as employee deductions and employer contributions', () => {
    const result = service.calculate({
      ...baseInput,
      baseSalary: 100000,
      statutoryRates: [
        { rateKey: 'eobi_employee', rateValue: 1, rateUnit: 'percentage' },
        { rateKey: 'eobi_employer', rateValue: 5, rateUnit: 'percentage' },
        { rateKey: 'admin_fee', rateValue: 500, rateUnit: 'fixed_amount' },
      ],
    });

    expect(result.totalDeductions).toBe(1500); // 1% of 100000 + 500 fixed
    expect(result.netPay).toBe(98500);
    expect(result.employerCost).toBe(105000); // 100000 gross + 5% employer contribution
    expect(
      (result.calculationSnapshot.employerContributions as unknown[]).length,
    ).toBe(1);
    expect(
      (result.calculationSnapshot.employeeDeductions as unknown[]).length,
    ).toBe(2);
  });

  it('pro-rates gross pay for a mid-period joiner', () => {
    const result = service.calculate({
      ...baseInput,
      baseSalary: 22000,
      workingDaysInPeriod: 22,
      daysEmployedInPeriod: 11,
    });

    expect(result.calculationSnapshot.prorationFactor).toBe(0.5);
    expect(result.grossPay).toBe(11000);
    expect(result.netPay).toBe(11000);
  });

  it('flags zero_net anomaly when net pay computes to zero', () => {
    const result = service.calculate({
      ...baseInput,
      baseSalary: 0,
      cashBenefits: [],
      statutoryRates: [],
    });

    expect(result.netPay).toBe(0);
    expect(result.anomalyFlags).toContain('zero_net');
  });

  it('flags missing_bank when the worker has no bank details on file', () => {
    const result = service.calculate({
      ...baseInput,
      hasBankDetails: false,
    });

    expect(result.anomalyFlags).toContain('missing_bank');
  });

  it('flags variance when net pay swings beyond the threshold vs. the prior period', () => {
    const result = service.calculate({
      ...baseInput,
      baseSalary: 100000,
      priorNetPay: 50000,
      varianceThresholdPercent: 20,
    });

    // netPay 100000 vs priorNetPay 50000 => 100% variance > 20% threshold
    expect(result.anomalyFlags).toContain('variance');
  });

  it('does not flag variance when the swing is within the configured threshold', () => {
    const result = service.calculate({
      ...baseInput,
      baseSalary: 100000,
      priorNetPay: 95000,
      varianceThresholdPercent: 20,
    });

    expect(result.anomalyFlags).not.toContain('variance');
  });

  it('never branches on country: identical rate/day inputs yield identical amounts regardless of currency code', () => {
    expect(baseInput).not.toHaveProperty('countryCode');
    expect(baseInput).not.toHaveProperty('country');

    const input: WorkerPayInput = {
      ...baseInput,
      baseSalary: 75000,
      statutoryRates: [
        { rateKey: 'eobi_employee', rateValue: 1, rateUnit: 'percentage' },
      ],
    };

    const pkrResult = service.calculate({ ...input, currencyCode: 'PKR' });
    const aedResult = service.calculate({ ...input, currencyCode: 'AED' });
    const sgdResult = service.calculate({ ...input, currencyCode: 'SGD' });

    expect(aedResult.grossPay).toBe(pkrResult.grossPay);
    expect(sgdResult.grossPay).toBe(pkrResult.grossPay);
    expect(aedResult.netPay).toBe(pkrResult.netPay);
    expect(sgdResult.netPay).toBe(pkrResult.netPay);
    expect(aedResult.totalDeductions).toBe(pkrResult.totalDeductions);
    expect(aedResult.employerCost).toBe(pkrResult.employerCost);

    expect(pkrResult.currencyCode).toBe('PKR');
    expect(aedResult.currencyCode).toBe('AED');
    expect(sgdResult.currencyCode).toBe('SGD');
  });
});
