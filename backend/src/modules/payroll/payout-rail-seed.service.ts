import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildProviderCapabilitySeedRows,
  DEFAULT_CORRIDOR_OVERRIDES,
  defaultRailsForEntityCountry,
} from './constants/provider-capability.seed';
import { PayoutCorridorOverrideEntity } from './entities/payout-corridor-override.entity';
import { PayoutRailProfileEntity } from './entities/payout-rail-profile.entity';
import { ProviderCapabilityCatalogEntity } from './entities/provider-capability-catalog.entity';

@Injectable()
export class PayoutRailSeedService {
  constructor(
    @InjectRepository(ProviderCapabilityCatalogEntity)
    private readonly catalogRepository: Repository<ProviderCapabilityCatalogEntity>,
    @InjectRepository(PayoutRailProfileEntity)
    private readonly profileRepository: Repository<PayoutRailProfileEntity>,
    @InjectRepository(PayoutCorridorOverrideEntity)
    private readonly corridorRepository: Repository<PayoutCorridorOverrideEntity>,
    @InjectRepository(LegalEntityEntity)
    private readonly legalEntityRepository: Repository<LegalEntityEntity>,
  ) {}

  async ensureSeeded(tenantId: string = DIGITARO_TENANT_ID): Promise<void> {
    const seedRows = buildProviderCapabilitySeedRows();
    for (const row of seedRows) {
      const existing = await this.catalogRepository.findOne({
        where: {
          tenantId,
          kind: row.kind,
          countryCode: row.countryCode,
          currencyCode: row.currencyCode,
        },
      });
      if (existing) {
        continue;
      }
      await this.catalogRepository.save(
        this.catalogRepository.create({
          tenantId,
          kind: row.kind,
          countryCode: row.countryCode,
          currencyCode: row.currencyCode,
          payload: row.payload,
          isAllowed: row.isAllowed,
        }),
      );
    }

    const legalEntities = await this.legalEntityRepository.find({
      where: { tenantId },
    });
    for (const entity of legalEntities) {
      const existingProfile = await this.profileRepository.findOne({
        where: { tenantId, legalEntityId: entity.id },
      });
      if (existingProfile) {
        continue;
      }
      const rails = defaultRailsForEntityCountry(entity.countryCode);
      await this.profileRepository.save(
        this.profileRepository.create({
          tenantId,
          legalEntityId: entity.id,
          ...rails,
        }),
      );
    }

    for (const corridor of DEFAULT_CORRIDOR_OVERRIDES) {
      const existing = await this.corridorRepository.findOne({
        where: {
          tenantId,
          payerCountryCode: corridor.payerCountryCode,
          recipientBankCountryCode: corridor.recipientBankCountryCode,
        },
      });
      if (existing) {
        continue;
      }
      await this.corridorRepository.save(
        this.corridorRepository.create({
          tenantId,
          ...corridor,
        }),
      );
    }
  }
}
