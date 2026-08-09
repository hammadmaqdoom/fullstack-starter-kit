import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExpenseClaimEntity } from '../entities/expense-claim.entity';
import {
  ExpenseClaimStatus,
  ExpenseSettlementMode,
} from '../enums/expense.enum';
import { ExpenseSettlementService } from '../expense-settlement.service';

describe('ExpenseSettlementService', () => {
  let service: ExpenseSettlementService;
  let findOne: jest.Mock;
  let save: jest.Mock;

  beforeEach(async () => {
    findOne = jest.fn();
    save = jest.fn(async (row) => row);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseSettlementService,
        {
          provide: getRepositoryToken(ExpenseClaimEntity),
          useValue: { findOne, save },
        },
      ],
    }).compile();

    service = module.get(ExpenseSettlementService);
  });

  it('blocks standalone payout when bundled with payroll', async () => {
    findOne.mockResolvedValue({
      id: 'c1',
      tenantId: 't1',
      settlementMode: ExpenseSettlementMode.BUNDLE_WITH_PAYROLL,
      payRunLineItemId: 'line-1',
      status: ExpenseClaimStatus.APPROVED,
    });

    await expect(
      service.assertEligibleForStandalonePayout('t1', 'c1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows standalone when mode is standalone_payout and not linked', async () => {
    findOne.mockResolvedValue({
      id: 'c1',
      tenantId: 't1',
      settlementMode: ExpenseSettlementMode.STANDALONE_PAYOUT,
      payRunLineItemId: null,
      status: ExpenseClaimStatus.APPROVED,
    });

    const claim = await service.assertEligibleForStandalonePayout('t1', 'c1');
    expect(claim.id).toBe('c1');
  });

  it('blocks export_only from standalone payout', async () => {
    findOne.mockResolvedValue({
      id: 'c1',
      tenantId: 't1',
      settlementMode: ExpenseSettlementMode.EXPORT_ONLY,
      payRunLineItemId: null,
      status: ExpenseClaimStatus.APPROVED,
    });

    await expect(
      service.assertEligibleForStandalonePayout('t1', 'c1'),
    ).rejects.toThrow(/standalone_payout/);
  });
});
