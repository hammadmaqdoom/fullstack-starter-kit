import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { ExpenseClaimEntity } from '@/modules/operations/entities/expense-claim.entity';
import {
  ExpenseCategory,
  ExpenseSettlementMode,
} from '@/modules/operations/enums/expense.enum';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CorporateCardService } from '../corporate-card.service';
import { CardTransactionEntity } from '../entities/card-transaction.entity';
import { CorporateCardEntity } from '../entities/corporate-card.entity';
import { FundingAccountEntity } from '../entities/funding-account.entity';
import {
  CorporateCardProvider,
  FundingAccountProvider,
} from '../enums/payout.enum';
import { AspireCardsClient } from '../integrations/aspire/aspire-cards.client';
import { WiseCardsClient } from '../integrations/wise/wise-cards.client';

describe('CorporateCardService', () => {
  let service: CorporateCardService;
  let cardSave: jest.Mock;
  let txnFindOne: jest.Mock;
  let txnSave: jest.Mock;
  let expenseSave: jest.Mock;
  let fundingFindOne: jest.Mock;
  let issueCard: jest.Mock;

  const userId = 'u1';
  const financeAuth = {
    roleCodes: [PolarisRoleCode.FINANCE],
    scopeType: ScopeType.ALL,
  };

  beforeEach(async () => {
    cardSave = jest.fn(async (row) => ({ id: 'card-1', ...row }));
    txnFindOne = jest.fn();
    txnSave = jest.fn(async (row) => row);
    expenseSave = jest.fn(async (row) => ({ id: 'exp-1', ...row }));
    fundingFindOne = jest.fn().mockResolvedValue({
      id: 'fa-1',
      legalEntityId: 'le-1',
      provider: FundingAccountProvider.ASPIRE,
      externalAccountId: 'asp-1',
    });
    issueCard = jest.fn().mockResolvedValue({
      externalCardId: 'ext-card-1',
      raw: {},
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateCardService,
        {
          provide: getRepositoryToken(CorporateCardEntity),
          useValue: {
            save: cardSave,
            create: (r: unknown) => r,
            findOne: jest.fn().mockResolvedValue({
              id: 'card-1',
              tenantId: DIGITARO_TENANT_ID,
              legalEntityId: 'le-1',
              workerId: 'w1',
              travelRequestId: null,
            }),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CardTransactionEntity),
          useValue: {
            findOne: txnFindOne,
            save: txnSave,
            create: (r: unknown) => r,
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(FundingAccountEntity),
          useValue: { findOne: fundingFindOne },
        },
        {
          provide: getRepositoryToken(ExpenseClaimEntity),
          useValue: {
            save: expenseSave,
            create: (r: unknown) => r,
          },
        },
        { provide: AspireCardsClient, useValue: { issueCard, listTransactions: jest.fn() } },
        { provide: WiseCardsClient, useValue: { issueCard: jest.fn(), listTransactions: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: AuditLogService, useValue: { append: jest.fn() } },
        {
          provide: RbacService,
          useValue: {
            getAuthContext: jest.fn().mockResolvedValue(financeAuth),
          },
        },
      ],
    }).compile();

    service = module.get(CorporateCardService);
  });

  it('issues Aspire card when Aspire funding exists', async () => {
    const card = await service.issueCard(
      {
        legalEntityId: 'le-1',
        provider: CorporateCardProvider.ASPIRE,
        label: 'Travel',
        currency: 'SGD',
        spendLimit: '1000.00',
        fundingAccountId: 'fa-1',
        workerId: 'w1',
      },
      { userId, tenantId: DIGITARO_TENANT_ID },
    );

    expect(issueCard).toHaveBeenCalled();
    expect(card.externalCardId).toBe('ext-card-1');
    expect(card.provider).toBe(CorporateCardProvider.ASPIRE);
  });

  it('allocates card txn to draft expense with export_only', async () => {
    txnFindOne.mockResolvedValue({
      id: 'ctxn-1',
      tenantId: DIGITARO_TENANT_ID,
      corporateCardId: 'card-1',
      amount: '42.50',
      currency: 'SGD',
      merchant: 'Grab',
      transactedAt: new Date('2026-08-02'),
      expenseClaimId: null,
    });

    const result = await service.allocateToExpense(
      'ctxn-1',
      { category: ExpenseCategory.TRAVEL, note: 'Airport taxi' },
      { userId, tenantId: DIGITARO_TENANT_ID },
    );

    expect(result.expenseClaimId).toBe('exp-1');
    expect(expenseSave).toHaveBeenCalledWith(
      expect.objectContaining({
        settlementMode: ExpenseSettlementMode.EXPORT_ONLY,
        cardTransactionId: 'ctxn-1',
        amount: '42.50',
      }),
    );
  });

  it('rejects allocate when already linked', async () => {
    txnFindOne.mockResolvedValue({
      id: 'ctxn-1',
      tenantId: DIGITARO_TENANT_ID,
      expenseClaimId: 'exp-existing',
    });

    await expect(
      service.allocateToExpense(
        'ctxn-1',
        { category: ExpenseCategory.TRAVEL },
        { userId, tenantId: DIGITARO_TENANT_ID },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
