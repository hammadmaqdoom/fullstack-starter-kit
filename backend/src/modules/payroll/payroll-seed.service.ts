import { AuditLogService } from '@/modules/compliance/audit-log.service';
import {
  DIGITARO_TENANT_ID,
  SYSTEM_ACTOR_ID,
} from '@/modules/compliance/constants/tenant.constants';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PayComponentEntity } from './entities/pay-component.entity';
import { StatutoryRateScheduleEntity } from './entities/statutory-rate-schedule.entity';
import { PayComponentType, StatutoryScheduleStatus } from './enums/payroll.enum';

const BASIC_SALARY_CODE = 'BASIC_SALARY';

export type PayrollSeedResult = {
  payComponentId: string;
  statutoryScheduleIds: string[];
};

/**
 * Seeds the minimal payroll starter pack for a tenant: a BASIC_SALARY earning
 * pay component, and one draft statutory rate schedule per existing legal
 * entity (so admins have somewhere to add rate entries rather than starting
 * from a blank list). Idempotent — safe to call multiple times.
 *
 * Kept as a standalone service (rather than folded into SetupWizardService)
 * to avoid a circular module dependency: PayrollModule already imports
 * CountryConfigModule for BenefitTypeEntity.
 */
@Injectable()
export class PayrollSeedService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(LegalEntityEntity)
    private readonly legalEntityRepository: Repository<LegalEntityEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async seedPayrollPacks(
    tenantId: string = DIGITARO_TENANT_ID,
    actorId: string = SYSTEM_ACTOR_ID,
  ): Promise<PayrollSeedResult> {
    const legalEntities = await this.legalEntityRepository.find({
      where: { tenantId },
    });

    const result = await this.dataSource.transaction(async (manager) => {
      let basicSalary = await manager.findOne(PayComponentEntity, {
        where: { tenantId, code: BASIC_SALARY_CODE },
      });

      if (!basicSalary) {
        basicSalary = await manager.save(
          manager.create(PayComponentEntity, {
            tenantId,
            code: BASIC_SALARY_CODE,
            name: 'Basic salary',
            componentType: PayComponentType.EARNING,
            isStatutory: false,
          }),
        );
      }

      const statutoryScheduleIds: string[] = [];
      const today = new Date().toISOString().slice(0, 10);

      for (const legalEntity of legalEntities) {
        let schedule = await manager.findOne(StatutoryRateScheduleEntity, {
          where: { tenantId, legalEntityId: legalEntity.id },
        });

        if (!schedule) {
          schedule = await manager.save(
            manager.create(StatutoryRateScheduleEntity, {
              tenantId,
              legalEntityId: legalEntity.id,
              countryCode: legalEntity.countryCode,
              name: `${legalEntity.code} statutory rates (draft)`,
              effectiveFrom: today,
              status: StatutoryScheduleStatus.DRAFT,
            }),
          );
        }

        statutoryScheduleIds.push(schedule.id);
      }

      return { payComponentId: basicSalary.id, statutoryScheduleIds };
    });

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'payroll.starter_pack.seeded',
      entityType: 'pay_component',
      entityId: result.payComponentId,
      changes: {
        payComponentCode: { old: null, new: BASIC_SALARY_CODE },
        statutoryScheduleIds: { old: null, new: result.statutoryScheduleIds },
      },
    });

    return result;
  }
}
