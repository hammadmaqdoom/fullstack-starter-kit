import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { FundingAccountEntity } from './entities/funding-account.entity';
import { PayoutCorridorOverrideEntity } from './entities/payout-corridor-override.entity';
import { PayoutRailProfileEntity } from './entities/payout-rail-profile.entity';
import { ProviderCapabilityCatalogEntity } from './entities/provider-capability-catalog.entity';
import {
  FundingAccountProvider,
  PayoutRail,
  ProviderCatalogKind,
} from './enums/payout.enum';

export type ResolvePayoutRailInput = {
  tenantId: string;
  legalEntityId: string;
  payerCountryCode: string;
  recipientBankCountryCode: string;
  paymentType:
    | 'employee_payroll'
    | 'expense_reimbursement'
    | 'contractor_invoice';
  recipientAccountLegalType?: 'personal' | 'business';
  targetCurrency?: string;
};

export type ResolvePayoutRailResult = {
  resolvedRail: PayoutRail;
  allowedRails: PayoutRail[];
  reasonCodes: string[];
  suggestedFundingAccountId: string | null;
};

type RailCheck = { ok: boolean; reason?: string };

@Injectable()
export class PayoutRailResolverService {
  constructor(
    @InjectRepository(PayoutRailProfileEntity)
    private readonly profileRepository: Repository<PayoutRailProfileEntity>,
    @InjectRepository(PayoutCorridorOverrideEntity)
    private readonly corridorRepository: Repository<PayoutCorridorOverrideEntity>,
    @InjectRepository(ProviderCapabilityCatalogEntity)
    private readonly catalogRepository: Repository<ProviderCapabilityCatalogEntity>,
    @InjectRepository(FundingAccountEntity)
    private readonly fundingRepository: Repository<FundingAccountEntity>,
  ) {}

  async resolve(
    input: ResolvePayoutRailInput,
  ): Promise<ResolvePayoutRailResult> {
    const payer = input.payerCountryCode.toUpperCase();
    const recipient = input.recipientBankCountryCode.toUpperCase();
    const reasonCodes: string[] = [];

    const corridor = await this.corridorRepository.findOne({
      where: {
        tenantId: input.tenantId,
        payerCountryCode: payer,
        recipientBankCountryCode: recipient,
      },
    });

    let primary: PayoutRail;
    let secondary: PayoutRail | null;
    let fallback: PayoutRail;

    if (corridor) {
      primary = corridor.primaryRail;
      secondary = corridor.secondaryRail;
      fallback = corridor.fallbackRail;
      reasonCodes.push('CORRIDOR_OVERRIDE');
    } else {
      const profile = await this.profileRepository.findOne({
        where: {
          tenantId: input.tenantId,
          legalEntityId: input.legalEntityId,
        },
      });
      if (!profile) {
        primary = PayoutRail.MANUAL_BANK;
        secondary = null;
        fallback = PayoutRail.MANUAL_BANK;
        reasonCodes.push('PROFILE_MISSING_DEFAULT_MANUAL');
      } else {
        primary = profile.primaryRail;
        secondary = profile.secondaryRail;
        fallback = profile.fallbackRail;
      }
    }

    const candidates = [primary, secondary, fallback].filter(
      (r): r is PayoutRail => r != null,
    );
    const uniqueCandidates = [...new Set(candidates)];

    const allowedRails: PayoutRail[] = [];
    for (const rail of uniqueCandidates) {
      const check = await this.isRailAllowed(rail, input);
      if (check.ok) {
        allowedRails.push(rail);
      } else if (check.reason) {
        reasonCodes.push(check.reason);
      }
    }

    if (!allowedRails.includes(PayoutRail.MANUAL_BANK)) {
      allowedRails.push(PayoutRail.MANUAL_BANK);
    }

    const resolvedRail = allowedRails[0] ?? PayoutRail.MANUAL_BANK;
    const suggestedFundingAccountId = await this.suggestFundingAccount(
      input.tenantId,
      input.legalEntityId,
      resolvedRail,
    );

    return {
      resolvedRail,
      allowedRails,
      reasonCodes,
      suggestedFundingAccountId,
    };
  }

  private async isRailAllowed(
    rail: PayoutRail,
    input: ResolvePayoutRailInput,
  ): Promise<RailCheck> {
    if (rail === PayoutRail.MANUAL_BANK) {
      return { ok: true };
    }

    if (rail === PayoutRail.ASPIRE) {
      const incorporation = await this.catalogRepository.findOne({
        where: {
          tenantId: input.tenantId,
          kind: ProviderCatalogKind.ASPIRE_INCORPORATION,
          countryCode: input.payerCountryCode.toUpperCase(),
          isAllowed: true,
        },
      });
      if (!incorporation) {
        return { ok: false, reason: 'ASPIRE_INCORPORATION_UNSUPPORTED' };
      }

      const funding = await this.fundingRepository.findOne({
        where: {
          tenantId: input.tenantId,
          legalEntityId: input.legalEntityId,
          provider: FundingAccountProvider.ASPIRE,
          isActive: true,
          deletedAt: IsNull(),
        },
      });
      if (!funding) {
        return { ok: false, reason: 'ASPIRE_FUNDING_ACCOUNT_MISSING' };
      }

      const corridor = await this.catalogRepository.findOne({
        where: {
          tenantId: input.tenantId,
          kind: ProviderCatalogKind.ASPIRE_PAYOUT_CORRIDOR,
          countryCode: input.recipientBankCountryCode.toUpperCase(),
          isAllowed: true,
        },
      });
      if (!corridor) {
        return { ok: false, reason: 'ASPIRE_CORRIDOR_UNSUPPORTED' };
      }

      return { ok: true };
    }

    if (rail === PayoutRail.WISE) {
      const blockedPayer = await this.catalogRepository.findOne({
        where: {
          tenantId: input.tenantId,
          kind: ProviderCatalogKind.WISE_BLOCKED_COUNTRY,
          countryCode: input.payerCountryCode.toUpperCase(),
          isAllowed: false,
        },
      });
      const blockedRecipient = await this.catalogRepository.findOne({
        where: {
          tenantId: input.tenantId,
          kind: ProviderCatalogKind.WISE_BLOCKED_COUNTRY,
          countryCode: input.recipientBankCountryCode.toUpperCase(),
          isAllowed: false,
        },
      });
      if (blockedPayer || blockedRecipient) {
        return { ok: false, reason: 'WISE_COUNTRY_BLOCKED' };
      }

      const currency =
        input.targetCurrency?.toUpperCase() ??
        (input.recipientBankCountryCode.toUpperCase() === 'PK'
          ? 'PKR'
          : undefined);
      if (currency) {
        const rule = await this.catalogRepository.findOne({
          where: {
            tenantId: input.tenantId,
            kind: ProviderCatalogKind.WISE_CURRENCY_RULE,
            currencyCode: currency,
          },
        });
        if (
          rule?.payload?.personalOnly === true &&
          input.recipientAccountLegalType === 'business'
        ) {
          return { ok: false, reason: 'WISE_PKR_BUSINESS_UNSUPPORTED' };
        }
      }

      const funding = await this.fundingRepository.findOne({
        where: {
          tenantId: input.tenantId,
          legalEntityId: input.legalEntityId,
          provider: FundingAccountProvider.WISE,
          isActive: true,
          deletedAt: IsNull(),
        },
      });
      if (!funding) {
        return { ok: false, reason: 'WISE_FUNDING_ACCOUNT_MISSING' };
      }

      return { ok: true };
    }

    return { ok: false, reason: 'UNKNOWN_RAIL' };
  }

  private async suggestFundingAccount(
    tenantId: string,
    legalEntityId: string,
    rail: PayoutRail,
  ): Promise<string | null> {
    const provider =
      rail === PayoutRail.ASPIRE
        ? FundingAccountProvider.ASPIRE
        : rail === PayoutRail.WISE
          ? FundingAccountProvider.WISE
          : FundingAccountProvider.MANUAL_BANK;

    const account = await this.fundingRepository.findOne({
      where: {
        tenantId,
        legalEntityId,
        provider,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: { createdAt: 'ASC' },
    });
    return account?.id ?? null;
  }
}
