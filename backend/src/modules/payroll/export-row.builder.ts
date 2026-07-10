import { ExportColumnMapping } from './entities/finance-export-profile.entity';
import { PayRunLineItemEntity } from './entities/pay-run-line-item.entity';

/**
 * Column mapping used when no `FinanceExportProfile` matches a pay run's
 * legal entity / country (task spec — Finance can still export before a
 * profile is configured).
 */
export const DEFAULT_EXPORT_COLUMN_MAPPINGS: ExportColumnMapping[] = [
  { key: 'workerName', header: 'Worker' },
  { key: 'bankAccount', header: 'Bank Account' },
  { key: 'grossPay', header: 'Gross Pay' },
  { key: 'totalDeductions', header: 'Total Deductions' },
  { key: 'netPay', header: 'Net Pay' },
  { key: 'currencyCode', header: 'Currency' },
  { key: 'paymentRef', header: 'Payment Reference' },
];

export interface ExportRowWorker {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  bankAccountNumber?: string | null;
}

/**
 * Masks all but the first/last two characters of a bank account number so
 * export packs don't leak full account details (compensation/bank field
 * redaction — see `polaris-compliance.mdc`).
 */
export function redactBankAccount(value?: string | null): string {
  if (!value) {
    return '';
  }
  if (value.length <= 4) {
    return '*'.repeat(value.length);
  }
  const start = value.slice(0, 2);
  const end = value.slice(-2);
  return `${start}${'*'.repeat(value.length - 4)}${end}`;
}

function resolveColumnValue(
  key: string,
  worker: ExportRowWorker | undefined,
  lineItem: PayRunLineItemEntity,
): string {
  switch (key) {
    case 'workerName':
      if (worker?.firstName || worker?.lastName) {
        return [worker.firstName, worker.lastName].filter(Boolean).join(' ');
      }
      return lineItem.workerId;
    case 'workerId':
      return lineItem.workerId;
    case 'bankAccount':
      return redactBankAccount(worker?.bankAccountNumber);
    case 'grossPay':
      return lineItem.grossPay;
    case 'totalDeductions':
      return lineItem.totalDeductions;
    case 'netPay':
      return lineItem.netPay;
    case 'currencyCode':
      return lineItem.currencyCode;
    case 'paymentRef':
      return lineItem.paymentReference ?? '';
    default:
      return '';
  }
}

/** Builds one export row (ordered by `columnMappings`) per pay run line item. */
export function buildExportRows(
  columnMappings: ExportColumnMapping[],
  lineItems: PayRunLineItemEntity[],
  workersById: Map<string, ExportRowWorker>,
): string[][] {
  return lineItems.map((lineItem) =>
    columnMappings.map((mapping) =>
      resolveColumnValue(
        mapping.key,
        workersById.get(lineItem.workerId),
        lineItem,
      ),
    ),
  );
}
