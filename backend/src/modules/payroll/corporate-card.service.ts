import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { RbacService } from '@/modules/compliance/rbac.service';
import {
  ExpenseCategory,
  ExpenseClaimStatus,
  ExpenseSettlementMode,
} from '@/modules/operations/enums/expense.enum';
import { ExpenseClaimEntity } from '@/modules/operations/entities/expense-claim.entity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  AllocateCardTransactionDto,
  IssueCorporateCardDto,
} from './dto/corporate-card.dto';
import { CardTransactionEntity } from './entities/card-transaction.entity';
import { CorporateCardEntity } from './entities/corporate-card.entity';
import { FundingAccountEntity } from './entities/funding-account.entity';
import {
  CorporateCardProvider,
  CorporateCardStatus,
  FundingAccountProvider,
} from './enums/payout.enum';
import {
  AspireCardsClient,
  AspireCardsNotConfiguredError,
} from './integrations/aspire/aspire-cards.client';
import {
  WiseCardsClient,
  WiseCardsNotConfiguredError,
} from './integrations/wise/wise-cards.client';
import { isPayrollAdmin } from './payroll-scope.util';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

@Injectable()
export class CorporateCardService {
  constructor(
    @InjectRepository(CorporateCardEntity)
    private readonly cardRepository: Repository<CorporateCardEntity>,
    @InjectRepository(CardTransactionEntity)
    private readonly txnRepository: Repository<CardTransactionEntity>,
    @InjectRepository(FundingAccountEntity)
    private readonly fundingRepository: Repository<FundingAccountEntity>,
    @InjectRepository(ExpenseClaimEntity)
    private readonly expenseRepository: Repository<ExpenseClaimEntity>,
    private readonly aspireCardsClient: AspireCardsClient,
    private readonly wiseCardsClient: WiseCardsClient,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async issueCard(
    dto: IssueCorporateCardDto,
    actor: ActorContext,
  ): Promise<CorporateCardEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertFinance(actor.userId, tenantId);

    const funding = await this.fundingRepository.findOne({
      where: {
        id: dto.fundingAccountId,
        tenantId,
        deletedAt: IsNull(),
      },
    });
    if (!funding) {
      throw new NotFoundException('Funding account not found');
    }
    if (funding.legalEntityId !== dto.legalEntityId) {
      throw new BadRequestException(
        'Funding account does not belong to legal entity',
      );
    }

    const expectedProvider =
      dto.provider === CorporateCardProvider.ASPIRE
        ? FundingAccountProvider.ASPIRE
        : FundingAccountProvider.WISE;
    if (funding.provider !== expectedProvider) {
      throw new BadRequestException(
        `Funding account provider must be ${expectedProvider} for ${dto.provider} cards`,
      );
    }

    let externalCardId: string | null = null;
    try {
      if (dto.provider === CorporateCardProvider.ASPIRE) {
        if (!funding.externalAccountId) {
          throw new BadRequestException(
            'Aspire funding account missing externalAccountId',
          );
        }
        const issued = await this.aspireCardsClient.issueCard({
          externalAccountId: funding.externalAccountId,
          label: dto.label,
          currency: dto.currency.toUpperCase(),
          spendLimit: dto.spendLimit,
        });
        externalCardId = issued.externalCardId;
      } else {
        const profileId = this.configService.get<string>('WISE_PROFILE_ID');
        if (!profileId) {
          throw new WiseCardsNotConfiguredError();
        }
        const issued = await this.wiseCardsClient.issueCard({
          profileId,
          label: dto.label,
          currency: dto.currency.toUpperCase(),
          spendLimit: dto.spendLimit,
        });
        externalCardId = issued.externalCardId;
      }
    } catch (err) {
      if (
        err instanceof AspireCardsNotConfiguredError ||
        err instanceof WiseCardsNotConfiguredError
      ) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const card = await this.cardRepository.save(
      this.cardRepository.create({
        tenantId,
        legalEntityId: dto.legalEntityId,
        fundingAccountId: funding.id,
        provider: dto.provider,
        externalCardId,
        label: dto.label,
        currency: dto.currency.toUpperCase(),
        spendLimit: dto.spendLimit,
        workerId: dto.workerId ?? null,
        travelRequestId: dto.travelRequestId ?? null,
        status: CorporateCardStatus.ACTIVE,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'corporate_card.issue',
      entityType: 'corporate_card',
      entityId: card.id,
      changes: {
        provider: { old: null, new: card.provider },
        externalCardId: { old: null, new: card.externalCardId },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return card;
  }

  async listCards(
    legalEntityId: string | undefined,
    actor: ActorContext,
  ): Promise<CorporateCardEntity[]> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertFinance(actor.userId, tenantId);
    return this.cardRepository.find({
      where: {
        tenantId,
        ...(legalEntityId ? { legalEntityId } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async listTransactions(
    cardId: string,
    actor: ActorContext,
  ): Promise<CardTransactionEntity[]> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertFinance(actor.userId, tenantId);
    await this.requireCard(tenantId, cardId);
    return this.txnRepository.find({
      where: { tenantId, corporateCardId: cardId },
      order: { transactedAt: 'DESC' },
    });
  }

  async syncCardTransactions(
    cardId: string,
    actor: ActorContext,
  ): Promise<number> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertFinance(actor.userId, tenantId);
    const card = await this.requireCard(tenantId, cardId);
    if (!card.externalCardId) {
      throw new BadRequestException('Card has no external id');
    }

    let remote;
    try {
      if (card.provider === CorporateCardProvider.ASPIRE) {
        remote = await this.aspireCardsClient.listTransactions(
          card.externalCardId,
        );
      } else {
        const profileId = this.configService.get<string>('WISE_PROFILE_ID');
        if (!profileId) {
          throw new WiseCardsNotConfiguredError();
        }
        remote = await this.wiseCardsClient.listTransactions(
          profileId,
          card.externalCardId,
        );
      }
    } catch (err) {
      if (
        err instanceof AspireCardsNotConfiguredError ||
        err instanceof WiseCardsNotConfiguredError
      ) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    let inserted = 0;
    for (const txn of remote) {
      if (!txn.providerTxnId) continue;
      const existing = await this.txnRepository.findOne({
        where: {
          tenantId,
          corporateCardId: card.id,
          providerTxnId: txn.providerTxnId,
        },
      });
      if (existing) continue;
      await this.txnRepository.save(
        this.txnRepository.create({
          tenantId,
          corporateCardId: card.id,
          providerTxnId: txn.providerTxnId,
          amount: txn.amount,
          currency: txn.currency,
          merchant: txn.merchant,
          transactedAt: txn.transactedAt,
          expenseClaimId: null,
          rawPayload: txn.raw,
        }),
      );
      inserted += 1;
    }
    return inserted;
  }

  async allocateToExpense(
    cardTransactionId: string,
    dto: AllocateCardTransactionDto,
    actor: ActorContext,
  ): Promise<{ expenseClaimId: string }> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertFinance(actor.userId, tenantId);

    const txn = await this.txnRepository.findOne({
      where: { id: cardTransactionId, tenantId },
    });
    if (!txn) {
      throw new NotFoundException('Card transaction not found');
    }
    if (txn.expenseClaimId) {
      throw new ConflictException('Card transaction already allocated');
    }

    const card = await this.requireCard(tenantId, txn.corporateCardId);
    if (!card.workerId) {
      throw new BadRequestException(
        'Card must be assigned to a worker before allocation',
      );
    }

    const expenseDate = (
      txn.transactedAt ?? new Date()
    )
      .toISOString()
      .slice(0, 10);

    const claim = await this.expenseRepository.save(
      this.expenseRepository.create({
        tenantId,
        legalEntityId: card.legalEntityId,
        workerId: card.workerId,
        travelRequestId: card.travelRequestId,
        category: dto.category as ExpenseCategory,
        amount: txn.amount,
        currencyCode: txn.currency,
        expenseDate,
        description:
          dto.note ??
          `Card spend${txn.merchant ? `: ${txn.merchant}` : ''}${
            dto.costCentre ? ` [${dto.costCentre}]` : ''
          }`,
        receiptBlobUrl: null,
        status: ExpenseClaimStatus.DRAFT,
        settlementMode: ExpenseSettlementMode.EXPORT_ONLY,
        payRunLineItemId: null,
        cardTransactionId: txn.id,
      }),
    );

    txn.expenseClaimId = claim.id;
    await this.txnRepository.save(txn);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'corporate_card.allocate_expense',
      entityType: 'card_transaction',
      entityId: txn.id,
      changes: {
        expenseClaimId: { old: null, new: claim.id },
        settlementMode: {
          old: null,
          new: ExpenseSettlementMode.EXPORT_ONLY,
        },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return { expenseClaimId: claim.id };
  }

  private async requireCard(
    tenantId: string,
    cardId: string,
  ): Promise<CorporateCardEntity> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId, tenantId },
    });
    if (!card) {
      throw new NotFoundException('Corporate card not found');
    }
    return card;
  }

  private async assertFinance(userId: string, tenantId: string): Promise<void> {
    const auth = await this.rbacService.getAuthContext(userId, tenantId);
    if (!isPayrollAdmin(auth)) {
      throw new ForbiddenException('Finance access required');
    }
  }
}
