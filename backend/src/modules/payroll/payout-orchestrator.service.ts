import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { WorkerBankAccountEntity } from '@/modules/core-hr/entities/worker-bank-account.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { ExpenseClaimEntity } from '@/modules/operations/entities/expense-claim.entity';
import {
  ExpenseClaimStatus,
  ExpenseSettlementMode,
} from '@/modules/operations/enums/expense.enum';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  CreatePayoutBatchDto,
  PreviewPayoutBatchDto,
} from './dto/payout-batch.dto';
import { FundingAccountEntity } from './entities/funding-account.entity';
import { PayRunLineItemEntity } from './entities/pay-run-line-item.entity';
import { PayRunEntity } from './entities/pay-run.entity';
import { PayoutBatchLineEntity } from './entities/payout-batch-line.entity';
import { PayoutBatchEntity } from './entities/payout-batch.entity';
import { ContractorPaymentLineEntity } from './entities/contractor-payment-line.entity';
import {
  FundingAccountProvider,
  PayoutBatchStatus,
  PayoutBatchType,
  PayoutLineStatus,
  PayoutRail,
  PayoutSourceType,
} from './enums/payout.enum';
import { PayRunStatus } from './enums/payroll.enum';
import {
  PayoutRailResolverService,
  ResolvePayoutRailResult,
} from './payout-rail-resolver.service';

type ActorContext = {
  userId: string;
  tenantId: string;
  correlationId?: string;
  ipAddress?: string;
};

export type PreviewLine = {
  sourceType: PayoutSourceType;
  sourceId: string;
  workerId: string;
  amount: string;
  currency: string;
  issues: string[];
};

@Injectable()
export class PayoutOrchestratorService {
  constructor(
    @InjectRepository(PayoutBatchEntity)
    private readonly batchRepository: Repository<PayoutBatchEntity>,
    @InjectRepository(PayoutBatchLineEntity)
    private readonly lineRepository: Repository<PayoutBatchLineEntity>,
    @InjectRepository(PayRunEntity)
    private readonly payRunRepository: Repository<PayRunEntity>,
    @InjectRepository(PayRunLineItemEntity)
    private readonly payRunLineRepository: Repository<PayRunLineItemEntity>,
    @InjectRepository(ExpenseClaimEntity)
    private readonly expenseRepository: Repository<ExpenseClaimEntity>,
    @InjectRepository(ContractorPaymentLineEntity)
    private readonly contractorLineRepository: Repository<ContractorPaymentLineEntity>,
    @InjectRepository(FundingAccountEntity)
    private readonly fundingRepository: Repository<FundingAccountEntity>,
    @InjectRepository(LegalEntityEntity)
    private readonly legalEntityRepository: Repository<LegalEntityEntity>,
    @InjectRepository(WorkerBankAccountEntity)
    private readonly bankRepository: Repository<WorkerBankAccountEntity>,
    private readonly railResolver: PayoutRailResolverService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async preview(
    dto: PreviewPayoutBatchDto,
    actor: ActorContext,
  ): Promise<{
    lines: PreviewLine[];
    resolution: ResolvePayoutRailResult;
  }> {
    const lines = await this.buildPreviewLines(dto, actor.tenantId);
    const legalEntity = await this.legalEntityRepository.findOne({
      where: { id: dto.legalEntityId, tenantId: actor.tenantId },
    });
    if (!legalEntity) {
      throw new NotFoundException('Legal entity not found');
    }

    const sampleWorkerId = lines[0]?.workerId;
    let recipientBankCountry = legalEntity.countryCode;
    if (sampleWorkerId) {
      const bank = await this.bankRepository.findOne({
        where: {
          tenantId: actor.tenantId,
          workerId: sampleWorkerId,
          isPrimary: true,
        },
      });
      if (bank) recipientBankCountry = bank.bankCountryCode;
    }

    const resolution = await this.railResolver.resolve({
      tenantId: actor.tenantId,
      legalEntityId: dto.legalEntityId,
      payerCountryCode: legalEntity.countryCode,
      recipientBankCountryCode: recipientBankCountry,
      paymentType:
        dto.batchType === PayoutBatchType.CONTRACTOR
          ? 'contractor_invoice'
          : dto.batchType === PayoutBatchType.EXPENSE_REIMBURSEMENT
            ? 'expense_reimbursement'
            : 'employee_payroll',
    });

    return { lines, resolution };
  }

  async createDraft(
    dto: CreatePayoutBatchDto,
    actor: ActorContext,
  ): Promise<PayoutBatchEntity> {
    const { lines, resolution } = await this.preview(dto, actor);
    if (!resolution.allowedRails.includes(dto.rail)) {
      throw new BadRequestException(
        `Rail ${dto.rail} is not allowed for this corridor`,
      );
    }

    const funding = await this.fundingRepository.findOne({
      where: {
        id: dto.fundingAccountId,
        tenantId: actor.tenantId,
        legalEntityId: dto.legalEntityId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });
    if (!funding) {
      throw new BadRequestException('Funding account not found for entity');
    }
    const expectedProvider =
      dto.rail === PayoutRail.ASPIRE
        ? FundingAccountProvider.ASPIRE
        : dto.rail === PayoutRail.WISE
          ? FundingAccountProvider.WISE
          : FundingAccountProvider.MANUAL_BANK;
    if (funding.provider !== expectedProvider) {
      throw new BadRequestException(
        'Funding account provider does not match selected rail',
      );
    }

    const batch = await this.batchRepository.save(
      this.batchRepository.create({
        tenantId: actor.tenantId,
        legalEntityId: dto.legalEntityId,
        batchType: dto.batchType,
        rail: dto.rail,
        fundingAccountId: dto.fundingAccountId,
        csvExportProfileId: dto.csvExportProfileId ?? null,
        sourceId: dto.sourceId ?? null,
        status: PayoutBatchStatus.PREVIEWED,
        reasonCodes: resolution.reasonCodes,
      }),
    );

    const lineEntities = lines.map((line) =>
      this.lineRepository.create({
        tenantId: actor.tenantId,
        batchId: batch.id,
        sourceType: line.sourceType,
        sourceId: line.sourceId,
        workerId: line.workerId,
        amount: line.amount,
        currency: line.currency,
        status: line.issues.length
          ? PayoutLineStatus.SKIPPED
          : PayoutLineStatus.PENDING,
        issues: line.issues,
      }),
    );
    await this.lineRepository.save(lineEntities);

    await this.auditLogService.append({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action: 'payout_batch.create_draft',
      entityType: 'payout_batch',
      entityId: batch.id,
      changes: {
        rail: { old: null, new: batch.rail },
        batchType: { old: null, new: batch.batchType },
        lineCount: { old: null, new: lineEntities.length },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return this.batchRepository.findOneOrFail({
      where: { id: batch.id },
      relations: ['lines'],
    });
  }

  private async buildPreviewLines(
    dto: PreviewPayoutBatchDto,
    tenantId: string,
  ): Promise<PreviewLine[]> {
    if (dto.batchType === PayoutBatchType.PAYROLL) {
      if (!dto.sourceId) {
        throw new BadRequestException('sourceId (payRunId) is required');
      }
      const payRun = await this.payRunRepository.findOne({
        where: { id: dto.sourceId, tenantId },
      });
      if (!payRun) throw new NotFoundException('Pay run not found');
      if (
        ![PayRunStatus.APPROVED, PayRunStatus.EXPORTED].includes(payRun.status)
      ) {
        throw new BadRequestException('Pay run must be approved or exported');
      }

      const payLines = await this.payRunLineRepository.find({
        where: { payRunId: payRun.id, tenantId },
      });

      const bundledClaims = await this.expenseRepository.find({
        where: {
          tenantId,
          legalEntityId: dto.legalEntityId,
          status: ExpenseClaimStatus.APPROVED,
          settlementMode: ExpenseSettlementMode.BUNDLE_WITH_PAYROLL,
        },
      });

      const lines: PreviewLine[] = [];
      for (const pl of payLines) {
        const issues = await this.bankIssues(tenantId, pl.workerId);
        lines.push({
          sourceType: PayoutSourceType.PAY_RUN_LINE,
          sourceId: pl.id,
          workerId: pl.workerId,
          amount: pl.netPay,
          currency: pl.currencyCode,
          issues,
        });
      }

      for (const claim of bundledClaims) {
        if (claim.settlementMode === ExpenseSettlementMode.EXPORT_ONLY) {
          continue;
        }
        const issues = await this.bankIssues(tenantId, claim.workerId);
        lines.push({
          sourceType: PayoutSourceType.EXPENSE_CLAIM,
          sourceId: claim.id,
          workerId: claim.workerId,
          amount: claim.amount,
          currency: claim.currencyCode,
          issues,
        });
      }
      return lines;
    }

    if (dto.batchType === PayoutBatchType.EXPENSE_REIMBURSEMENT) {
      const ids = dto.expenseClaimIds ?? [];
      if (!ids.length) {
        throw new BadRequestException('expenseClaimIds required');
      }
      const claims = await this.expenseRepository.find({
        where: {
          tenantId,
          id: In(ids),
          status: ExpenseClaimStatus.APPROVED,
          settlementMode: ExpenseSettlementMode.STANDALONE_PAYOUT,
        },
      });
      const lines: PreviewLine[] = [];
      for (const claim of claims) {
        if (claim.payRunLineItemId) {
          lines.push({
            sourceType: PayoutSourceType.EXPENSE_CLAIM,
            sourceId: claim.id,
            workerId: claim.workerId,
            amount: claim.amount,
            currency: claim.currencyCode,
            issues: ['ALREADY_BUNDLED'],
          });
          continue;
        }
        const issues = await this.bankIssues(tenantId, claim.workerId);
        lines.push({
          sourceType: PayoutSourceType.EXPENSE_CLAIM,
          sourceId: claim.id,
          workerId: claim.workerId,
          amount: claim.amount,
          currency: claim.currencyCode,
          issues,
        });
      }
      return lines;
    }

    if (dto.batchType === PayoutBatchType.CONTRACTOR) {
      if (!dto.sourceId) {
        throw new BadRequestException('sourceId (contractor batch) required');
      }
      const cLines = await this.contractorLineRepository.find({
        where: { tenantId, batchId: dto.sourceId },
      });
      const lines: PreviewLine[] = [];
      for (const cl of cLines) {
        const issues = await this.bankIssues(tenantId, cl.workerId);
        lines.push({
          sourceType: PayoutSourceType.CONTRACTOR_PAYMENT_LINE,
          sourceId: cl.id,
          workerId: cl.workerId,
          amount: cl.amount,
          currency: 'USD',
          issues,
        });
      }
      return lines;
    }

    throw new BadRequestException('Unsupported batch type');
  }

  private async bankIssues(
    tenantId: string,
    workerId: string,
  ): Promise<string[]> {
    const bank = await this.bankRepository.findOne({
      where: { tenantId, workerId, isPrimary: true },
    });
    return bank ? [] : ['MISSING_BANK'];
  }
}
