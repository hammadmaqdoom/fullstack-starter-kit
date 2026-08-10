import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { RbacService } from '@/modules/compliance/rbac.service';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  MatchBankFeedDto,
  QueryBankFeedsDto,
} from './dto/bank-feed.dto';
import { BankFeedTransactionEntity } from './entities/bank-feed-transaction.entity';
import { CardTransactionEntity } from './entities/card-transaction.entity';
import { FundingAccountEntity } from './entities/funding-account.entity';
import { PayoutBatchLineEntity } from './entities/payout-batch-line.entity';
import {
  BankFeedMatchStatus,
  FundingAccountProvider,
} from './enums/payout.enum';
import {
  AspireBankFeedClient,
  AspireBankFeedNotConfiguredError,
} from './integrations/aspire/aspire-bank-feed.client';
import { isPayrollAdmin } from './payroll-scope.util';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

@Injectable()
export class BankFeedSyncService {
  constructor(
    @InjectRepository(BankFeedTransactionEntity)
    private readonly feedRepository: Repository<BankFeedTransactionEntity>,
    @InjectRepository(FundingAccountEntity)
    private readonly fundingRepository: Repository<FundingAccountEntity>,
    @InjectRepository(PayoutBatchLineEntity)
    private readonly payoutLineRepository: Repository<PayoutBatchLineEntity>,
    @InjectRepository(CardTransactionEntity)
    private readonly cardTxnRepository: Repository<CardTransactionEntity>,
    private readonly aspireBankFeedClient: AspireBankFeedClient,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async sync(
    fundingAccountId: string,
    actor: ActorContext,
  ): Promise<{ inserted: number; updated: number }> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertFinance(actor.userId, tenantId);
    return this.syncFundingAccount(fundingAccountId, tenantId, actor);
  }

  /** System entry for daily cron — syncs all Aspire funding accounts. */
  async syncAllTenantsAspireAccounts(): Promise<number> {
    const accounts = await this.fundingRepository.find({
      where: {
        provider: FundingAccountProvider.ASPIRE,
        deletedAt: IsNull(),
      },
    });
    let total = 0;
    for (const account of accounts) {
      try {
        const result = await this.syncFundingAccount(account.id, account.tenantId, {
          userId: 'system-bank-feed',
          tenantId: account.tenantId,
        });
        total += result.inserted + result.updated;
      } catch {
        // Continue other accounts; daily job is best-effort.
      }
    }
    return total;
  }

  private async syncFundingAccount(
    fundingAccountId: string,
    tenantId: string,
    actor: ActorContext,
  ): Promise<{ inserted: number; updated: number }> {
    const funding = await this.fundingRepository.findOne({
      where: {
        id: fundingAccountId,
        tenantId,
        deletedAt: IsNull(),
      },
    });
    if (!funding) {
      throw new NotFoundException('Funding account not found');
    }
    if (funding.provider !== FundingAccountProvider.ASPIRE) {
      throw new BadRequestException(
        'Bank feed sync is only supported for Aspire funding accounts',
      );
    }
    if (!funding.externalAccountId) {
      throw new BadRequestException('Funding account missing externalAccountId');
    }

    let remote;
    try {
      remote = await this.aspireBankFeedClient.listTransactions({
        externalAccountId: funding.externalAccountId,
      });
    } catch (err) {
      if (err instanceof AspireBankFeedNotConfiguredError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    let inserted = 0;
    let updated = 0;
    for (const txn of remote) {
      if (!txn.providerTxnId) continue;
      const existing = await this.feedRepository.findOne({
        where: {
          tenantId,
          fundingAccountId: funding.id,
          providerTxnId: txn.providerTxnId,
        },
      });
      if (existing) {
        existing.amount = txn.amount;
        existing.txnType = txn.txnType;
        existing.currency = txn.currency;
        existing.description = txn.description;
        existing.bookedAt = txn.bookedAt;
        existing.rawPayload = txn.raw;
        await this.feedRepository.save(existing);
        updated += 1;
      } else {
        await this.feedRepository.save(
          this.feedRepository.create({
            tenantId,
            fundingAccountId: funding.id,
            providerTxnId: txn.providerTxnId,
            txnType: txn.txnType,
            amount: txn.amount,
            currency: txn.currency,
            description: txn.description,
            bookedAt: txn.bookedAt,
            matchStatus: BankFeedMatchStatus.UNMATCHED,
            matchedPayoutBatchLineId: null,
            matchedCardTransactionId: null,
            rawPayload: txn.raw,
          }),
        );
        inserted += 1;
      }
    }

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'bank_feed.sync',
      entityType: 'funding_account',
      entityId: funding.id,
      changes: {
        inserted: { old: null, new: inserted },
        updated: { old: null, new: updated },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return { inserted, updated };
  }

  async list(
    query: QueryBankFeedsDto,
    actor: ActorContext,
  ): Promise<PaginatedServiceResult<BankFeedTransactionEntity>> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertFinance(actor.userId, tenantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const qb = this.feedRepository
      .createQueryBuilder('feed')
      .where('feed.tenantId = :tenantId', { tenantId })
      .orderBy('feed.bookedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('feed.createdAt', 'DESC');

    if (query.matchStatus) {
      qb.andWhere('feed.matchStatus = :matchStatus', {
        matchStatus: query.matchStatus,
      });
    }
    if (query.fundingAccountId) {
      qb.andWhere('feed.fundingAccountId = :fundingAccountId', {
        fundingAccountId: query.fundingAccountId,
      });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async match(
    feedId: string,
    dto: MatchBankFeedDto,
    actor: ActorContext,
  ): Promise<BankFeedTransactionEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertFinance(actor.userId, tenantId);
    const feed = await this.requireFeed(tenantId, feedId);

    if (dto.payoutBatchLineId && dto.cardTransactionId) {
      throw new BadRequestException('Provide only one match target');
    }
    if (!dto.payoutBatchLineId && !dto.cardTransactionId) {
      throw new BadRequestException(
        'Provide payoutBatchLineId or cardTransactionId',
      );
    }

    if (feed.matchStatus !== BankFeedMatchStatus.UNMATCHED) {
      throw new ConflictException('Feed transaction already matched or ignored');
    }

    if (dto.payoutBatchLineId) {
      const line = await this.payoutLineRepository.findOne({
        where: { id: dto.payoutBatchLineId, tenantId },
      });
      if (!line) {
        throw new NotFoundException('Payout batch line not found');
      }
      feed.matchedPayoutBatchLineId = line.id;
      feed.matchedCardTransactionId = null;
      feed.matchStatus = BankFeedMatchStatus.MATCHED_PAYOUT;
    } else if (dto.cardTransactionId) {
      const cardTxn = await this.cardTxnRepository.findOne({
        where: { id: dto.cardTransactionId, tenantId },
      });
      if (!cardTxn) {
        throw new NotFoundException('Card transaction not found');
      }
      feed.matchedCardTransactionId = cardTxn.id;
      feed.matchedPayoutBatchLineId = null;
      feed.matchStatus = BankFeedMatchStatus.MATCHED_CARD;
    }

    const saved = await this.feedRepository.save(feed);
    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'bank_feed.match',
      entityType: 'bank_feed_transaction',
      entityId: saved.id,
      changes: {
        matchStatus: { old: BankFeedMatchStatus.UNMATCHED, new: saved.matchStatus },
        matchedPayoutBatchLineId: {
          old: null,
          new: saved.matchedPayoutBatchLineId,
        },
        matchedCardTransactionId: {
          old: null,
          new: saved.matchedCardTransactionId,
        },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
    return saved;
  }

  async ignore(
    feedId: string,
    actor: ActorContext,
  ): Promise<BankFeedTransactionEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertFinance(actor.userId, tenantId);
    const feed = await this.requireFeed(tenantId, feedId);
    if (feed.matchStatus !== BankFeedMatchStatus.UNMATCHED) {
      throw new ConflictException('Feed transaction already matched or ignored');
    }
    feed.matchStatus = BankFeedMatchStatus.IGNORED;
    const saved = await this.feedRepository.save(feed);
    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'bank_feed.ignore',
      entityType: 'bank_feed_transaction',
      entityId: saved.id,
      changes: {
        matchStatus: {
          old: BankFeedMatchStatus.UNMATCHED,
          new: BankFeedMatchStatus.IGNORED,
        },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
    return saved;
  }

  private async requireFeed(
    tenantId: string,
    feedId: string,
  ): Promise<BankFeedTransactionEntity> {
    const feed = await this.feedRepository.findOne({
      where: { id: feedId, tenantId },
    });
    if (!feed) {
      throw new NotFoundException('Bank feed transaction not found');
    }
    return feed;
  }

  private async assertFinance(userId: string, tenantId: string): Promise<void> {
    const auth = await this.rbacService.getAuthContext(userId, tenantId);
    if (!isPayrollAdmin(auth)) {
      throw new ForbiddenException('Finance access required');
    }
  }
}
