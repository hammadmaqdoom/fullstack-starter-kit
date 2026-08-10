import type { FundingAccountEntity } from '../entities/funding-account.entity';
import type { PayoutBatchLineEntity } from '../entities/payout-batch-line.entity';
import type { PayoutBatchEntity } from '../entities/payout-batch.entity';

export type PayoutAdapterSubmitResult = {
  providerBatchId: string;
  lineExternalIds: Record<string, string>;
};

export interface PayoutAdapter {
  submitBatch(
    batch: PayoutBatchEntity,
    lines: PayoutBatchLineEntity[],
    funding: FundingAccountEntity,
  ): Promise<PayoutAdapterSubmitResult>;
}

export class AspireNotConfiguredError extends Error {
  constructor() {
    super(
      'Aspire payout API is not configured (ASPIRE_CLIENT_ID / ASPIRE_CLIENT_SECRET)',
    );
    this.name = 'AspireNotConfiguredError';
  }
}

export class WiseNotConfiguredError extends Error {
  constructor() {
    super(
      'Wise payout API is not configured (WISE_API_TOKEN / WISE_PROFILE_ID)',
    );
    this.name = 'WiseNotConfiguredError';
  }
}
