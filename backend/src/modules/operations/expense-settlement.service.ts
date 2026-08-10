import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpenseClaimEntity } from './entities/expense-claim.entity';
import {
  ExpenseClaimStatus,
  ExpenseSettlementMode,
} from './enums/expense.enum';

@Injectable()
export class ExpenseSettlementService {
  constructor(
    @InjectRepository(ExpenseClaimEntity)
    private readonly claimRepository: Repository<ExpenseClaimEntity>,
  ) {}

  async setSettlementMode(
    tenantId: string,
    claimId: string,
    mode: ExpenseSettlementMode,
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.requireClaim(tenantId, claimId);
    if (
      claim.cardTransactionId &&
      mode === ExpenseSettlementMode.STANDALONE_PAYOUT
    ) {
      throw new ConflictException({
        code: 'CARD_FUNDED',
        message:
          'Card-funded claims cannot use standalone_payout — company already paid',
      });
    }
    claim.settlementMode = mode;
    if (mode !== ExpenseSettlementMode.BUNDLE_WITH_PAYROLL) {
      claim.payRunLineItemId = null;
    }
    return this.claimRepository.save(claim);
  }

  async attachToPayRunLine(
    tenantId: string,
    claimId: string,
    payRunLineItemId: string,
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.requireClaim(tenantId, claimId);
    if (claim.settlementMode !== ExpenseSettlementMode.BUNDLE_WITH_PAYROLL) {
      throw new ConflictException(
        'Claim must use bundle_with_payroll settlement mode',
      );
    }
    if (claim.status !== ExpenseClaimStatus.APPROVED) {
      throw new ConflictException('Only approved claims can attach to pay run');
    }
    claim.payRunLineItemId = payRunLineItemId;
    return this.claimRepository.save(claim);
  }

  async assertEligibleForStandalonePayout(
    tenantId: string,
    claimId: string,
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.requireClaim(tenantId, claimId);
    if (claim.settlementMode !== ExpenseSettlementMode.STANDALONE_PAYOUT) {
      throw new ConflictException(
        'Claim is not marked for standalone_payout',
      );
    }
    if (claim.payRunLineItemId) {
      throw new ConflictException(
        'Claim already bundled into a pay run — cannot standalone payout',
      );
    }
    if (claim.status === ExpenseClaimStatus.PAID) {
      throw new ConflictException('Claim already paid');
    }
    if (claim.status !== ExpenseClaimStatus.APPROVED) {
      throw new ConflictException('Claim must be approved');
    }
    return claim;
  }

  async markPaidFromPayout(
    tenantId: string,
    claimId: string,
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.requireClaim(tenantId, claimId);
    claim.status = ExpenseClaimStatus.PAID;
    return this.claimRepository.save(claim);
  }

  private async requireClaim(
    tenantId: string,
    claimId: string,
  ): Promise<ExpenseClaimEntity> {
    const claim = await this.claimRepository.findOne({
      where: { id: claimId, tenantId },
    });
    if (!claim) {
      throw new NotFoundException('Expense claim not found');
    }
    return claim;
  }
}
