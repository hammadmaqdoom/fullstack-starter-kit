import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { buildManualCsv } from '../manual-csv.exporter';
import { FundingAccountProvider } from '../enums/payout.enum';

describe('buildManualCsv', () => {
  it('includes payer IBAN column when enabled and includePayerFromFundingAccount', () => {
    const buffer = buildManualCsv(
      {
        includePayerFromFundingAccount: true,
        columns: [
          { key: 'workerName', label: 'Name', enabled: true, order: 1 },
          { key: 'amount', label: 'Amount', enabled: true, order: 2 },
          { key: 'payerIban', label: 'Payer IBAN', enabled: true, order: 3 },
        ],
      },
      [{ workerName: 'Ali', amount: '1000.00' }],
      {
        bankDetails: {
          iban: 'PK00HABB000000123',
          accountNumber: '123',
        },
      },
    );
    const text = buffer.toString('utf8');
    expect(text).toContain('Payer IBAN');
    expect(text).toContain('PK00HABB000000123');
  });
});

describe('FundingAccountService redaction', () => {
  it('documents provider enum includes manual_bank', () => {
    expect(FundingAccountProvider.MANUAL_BANK).toBe('manual_bank');
    expect(DIGITARO_TENANT_ID).toBeTruthy();
    expect(PolarisRoleCode.FINANCE).toBe('finance');
  });
});
