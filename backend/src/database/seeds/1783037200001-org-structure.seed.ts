import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import {
  DIVISION_SEED,
  LEGAL_ENTITY_SEED,
} from '@/modules/core-hr/constants/org.seed-data';
import { DivisionEntity } from '@/modules/core-hr/entities/division.entity';
import { LegalEntityStatutoryIdEntity } from '@/modules/core-hr/entities/legal-entity-statutory-id.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { EntityStatus } from '@/modules/core-hr/enums/org.enum';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export class OrgStructureSeed1783037200001 implements Seeder {
  track = true;

  public async run(
    dataSource: DataSource,
    _: SeederFactoryManager,
  ): Promise<void> {
    const divisionRepository = dataSource.getRepository(DivisionEntity);
    for (const division of DIVISION_SEED) {
      const existing = await divisionRepository.findOne({
        where: { tenantId: DIGITARO_TENANT_ID, id: division.id },
      });
      if (!existing) {
        await divisionRepository.save(
          divisionRepository.create({
            id: division.id,
            tenantId: DIGITARO_TENANT_ID,
            name: division.name,
          }),
        );
      }
    }

    const legalEntityRepository = dataSource.getRepository(LegalEntityEntity);
    const statutoryRepository = dataSource.getRepository(
      LegalEntityStatutoryIdEntity,
    );

    for (const entity of LEGAL_ENTITY_SEED) {
      let legalEntity = await legalEntityRepository.findOne({
        where: { tenantId: DIGITARO_TENANT_ID, code: entity.code },
      });

      const profile = {
        registeredName: entity.registeredName,
        tradingName: entity.tradingName,
        countryCode: entity.countryCode,
        functionalCurrency: entity.functionalCurrency,
        status: EntityStatus.ACTIVE,
        effectiveFrom: entity.effectiveFrom,
        addressLine1: entity.addressLine1,
        addressLine2: entity.addressLine2 ?? null,
        city: entity.city,
        stateProvince: entity.stateProvince ?? null,
        postalCode: entity.postalCode ?? null,
        phone: entity.phone,
        email: entity.email,
        website: entity.website,
        footerText: entity.footerText,
      };

      if (!legalEntity) {
        legalEntity = await legalEntityRepository.save(
          legalEntityRepository.create({
            id: entity.id,
            tenantId: DIGITARO_TENANT_ID,
            code: entity.code,
            ...profile,
          }),
        );
      } else {
        Object.assign(legalEntity, profile);
        legalEntity = await legalEntityRepository.save(legalEntity);
      }

      for (const statutory of entity.statutoryIds) {
        const existingId = await statutoryRepository.findOne({
          where: {
            tenantId: DIGITARO_TENANT_ID,
            legalEntityId: legalEntity.id,
            fieldKey: statutory.fieldKey,
          },
        });
        if (!existingId) {
          await statutoryRepository.save(
            statutoryRepository.create({
              tenantId: DIGITARO_TENANT_ID,
              legalEntityId: legalEntity.id,
              fieldKey: statutory.fieldKey,
              fieldValue: statutory.fieldValue,
              expiryDate: null,
            }),
          );
        } else if (existingId.fieldValue !== statutory.fieldValue) {
          existingId.fieldValue = statutory.fieldValue;
          await statutoryRepository.save(existingId);
        }
      }
    }
  }
}
