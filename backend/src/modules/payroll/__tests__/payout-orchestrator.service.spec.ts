import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { WorkerBankAccountEntity } from '@/modules/core-hr/entities/worker-bank-account.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { ExpenseClaimEntity } from '@/modules/operations/entities/expense-claim.entity';
import { ExpenseSettlementService } from '@/modules/operations/expense-settlement.service';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContractorPaymentLineEntity } from '../entities/contractor-payment-line.entity';
import { CsvExportProfileEntity } from '../entities/csv-export-profile.entity';
import { FundingAccountEntity } from '../entities/funding-account.entity';
import { PayRunLineItemEntity } from '../entities/pay-run-line-item.entity';
import { PayRunEntity } from '../entities/pay-run.entity';
import { PayoutBatchLineEntity } from '../entities/payout-batch-line.entity';
import { PayoutBatchEntity } from '../entities/payout-batch.entity';
import {
  FundingAccountProvider,
  PayoutBatchType,
  PayoutRail,
} from '../enums/payout.enum';
import { PayRunStatus } from '../enums/payroll.enum';
import { PayoutOrchestratorService } from '../payout-orchestrator.service';
import { PayoutRailResolverService } from '../payout-rail-resolver.service';

describe('PayoutOrchestratorService', () => {
  let service: PayoutOrchestratorService;
  let payRunFindOne: jest.Mock;
  let payRunLineFind: jest.Mock;
  let expenseFind: jest.Mock;
  let fundingFindOne: jest.Mock;
  let legalFindOne: jest.Mock;
  let bankFindOne: jest.Mock;
  let batchSave: jest.Mock;
  let lineSave: jest.Mock;
  let resolve: jest.Mock;

  const actor = { userId: 'u1', tenantId: DIGITARO_TENANT_ID };

  beforeEach(async () => {
    payRunFindOne = jest.fn();
    payRunLineFind = jest.fn();
    expenseFind = jest.fn().mockResolvedValue([]);
    fundingFindOne = jest.fn();
    legalFindOne = jest.fn().mockResolvedValue({
      id: 'le-sg',
      countryCode: 'SG',
      tenantId: DIGITARO_TENANT_ID,
    });
    bankFindOne = jest.fn().mockResolvedValue({ bankCountryCode: 'SG' });
    batchSave = jest.fn(async (row) => ({ id: 'batch-1', ...row }));
    lineSave = jest.fn(async (rows) => rows);
    resolve = jest.fn().mockResolvedValue({
      resolvedRail: PayoutRail.ASPIRE,
      allowedRails: [PayoutRail.ASPIRE, PayoutRail.WISE, PayoutRail.MANUAL_BANK],
      reasonCodes: [],
      suggestedFundingAccountId: 'fa-aspire',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutOrchestratorService,
        {
          provide: getRepositoryToken(PayoutBatchEntity),
          useValue: {
            save: batchSave,
            create: (r: unknown) => r,
            findOne: jest.fn(),
            findOneOrFail: jest.fn(async () => ({
              id: 'batch-1',
              lines: [],
            })),
          },
        },
        {
          provide: getRepositoryToken(PayoutBatchLineEntity),
          useValue: {
            save: lineSave,
            create: (r: unknown) => r,
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(PayRunEntity),
          useValue: { findOne: payRunFindOne },
        },
        {
          provide: getRepositoryToken(PayRunLineItemEntity),
          useValue: { find: payRunLineFind },
        },
        {
          provide: getRepositoryToken(ExpenseClaimEntity),
          useValue: { find: expenseFind },
        },
        {
          provide: getRepositoryToken(ContractorPaymentLineEntity),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(FundingAccountEntity),
          useValue: { findOne: fundingFindOne },
        },
        {
          provide: getRepositoryToken(LegalEntityEntity),
          useValue: { findOne: legalFindOne },
        },
        {
          provide: getRepositoryToken(WorkerBankAccountEntity),
          useValue: { findOne: bankFindOne },
        },
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(CsvExportProfileEntity),
          useValue: { findOne: jest.fn() },
        },
        { provide: PayoutRailResolverService, useValue: { resolve } },
        {
          provide: ExpenseSettlementService,
          useValue: { markPaidFromPayout: jest.fn() },
        },
        { provide: AuditLogService, useValue: { append: jest.fn() } },
      ],
    }).compile();

    service = module.get(PayoutOrchestratorService);
  });

  it('rejects createDraft when funding provider mismatches rail', async () => {
    payRunFindOne.mockResolvedValue({
      id: 'pr1',
      status: PayRunStatus.APPROVED,
    });
    payRunLineFind.mockResolvedValue([
      {
        id: 'li1',
        workerId: 'w1',
        netPay: '1000',
        currencyCode: 'SGD',
      },
    ]);
    fundingFindOne.mockResolvedValue({
      id: 'fa-manual',
      provider: FundingAccountProvider.MANUAL_BANK,
    });

    await expect(
      service.createDraft(
        {
          batchType: PayoutBatchType.PAYROLL,
          legalEntityId: 'le-sg',
          sourceId: 'pr1',
          rail: PayoutRail.ASPIRE,
          fundingAccountId: 'fa-manual',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('flags MISSING_BANK when worker has no bank', async () => {
    payRunFindOne.mockResolvedValue({
      id: 'pr1',
      status: PayRunStatus.APPROVED,
    });
    payRunLineFind.mockResolvedValue([
      {
        id: 'li1',
        workerId: 'w1',
        netPay: '1000',
        currencyCode: 'SGD',
      },
    ]);
    bankFindOne.mockResolvedValue(null);

    const preview = await service.preview(
      {
        batchType: PayoutBatchType.PAYROLL,
        legalEntityId: 'le-sg',
        sourceId: 'pr1',
      },
      actor,
    );

    expect(preview.lines[0].issues).toContain('MISSING_BANK');
  });

  it('rejects executeManual when rail is not manual_bank', async () => {
    const batchRepo = (
      service as unknown as {
        batchRepository: { findOne: jest.Mock };
      }
    ).batchRepository;
    batchRepo.findOne = jest.fn().mockResolvedValue({
      id: 'batch-1',
      rail: PayoutRail.ASPIRE,
      tenantId: DIGITARO_TENANT_ID,
    });

    await expect(
      service.executeManual('batch-1', actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
