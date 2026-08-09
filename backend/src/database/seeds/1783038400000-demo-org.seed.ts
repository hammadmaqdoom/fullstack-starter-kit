import { Role } from '@/api/user/user.enum';
import { AccountEntity } from '@/auth/entities/account.entity';
import { UserEntity } from '@/auth/entities/user.entity';
import {
  DEMO_PASSWORD,
  DEMO_PERSONAS,
} from '@/modules/compliance/constants/demo-persona.constants';
import { SYSTEM_ROLES } from '@/modules/compliance/constants/role.constants';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { RoleEntity } from '@/modules/compliance/entities/role.entity';
import { UserRoleAssignmentEntity } from '@/modules/compliance/entities/user-role-assignment.entity';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { EMPLOYMENT_TYPE_SEED } from '@/modules/country-config/constants/country-config.seed-data';
import { DEFAULT_LEAVE_TYPES } from '@/modules/country-config/constants/setup-wizard.seed-data';
import { LeaveTypeEntity } from '@/modules/country-config/entities/leave-type.entity';
import { ManagerRelationshipEntity } from '@/modules/core-hr/entities/manager-relationship.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { RelationshipType } from '@/modules/core-hr/enums/org.enum';
import {
  EntraStatus,
  WorkMode,
  WorkerStatus,
} from '@/modules/core-hr/enums/worker.enum';
import { PolicyPopulationRuleEntity } from '@/modules/documents/entities/policy-population-rule.entity';
import { PolicyVersionEntity } from '@/modules/documents/entities/policy-version.entity';
import { PolicyEntity } from '@/modules/documents/entities/policy.entity';
import {
  PolicyCategory,
  PolicyVersionStatus,
} from '@/modules/documents/enums/policy.enum';
import { LeaveBalanceEntity } from '@/modules/time-leave/entities/leave-balance.entity';
import { LeaveRequestEntity } from '@/modules/time-leave/entities/leave-request.entity';
import { LeaveRequestStatus } from '@/modules/time-leave/enums/leave.enum';
import { hashPassword } from 'better-auth/crypto';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

const DEMO_POLICY_ID = 'a3000000-0000-4000-8000-000000000001';
const DEMO_POLICY_VERSION_ID = 'a3000000-0000-4000-8000-000000000002';
const DEMO_LEAVE_REQUEST_ID = 'a3000000-0000-4000-8000-000000000003';
const LABS_DIVISION_ID = 'd0000000-0000-4000-8000-000000000001';

function demoBirthdayIso(now = new Date()): string {
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `1995-${mm}-${dd}`;
}

/**
 * LOCAL/DEV demo org for role testing.
 * Do not run against production Digitaro data.
 */
export class DemoOrgSeed1783038400000 implements Seeder {
  track = true;

  public async run(
    dataSource: DataSource,
    _: SeederFactoryManager,
  ): Promise<void> {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const userRepo = dataSource.getRepository(UserEntity);
    const accountRepo = dataSource.getRepository(AccountEntity);
    const roleRepo = dataSource.getRepository(RoleEntity);
    const assignmentRepo = dataSource.getRepository(UserRoleAssignmentEntity);
    const workerRepo = dataSource.getRepository(WorkerEntity);
    const mgrRelRepo = dataSource.getRepository(ManagerRelationshipEntity);
    const leaveTypeRepo = dataSource.getRepository(LeaveTypeEntity);
    const leaveBalanceRepo = dataSource.getRepository(LeaveBalanceEntity);
    const leaveRequestRepo = dataSource.getRepository(LeaveRequestEntity);
    const policyRepo = dataSource.getRepository(PolicyEntity);
    const policyVersionRepo = dataSource.getRepository(PolicyVersionEntity);
    const populationRuleRepo = dataSource.getRepository(
      PolicyPopulationRuleEntity,
    );

    for (const role of SYSTEM_ROLES) {
      const existingRole = await roleRepo.findOne({
        where: { tenantId: DIGITARO_TENANT_ID, code: role.code },
      });
      if (!existingRole) {
        await roleRepo.save(
          roleRepo.create({
            id: role.id,
            tenantId: DIGITARO_TENANT_ID,
            code: role.code,
            name: role.name,
            isSystem: true,
          }),
        );
      }
    }

    const byKey = new Map(DEMO_PERSONAS.map((p) => [p.key, p]));

    for (const persona of DEMO_PERSONAS) {
      let user = await userRepo.findOne({ where: { id: persona.userId } });
      if (!user) {
        user = await userRepo.findOne({ where: { email: persona.email } });
      }
      if (!user) {
        user = await userRepo.save(
          userRepo.create({
            id: persona.userId,
            email: persona.email,
            username: persona.username,
            displayUsername: persona.username,
            firstName: persona.firstName,
            lastName: persona.lastName,
            isEmailVerified: true,
            role: Role.User,
          }),
        );
      } else {
        user.isEmailVerified = true;
        user.firstName = persona.firstName;
        user.lastName = persona.lastName;
        await userRepo.save(user);
      }

      let account = await accountRepo.findOne({
        where: { userId: user.id, providerId: 'credential' },
      });
      if (!account) {
        await accountRepo.save(
          accountRepo.create({
            accountId: user.id,
            userId: user.id,
            providerId: 'credential',
            password: passwordHash,
          }),
        );
      } else if (!account.password) {
        account.password = passwordHash;
        await accountRepo.save(account);
      }

      const roleEntity = await roleRepo.findOne({
        where: { tenantId: DIGITARO_TENANT_ID, code: persona.roleCode },
      });
      if (!roleEntity) {
        throw new Error(`Missing role row for ${persona.roleCode}`);
      }

      const existingAssignment = await assignmentRepo.findOne({
        where: {
          tenantId: DIGITARO_TENANT_ID,
          userId: user.id,
          roleId: roleEntity.id,
        },
      });
      if (!existingAssignment) {
        await assignmentRepo.save(
          assignmentRepo.create({
            tenantId: DIGITARO_TENANT_ID,
            userId: user.id,
            roleId: roleEntity.id,
            scopeType: persona.scopeType,
            scopeId: persona.scopeId,
            scopeCountryCode:
              persona.scopeType === ScopeType.COUNTRY
                ? persona.countryCode
                : null,
            effectiveFrom: null,
            effectiveTo: null,
            assignedBy: null,
          }),
        );
      }

      const employmentType = EMPLOYMENT_TYPE_SEED.find(
        (t) => t.code === persona.employmentTypeCode,
      );
      if (!employmentType) {
        throw new Error(
          `Missing employment type ${persona.employmentTypeCode}`,
        );
      }

      const legalEntityId =
        persona.countryCode === 'PK'
          ? 'e0000000-0000-4000-8000-000000000001'
          : persona.countryCode === 'AE'
            ? 'e0000000-0000-4000-8000-000000000002'
            : 'e0000000-0000-4000-8000-000000000003';

      const managerWorkerId = persona.reportsToKey
        ? (byKey.get(persona.reportsToKey)?.workerId ?? null)
        : null;

      let worker = await workerRepo.findOne({
        where: { id: persona.workerId },
      });
      if (!worker) {
        worker = await workerRepo.findOne({
          where: {
            tenantId: DIGITARO_TENANT_ID,
            employeeNumber: persona.employeeNumber,
          },
        });
      }

      if (!worker) {
        worker = await workerRepo.save(
          workerRepo.create({
            id: persona.workerId,
            tenantId: DIGITARO_TENANT_ID,
            legalEntityId,
            userId: user.id,
            employmentTypeId: employmentType.id,
            divisionId: LABS_DIVISION_ID,
            departmentId: null,
            managerId: managerWorkerId,
            countryCode: persona.countryCode,
            bankCountryCode: persona.countryCode,
            personalEmail: null,
            workMode: WorkMode.IN_OFFICE,
            status: WorkerStatus.ACTIVE,
            employeeNumber: persona.employeeNumber,
            firstName: persona.firstName,
            lastName: persona.lastName,
            email: persona.email,
            phone: null,
            entraStatus:
              persona.employmentTypeCode === 'CONTRACTOR'
                ? EntraStatus.NOT_REQUIRED
                : EntraStatus.PENDING,
            entraObjectId: null,
            probationEndDate: null,
            startDate: '2024-01-01',
            dateOfBirth: persona.key === 'employee' ? demoBirthdayIso() : null,
            endDate: null,
            fteFraction: persona.employmentTypeCode === 'CONTRACTOR' ? '0.5' : '1',
            timezone: null,
            statutoryFields: {},
            compensationBand: null,
          }),
        );
      } else {
        worker.userId = user.id;
        worker.managerId = managerWorkerId;
        worker.status = WorkerStatus.ACTIVE;
        if (persona.key === 'employee') {
          worker.dateOfBirth = demoBirthdayIso();
        }
        await workerRepo.save(worker);
      }

      if (managerWorkerId) {
        const existingRel = await mgrRelRepo.findOne({
          where: {
            tenantId: DIGITARO_TENANT_ID,
            workerId: worker.id,
            managerId: managerWorkerId,
          },
        });
        if (!existingRel) {
          await mgrRelRepo.save(
            mgrRelRepo.create({
              tenantId: DIGITARO_TENANT_ID,
              workerId: worker.id,
              managerId: managerWorkerId,
              relationshipType: RelationshipType.DIRECT,
              effectiveFrom: '2024-01-01',
              effectiveTo: null,
            }),
          );
        }
      }
    }

    const employee = byKey.get('employee');
    const manager = byKey.get('manager');
    if (employee && manager) {
      let annual = await leaveTypeRepo.findOne({
        where: {
          tenantId: DIGITARO_TENANT_ID,
          code: 'ANNUAL',
          countryCode: 'PK',
        },
      });
      if (!annual) {
        const template = DEFAULT_LEAVE_TYPES.find(
          (lt) => lt.countryCode === 'PK' && lt.code === 'ANNUAL',
        );
        if (template) {
          annual = await leaveTypeRepo.save(
            leaveTypeRepo.create({
              tenantId: DIGITARO_TENANT_ID,
              ...template,
            }),
          );
        }
      }

      if (!annual) {
        console.warn(
          'Demo seed: PK ANNUAL leave type missing; skipped leave samples.',
        );
      } else {
        const year = new Date().getUTCFullYear();
        const existingBalance = await leaveBalanceRepo.findOne({
          where: {
            tenantId: DIGITARO_TENANT_ID,
            workerId: employee.workerId,
            leaveTypeId: annual.id,
            year,
          },
        });
        if (!existingBalance) {
          await leaveBalanceRepo.save(
            leaveBalanceRepo.create({
              tenantId: DIGITARO_TENANT_ID,
              workerId: employee.workerId,
              leaveTypeId: annual.id,
              year,
              entitled: '20',
              used: '0',
              pending: '1',
            }),
          );
        }

        const existingRequest = await leaveRequestRepo.findOne({
          where: { id: DEMO_LEAVE_REQUEST_ID },
        });
        if (!existingRequest) {
          await leaveRequestRepo.save(
            leaveRequestRepo.create({
              id: DEMO_LEAVE_REQUEST_ID,
              tenantId: DIGITARO_TENANT_ID,
              workerId: employee.workerId,
              leaveTypeId: annual.id,
              startDate: `${year}-09-01`,
              endDate: `${year}-09-01`,
              days: '1',
              reason: 'Demo pending leave for manager approval',
              status: LeaveRequestStatus.SUBMITTED,
              approverId: manager.workerId,
              managerId: manager.workerId,
            }),
          );
        }
      }
    }

    let policy = await policyRepo.findOne({
      where: { tenantId: DIGITARO_TENANT_ID, code: 'DEMO_CODE_OF_CONDUCT' },
    });
    if (!policy) {
      policy = await policyRepo.save(
        policyRepo.create({
          id: DEMO_POLICY_ID,
          tenantId: DIGITARO_TENANT_ID,
          code: 'DEMO_CODE_OF_CONDUCT',
          title: 'Demo Code of Conduct',
          category: PolicyCategory.CONDUCT,
          isActive: true,
        }),
      );
    }

    const demoPolicyHtml = [
      '<h2>Demo Code of Conduct</h2>',
      '<p>This sample policy is for local role testing in Polaris. Read it before acknowledging.</p>',
      '<h2>Respect</h2>',
      '<p>Treat colleagues, clients, and partners with dignity. Harassment, discrimination, and retaliation are not tolerated.</p>',
      '<h2>Integrity</h2>',
      '<p>Be honest in communications and records. Do not misuse company systems, data, or credentials.</p>',
      '<h2>Safety &amp; compliance</h2>',
      '<p>Follow applicable laws and Digitaro security practices. Report concerns to People Ops or your manager promptly.</p>',
      '<p>Acknowledging confirms you have read and understand this version.</p>',
    ].join('');

    let version = await policyVersionRepo.findOne({
      where: { id: DEMO_POLICY_VERSION_ID },
    });
    if (!version) {
      version = await policyVersionRepo.save(
        policyVersionRepo.create({
          id: DEMO_POLICY_VERSION_ID,
          tenantId: DIGITARO_TENANT_ID,
          policyId: policy.id,
          version: 1,
          contentHtml: demoPolicyHtml,
          blobUrl: null,
          effectiveFrom: '2024-01-01',
          status: PolicyVersionStatus.PUBLISHED,
          publishedAt: new Date(),
          publishedBy: null,
        }),
      );
    } else if (version.contentHtml !== demoPolicyHtml) {
      version.contentHtml = demoPolicyHtml;
      version = await policyVersionRepo.save(version);
    }

    const existingRule = await populationRuleRepo.findOne({
      where: {
        tenantId: DIGITARO_TENANT_ID,
        policyId: policy.id,
        countryCode: 'PK',
      },
    });
    if (!existingRule) {
      await populationRuleRepo.save(
        populationRuleRepo.create({
          tenantId: DIGITARO_TENANT_ID,
          policyId: policy.id,
          countryCode: 'PK',
          divisionId: null,
          employmentTypeId: null,
        }),
      );
    }

    console.log(
      `\nDemo org ready. Password for all *.demo@digitaro.local: ${DEMO_PASSWORD}\n` +
        'Do not run this seed against production.\n',
    );
  }
}
