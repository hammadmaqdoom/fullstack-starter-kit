import { ConfigService } from '@nestjs/config';
import type { FundingAccountEntity } from '../../entities/funding-account.entity';
import type { PayoutBatchLineEntity } from '../../entities/payout-batch-line.entity';
import type { PayoutBatchEntity } from '../../entities/payout-batch.entity';
import { PayoutBatchStatus, PayoutLineStatus } from '../../enums/payout.enum';
import {
  AspireNotConfiguredError,
  WiseNotConfiguredError,
} from '../payout-adapter.types';
import { AspirePayoutAdapter } from '../aspire/aspire-payout.adapter';
import { WisePayoutAdapter } from '../wise/wise-payout.adapter';

describe('AspirePayoutAdapter', () => {
  it('throws AspireNotConfiguredError when credentials missing', async () => {
    const adapter = new AspirePayoutAdapter({
      get: () => undefined,
    } as unknown as ConfigService);

    await expect(
      adapter.submitBatch(
        {
          id: 'b1',
          status: PayoutBatchStatus.PREVIEWED,
        } as PayoutBatchEntity,
        [
          {
            id: 'l1',
            status: PayoutLineStatus.PENDING,
            amount: '10',
            currency: 'SGD',
            workerId: 'w1',
          } as PayoutBatchLineEntity,
        ],
        { externalAccountId: 'acc', currency: 'SGD' } as FundingAccountEntity,
      ),
    ).rejects.toBeInstanceOf(AspireNotConfiguredError);
  });
});

describe('WisePayoutAdapter', () => {
  it('throws WiseNotConfiguredError when token missing', async () => {
    const adapter = new WisePayoutAdapter({
      get: () => undefined,
    } as unknown as ConfigService);

    await expect(
      adapter.submitBatch(
        { id: 'b1' } as PayoutBatchEntity,
        [
          {
            id: 'l1',
            status: PayoutLineStatus.PENDING,
            amount: '10',
            currency: 'SGD',
          } as PayoutBatchLineEntity,
        ],
        { currency: 'SGD' } as FundingAccountEntity,
      ),
    ).rejects.toBeInstanceOf(WiseNotConfiguredError);
  });
});
