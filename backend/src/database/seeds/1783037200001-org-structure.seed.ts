import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import {
  DIVISION_SEED,
  LEGAL_ENTITY_SEED,
} from '@/modules/core-hr/constants/org.seed-data';
import { DivisionEntity } from '@/modules/core-hr/entities/division.entity';
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
    for (const entity of LEGAL_ENTITY_SEED) {
      const existing = await legalEntityRepository.findOne({
        where: { tenantId: DIGITARO_TENANT_ID, code: entity.code },
      });
      if (!existing) {
        await legalEntityRepository.save(
          legalEntityRepository.create({
            id: entity.id,
            tenantId: DIGITARO_TENANT_ID,
            code: entity.code,
            registeredName: entity.registeredName,
            tradingName: entity.tradingName,
            countryCode: entity.countryCode,
            functionalCurrency: entity.functionalCurrency,
            status: EntityStatus.ACTIVE,
            effectiveFrom: entity.effectiveFrom,
          }),
        );
      }
    }
  }
}
