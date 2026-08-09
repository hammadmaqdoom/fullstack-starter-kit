import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { LEGAL_ENTITY_SEED } from '@/modules/core-hr/constants/org.seed-data';
import { LegalEntityStatutoryIdEntity } from '@/modules/core-hr/entities/legal-entity-statutory-id.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

/** Backfills registered address, contact, and statutory IDs on Digitaro legal entities. */
export class LegalEntityProfilesSeed1783040500002 implements Seeder {
  track = true;

  public async run(
    dataSource: DataSource,
    _: SeederFactoryManager,
  ): Promise<void> {
    const legalEntityRepository = dataSource.getRepository(LegalEntityEntity);
    const statutoryRepository = dataSource.getRepository(
      LegalEntityStatutoryIdEntity,
    );

    for (const entity of LEGAL_ENTITY_SEED) {
      const legalEntity = await legalEntityRepository.findOne({
        where: { tenantId: DIGITARO_TENANT_ID, code: entity.code },
      });
      if (!legalEntity) {
        continue;
      }

      legalEntity.addressLine1 = entity.addressLine1;
      legalEntity.addressLine2 = entity.addressLine2 ?? null;
      legalEntity.city = entity.city;
      legalEntity.stateProvince = entity.stateProvince ?? null;
      legalEntity.postalCode = entity.postalCode ?? null;
      legalEntity.phone = entity.phone;
      legalEntity.email = entity.email;
      legalEntity.website = entity.website;
      legalEntity.footerText = entity.footerText;
      await legalEntityRepository.save(legalEntity);

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
        } else {
          existingId.fieldValue = statutory.fieldValue;
          await statutoryRepository.save(existingId);
        }
      }
    }
  }
}
