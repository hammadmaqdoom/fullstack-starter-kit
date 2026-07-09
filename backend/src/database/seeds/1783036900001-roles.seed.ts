import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { SYSTEM_ROLES } from '@/modules/compliance/constants/role.constants';
import { RoleEntity } from '@/modules/compliance/entities/role.entity';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export class RolesSeed1783036900001 implements Seeder {
  track = true;

  public async run(
    dataSource: DataSource,
    _: SeederFactoryManager,
  ): Promise<void> {
    const roleRepository = dataSource.getRepository(RoleEntity);

    for (const role of SYSTEM_ROLES) {
      const existing = await roleRepository.findOne({
        where: { tenantId: DIGITARO_TENANT_ID, code: role.code },
      });

      if (existing) {
        continue;
      }

      await roleRepository.save(
        roleRepository.create({
          id: role.id,
          tenantId: DIGITARO_TENANT_ID,
          code: role.code,
          name: role.name,
          isSystem: true,
        }),
      );
    }
  }
}
