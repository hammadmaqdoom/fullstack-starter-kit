import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PayoutCorridorOverrideEntity } from '../entities/payout-corridor-override.entity';
import { PayoutRailProfileEntity } from '../entities/payout-rail-profile.entity';
import { ProviderCapabilityCatalogEntity } from '../entities/provider-capability-catalog.entity';
import { ProviderCatalogKind } from '../enums/payout.enum';
import { PayoutRailSeedService } from '../payout-rail-seed.service';

describe('PayoutRailSeedService', () => {
  let service: PayoutRailSeedService;
  let catalogSave: jest.Mock;
  let catalogFindOne: jest.Mock;
  let profileFindOne: jest.Mock;
  let profileSave: jest.Mock;
  let corridorFindOne: jest.Mock;
  let corridorSave: jest.Mock;
  let legalEntityFind: jest.Mock;

  beforeEach(async () => {
    catalogSave = jest.fn(async (row) => row);
    catalogFindOne = jest.fn().mockResolvedValue(null);
    profileFindOne = jest.fn().mockResolvedValue(null);
    profileSave = jest.fn(async (row) => row);
    corridorFindOne = jest.fn().mockResolvedValue(null);
    corridorSave = jest.fn(async (row) => row);
    legalEntityFind = jest.fn().mockResolvedValue([
      {
        id: 'le-sg',
        countryCode: 'SG',
        tenantId: DIGITARO_TENANT_ID,
      },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutRailSeedService,
        {
          provide: getRepositoryToken(ProviderCapabilityCatalogEntity),
          useValue: {
            findOne: catalogFindOne,
            create: (row: unknown) => row,
            save: catalogSave,
          },
        },
        {
          provide: getRepositoryToken(PayoutRailProfileEntity),
          useValue: {
            findOne: profileFindOne,
            create: (row: unknown) => row,
            save: profileSave,
          },
        },
        {
          provide: getRepositoryToken(PayoutCorridorOverrideEntity),
          useValue: {
            findOne: corridorFindOne,
            create: (row: unknown) => row,
            save: corridorSave,
          },
        },
        {
          provide: getRepositoryToken(LegalEntityEntity),
          useValue: { find: legalEntityFind },
        },
      ],
    }).compile();

    service = module.get(PayoutRailSeedService);
  });

  it('seeds aspire SG incorporation and wise PKR personal-only rule', async () => {
    await service.ensureSeeded(DIGITARO_TENANT_ID);

    expect(catalogSave).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: ProviderCatalogKind.ASPIRE_INCORPORATION,
        countryCode: 'SG',
        isAllowed: true,
      }),
    );
    expect(catalogSave).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: ProviderCatalogKind.WISE_CURRENCY_RULE,
        currencyCode: 'PKR',
        payload: expect.objectContaining({ personalOnly: true }),
      }),
    );
    expect(profileSave).toHaveBeenCalledWith(
      expect.objectContaining({
        legalEntityId: 'le-sg',
        primaryRail: 'aspire',
      }),
    );
  });
});
