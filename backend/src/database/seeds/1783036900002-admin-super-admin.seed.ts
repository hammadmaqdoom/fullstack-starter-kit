import { UserEntity } from '@/auth/entities/user.entity';
import { SYSTEM_ROLES } from '@/modules/compliance/constants/role.constants';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { UserRoleAssignmentEntity } from '@/modules/compliance/entities/user-role-assignment.entity';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

const ADMIN_EMAILS = ['admin@digitaro.co', 'admin@admin.com'] as const;

/**
 * Links the seeded platform admin to Polaris `super_admin` (scope: all).
 * Accepts both the current and legacy admin emails so re-seeds are idempotent.
 */
export class AdminSuperAdminSeed1783036900002 implements Seeder {
  track = true;

  public async run(
    dataSource: DataSource,
    _: SeederFactoryManager,
  ): Promise<void> {
    const userRepository = dataSource.getRepository(UserEntity);
    const assignmentRepository = dataSource.getRepository(
      UserRoleAssignmentEntity,
    );

    let admin = await userRepository.findOne({
      where: { email: ADMIN_EMAILS[0] },
    });

    if (!admin) {
      const legacy = await userRepository.findOne({
        where: { email: ADMIN_EMAILS[1] },
      });
      if (legacy) {
        legacy.email = ADMIN_EMAILS[0];
        admin = await userRepository.save(legacy);
      }
    }

    if (!admin) {
      console.warn(
        'Admin user not found (admin@digitaro.co). Run initial seed first.',
      );
      return;
    }

    const superAdminRole = SYSTEM_ROLES.find(
      (role) => role.code === PolarisRoleCode.SUPER_ADMIN,
    );
    if (!superAdminRole) {
      throw new Error('SYSTEM_ROLES is missing SUPER_ADMIN');
    }

    const existing = await assignmentRepository.findOne({
      where: {
        tenantId: DIGITARO_TENANT_ID,
        userId: admin.id,
        roleId: superAdminRole.id,
      },
    });

    if (existing) {
      return;
    }

    await assignmentRepository.save(
      assignmentRepository.create({
        tenantId: DIGITARO_TENANT_ID,
        userId: admin.id,
        roleId: superAdminRole.id,
        scopeType: ScopeType.ALL,
        scopeId: null,
        scopeCountryCode: null,
        effectiveFrom: null,
        effectiveTo: null,
        assignedBy: null,
      }),
    );
  }
}
