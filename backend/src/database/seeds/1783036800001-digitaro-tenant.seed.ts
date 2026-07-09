import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export class DigitaroTenantSeed1783036800001 implements Seeder {
  track = true;

  public async run(
    dataSource: DataSource,
    _: SeederFactoryManager,
  ): Promise<void> {
    const tenantRepository = dataSource.getRepository(TenantEntity);
    const existing = await tenantRepository.findOne({
      where: { slug: 'digitaro' },
    });

    if (existing) {
      return;
    }

    await tenantRepository.save(
      tenantRepository.create({
        id: DIGITARO_TENANT_ID,
        name: 'Digitaro',
        slug: 'digitaro',
        baseReportingCurrency: 'USD',
      }),
    );
  }
}
