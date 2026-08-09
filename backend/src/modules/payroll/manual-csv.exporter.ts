import type {
  CsvExportColumnDef,
  CsvExportProfileEntity,
} from './entities/csv-export-profile.entity';
import type {
  FundingAccountBankDetails,
  FundingAccountEntity,
} from './entities/funding-account.entity';

export type ManualCsvLine = {
  workerEmployeeId?: string;
  workerName?: string;
  accountNumber?: string;
  iban?: string;
  bankCode?: string;
  amount?: string;
  currency?: string;
  narration?: string;
  cnic?: string;
  costCentre?: string;
};

export const DEFAULT_CSV_COLUMNS: CsvExportColumnDef[] = [
  { key: 'workerEmployeeId', label: 'Employee ID', enabled: true, order: 1 },
  { key: 'workerName', label: 'Name', enabled: true, order: 2 },
  { key: 'accountNumber', label: 'Account number', enabled: true, order: 3 },
  { key: 'iban', label: 'IBAN', enabled: true, order: 4 },
  { key: 'bankCode', label: 'Bank code', enabled: false, order: 5 },
  { key: 'amount', label: 'Amount', enabled: true, order: 6 },
  { key: 'currency', label: 'Currency', enabled: true, order: 7 },
  { key: 'narration', label: 'Narration', enabled: true, order: 8 },
  { key: 'cnic', label: 'CNIC', enabled: false, order: 9 },
  { key: 'costCentre', label: 'Cost centre', enabled: false, order: 10 },
  {
    key: 'payerAccountNumber',
    label: 'Payer account',
    enabled: true,
    order: 11,
  },
  { key: 'payerIban', label: 'Payer IBAN', enabled: false, order: 12 },
];

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildManualCsv(
  profile: Pick<
    CsvExportProfileEntity,
    'columns' | 'includePayerFromFundingAccount'
  >,
  lines: ManualCsvLine[],
  fundingAccount: Pick<FundingAccountEntity, 'bankDetails'> | null,
): Buffer {
  const columns = [...profile.columns]
    .filter((c) => c.enabled)
    .sort((a, b) => a.order - b.order);

  const payer: FundingAccountBankDetails = fundingAccount?.bankDetails ?? {};
  const header = columns.map((c) => escapeCsv(c.label)).join(',');
  const rows = lines.map((line) => {
    const values = columns.map((col) => {
      let raw = '';
      if (col.key === 'payerAccountNumber') {
        raw = profile.includePayerFromFundingAccount
          ? (payer.accountNumber ?? '')
          : '';
      } else if (col.key === 'payerIban') {
        raw = profile.includePayerFromFundingAccount ? (payer.iban ?? '') : '';
      } else {
        raw = String((line as Record<string, string | undefined>)[col.key] ?? '');
      }
      return escapeCsv(raw);
    });
    return values.join(',');
  });

  return Buffer.from([header, ...rows].join('\n'), 'utf8');
}
