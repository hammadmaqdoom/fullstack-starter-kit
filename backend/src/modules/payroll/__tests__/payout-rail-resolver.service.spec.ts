import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FundingAccountEntity } from '../entities/funding-account.entity';
import { PayoutCorridorOverrideEntity } from '../entities/payout-corridor-override.entity';
import { PayoutRailProfileEntity } from '../entities/payout-rail-profile.entity';
import { ProviderCapabilityCatalogEntity } from '../entities/provider-capability-catalog.entity';
import {
  FundingAccountProvider,
  PayoutRail,
  ProviderCatalogKind,
} from '../enums/payout.enum';
import { PayoutRailResolverService } from '../payout-rail-resolver.service';

describe('PayoutRailResolverService', () => {
  let service: PayoutRailResolverService;
  let profileFindOne: jest.Mock;
  let corridorFindOne: jest.Mock;
  let catalogFindOne: jest.Mock;
  let fundingFindOne: jest.Mock;

  const legalEntityId = 'le-sg';

  beforeEach(async () => {
    profileFindOne = jest.fn();
    corridorFindOne = jest.fn().mockResolvedValue(null);
    catalogFindOne = jest.fn();
    fundingFindOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutRailResolverService,
        {
          provide: getRepositoryToken(PayoutRailProfileEntity),
          useValue: { findOne: profileFindOne },
        },
        {
          provide: getRepositoryToken(PayoutCorridorOverrideEntity),
          useValue: { findOne: corridorFindOne },
        },
        {
          provide: getRepositoryToken(ProviderCapabilityCatalogEntity),
          useValue: { findOne: catalogFindOne },
        },
        {
          provide: getRepositoryToken(FundingAccountEntity),
          useValue: { findOne: fundingFindOne },
        },
      ],
    }).compile();

    service = module.get(PayoutRailResolverService);
  });

  function mockAspireOk() {
    catalogFindOne.mockImplementation(async ({ where }) => {
      if (where.kind === ProviderCatalogKind.ASPIRE_INCORPORATION) {
        return { isAllowed: true };
      }
      if (where.kind === ProviderCatalogKind.ASPIRE_PAYOUT_CORRIDOR) {
        return { isAllowed: true };
      }
      if (where.kind === ProviderCatalogKind.WISE_BLOCKED_COUNTRY) {
        return null;
      }
      if (where.kind === ProviderCatalogKind.WISE_CURRENCY_RULE) {
        return null;
      }
      return null;
    });
    fundingFindOne.mockImplementation(async ({ where }) => {
      if (where.provider === FundingAccountProvider.ASPIRE) {
        return { id: 'fa-aspire' };
      }
      if (where.provider === FundingAccountProvider.WISE) {
        return { id: 'fa-wise' };
      }
      if (where.provider === FundingAccountProvider.MANUAL_BANK) {
        return { id: 'fa-manual' };
      }
      return null;
    });
  }

  it('resolves SG→SG to aspire when funding exists', async () => {
    mockAspireOk();
    profileFindOne.mockResolvedValue({
      primaryRail: PayoutRail.ASPIRE,
      secondaryRail: PayoutRail.WISE,
      fallbackRail: PayoutRail.MANUAL_BANK,
    });

    const result = await service.resolve({
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      payerCountryCode: 'SG',
      recipientBankCountryCode: 'SG',
      paymentType: 'employee_payroll',
    });

    expect(result.resolvedRail).toBe(PayoutRail.ASPIRE);
    expect(result.allowedRails[0]).toBe(PayoutRail.ASPIRE);
    expect(result.suggestedFundingAccountId).toBe('fa-aspire');
  });

  it('allows only manual_bank for PK entity profile', async () => {
    catalogFindOne.mockResolvedValue(null);
    fundingFindOne.mockImplementation(async ({ where }) =>
      where.provider === FundingAccountProvider.MANUAL_BANK
        ? { id: 'fa-pk' }
        : null,
    );
    profileFindOne.mockResolvedValue({
      primaryRail: PayoutRail.MANUAL_BANK,
      secondaryRail: null,
      fallbackRail: PayoutRail.MANUAL_BANK,
    });

    const result = await service.resolve({
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId: 'le-pk',
      payerCountryCode: 'PK',
      recipientBankCountryCode: 'PK',
      paymentType: 'employee_payroll',
    });

    expect(result.resolvedRail).toBe(PayoutRail.MANUAL_BANK);
    expect(result.allowedRails).toEqual([PayoutRail.MANUAL_BANK]);
  });

  it('prefers corridor override over entity profile', async () => {
    mockAspireOk();
    profileFindOne.mockResolvedValue({
      primaryRail: PayoutRail.WISE,
      secondaryRail: null,
      fallbackRail: PayoutRail.MANUAL_BANK,
    });
    corridorFindOne.mockResolvedValue({
      primaryRail: PayoutRail.ASPIRE,
      secondaryRail: PayoutRail.WISE,
      fallbackRail: PayoutRail.MANUAL_BANK,
    });

    const result = await service.resolve({
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      payerCountryCode: 'SG',
      recipientBankCountryCode: 'PK',
      paymentType: 'employee_payroll',
      recipientAccountLegalType: 'personal',
      targetCurrency: 'PKR',
    });

    expect(result.reasonCodes).toContain('CORRIDOR_OVERRIDE');
    expect(result.resolvedRail).toBe(PayoutRail.ASPIRE);
  });

  it('rejects Wise for PKR business recipients', async () => {
    catalogFindOne.mockImplementation(async ({ where }) => {
      if (where.kind === ProviderCatalogKind.ASPIRE_INCORPORATION) {
        return null;
      }
      if (where.kind === ProviderCatalogKind.WISE_CURRENCY_RULE) {
        return { payload: { personalOnly: true } };
      }
      if (where.kind === ProviderCatalogKind.WISE_BLOCKED_COUNTRY) {
        return null;
      }
      return null;
    });
    fundingFindOne.mockImplementation(async ({ where }) =>
      where.provider === FundingAccountProvider.WISE
        ? { id: 'fa-wise' }
        : where.provider === FundingAccountProvider.MANUAL_BANK
          ? { id: 'fa-manual' }
          : null,
    );
    profileFindOne.mockResolvedValue({
      primaryRail: PayoutRail.WISE,
      secondaryRail: null,
      fallbackRail: PayoutRail.MANUAL_BANK,
    });

    const result = await service.resolve({
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      payerCountryCode: 'SG',
      recipientBankCountryCode: 'PK',
      paymentType: 'contractor_invoice',
      recipientAccountLegalType: 'business',
      targetCurrency: 'PKR',
    });

    expect(result.reasonCodes).toContain('WISE_PKR_BUSINESS_UNSUPPORTED');
    expect(result.allowedRails).not.toContain(PayoutRail.WISE);
    expect(result.resolvedRail).toBe(PayoutRail.MANUAL_BANK);
  });

  it('falls through when Aspire funding missing', async () => {
    catalogFindOne.mockImplementation(async ({ where }) => {
      if (where.kind === ProviderCatalogKind.ASPIRE_INCORPORATION) {
        return { isAllowed: true };
      }
      if (where.kind === ProviderCatalogKind.ASPIRE_PAYOUT_CORRIDOR) {
        return { isAllowed: true };
      }
      if (where.kind === ProviderCatalogKind.WISE_BLOCKED_COUNTRY) {
        return null;
      }
      return null;
    });
    fundingFindOne.mockImplementation(async ({ where }) => {
      if (where.provider === FundingAccountProvider.ASPIRE) {
        return null;
      }
      if (where.provider === FundingAccountProvider.WISE) {
        return { id: 'fa-wise' };
      }
      return { id: 'fa-manual' };
    });
    profileFindOne.mockResolvedValue({
      primaryRail: PayoutRail.ASPIRE,
      secondaryRail: PayoutRail.WISE,
      fallbackRail: PayoutRail.MANUAL_BANK,
    });

    const result = await service.resolve({
      tenantId: DIGITARO_TENANT_ID,
      legalEntityId,
      payerCountryCode: 'SG',
      recipientBankCountryCode: 'SG',
      paymentType: 'employee_payroll',
    });

    expect(result.reasonCodes).toContain('ASPIRE_FUNDING_ACCOUNT_MISSING');
    expect(result.resolvedRail).toBe(PayoutRail.WISE);
  });
});
