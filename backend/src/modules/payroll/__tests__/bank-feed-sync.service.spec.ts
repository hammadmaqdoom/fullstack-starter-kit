import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BankFeedSyncService } from '../bank-feed-sync.service';
import { BankFeedTransactionEntity } from '../entities/bank-feed-transaction.entity';
import { CardTransactionEntity } from '../entities/card-transaction.entity';
import { FundingAccountEntity } from '../entities/funding-account.entity';
import { PayoutBatchLineEntity } from '../entities/payout-batch-line.entity';
import {
  BankFeedMatchStatus,
  FundingAccountProvider,
} from '../enums/payout.enum';
import { AspireBankFeedClient } from '../integrations/aspire/aspire-bank-feed.client';

describe('BankFeedSyncService', () => {
  let service: BankFeedSyncService;
  let feedSave: jest.Mock;
  let feedFindOne: jest.Mock;
  let fundingFindOne: jest.Mock;
  let listTransactions: jest.Mock;
  let payoutLineFindOne: jest.Mock;

  const userId = 'u1';
  const financeAuth = {
    roleCodes: [PolarisRoleCode.FINANCE],
    scopeType: ScopeType.ALL,
  };

  beforeEach(async () => {
    feedSave = jest.fn(async (row) => ({ id: 'feed-1', ...row }));
    feedFindOne = jest.fn();
    fundingFindOne = jest.fn().mockResolvedValue({
      id: 'fa-1',
      tenantId: DIGITARO_TENANT_ID,
      provider: FundingAccountProvider.ASPIRE,
      externalAccountId: 'asp-acc-1',
    });
    listTransactions = jest.fn().mockResolvedValue([
      {
        providerTxnId: 'txn-1',
        txnType: 'debit',
        amount: '-100.00',
        currency: 'SGD',
        description: 'Payout',
        bookedAt: new Date('2026-08-01'),
        raw: { id: 'txn-1' },
      },
    ]);
    payoutLineFindOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankFeedSyncService,
        {
          provide: getRepositoryToken(BankFeedTransactionEntity),
          useValue: {
            save: feedSave,
            create: (r: unknown) => r,
            findOne: feedFindOne,
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(FundingAccountEntity),
          useValue: { findOne: fundingFindOne, find: jest.fn() },
        },
        {
          provide: getRepositoryToken(PayoutBatchLineEntity),
          useValue: { findOne: payoutLineFindOne },
        },
        {
          provide: getRepositoryToken(CardTransactionEntity),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: AspireBankFeedClient,
          useValue: { listTransactions },
        },
        { provide: AuditLogService, useValue: { append: jest.fn() } },
        {
          provide: RbacService,
          useValue: {
            getAuthContext: jest.fn().mockResolvedValue(financeAuth),
          },
        },
      ],
    }).compile();

    service = module.get(BankFeedSyncService);
  });

  it('upserts by provider txn id with signed debit amount', async () => {
    feedFindOne.mockResolvedValue(null);

    const result = await service.sync('fa-1', {
      userId,
      tenantId: DIGITARO_TENANT_ID,
    });

    expect(result.inserted).toBe(1);
    expect(feedSave).toHaveBeenCalledWith(
      expect.objectContaining({
        providerTxnId: 'txn-1',
        amount: '-100.00',
        txnType: 'debit',
        matchStatus: BankFeedMatchStatus.UNMATCHED,
      }),
    );
  });

  it('matches to payout line and sets status', async () => {
    feedFindOne.mockResolvedValue({
      id: 'feed-1',
      tenantId: DIGITARO_TENANT_ID,
      matchStatus: BankFeedMatchStatus.UNMATCHED,
    });
    payoutLineFindOne.mockResolvedValue({
      id: 'line-1',
      tenantId: DIGITARO_TENANT_ID,
    });

    const saved = await service.match(
      'feed-1',
      { payoutBatchLineId: 'line-1' },
      { userId, tenantId: DIGITARO_TENANT_ID },
    );

    expect(saved.matchStatus).toBe(BankFeedMatchStatus.MATCHED_PAYOUT);
    expect(saved.matchedPayoutBatchLineId).toBe('line-1');
  });

  it('rejects rematch', async () => {
    feedFindOne.mockResolvedValue({
      id: 'feed-1',
      tenantId: DIGITARO_TENANT_ID,
      matchStatus: BankFeedMatchStatus.MATCHED_PAYOUT,
    });

    await expect(
      service.match(
        'feed-1',
        { payoutBatchLineId: 'line-1' },
        { userId, tenantId: DIGITARO_TENANT_ID },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
