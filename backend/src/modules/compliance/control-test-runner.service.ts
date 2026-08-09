import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ControlTestAdapterRegistry } from './adapters/control-test-adapter.registry';
import { AuditLogService } from './audit-log.service';
import { SYSTEM_ACTOR_ID } from './constants/tenant.constants';
import { ComplianceControlEntity } from './entities/compliance-control.entity';
import { ControlTestRunEntity } from './entities/control-test-run.entity';
import { TenantEntity } from './entities/tenant.entity';
import {
  ControlTestResult,
  ControlTestTrigger,
} from './enums/control.enum';
import {
  ComplianceAlertSeverity,
  ComplianceAlertStatus,
  ComplianceAlertType,
} from '@/modules/automation/enums/automation.enum';
import { ComplianceAlertEntity } from '@/modules/automation/entities/compliance-alert.entity';

@Injectable()
export class ControlTestRunnerService {
  constructor(
    @InjectRepository(ComplianceControlEntity)
    private readonly controlRepository: Repository<ComplianceControlEntity>,
    @InjectRepository(ControlTestRunEntity)
    private readonly runRepository: Repository<ControlTestRunEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(ComplianceAlertEntity)
    private readonly alertRepository: Repository<ComplianceAlertEntity>,
    private readonly adapterRegistry: ControlTestAdapterRegistry,
    private readonly auditLogService: AuditLogService,
  ) {}

  async runOne(
    code: string,
    tenantId: string,
    trigger: ControlTestTrigger,
    actorUserId?: string | null,
  ): Promise<ControlTestRunEntity> {
    const control = await this.controlRepository.findOne({
      where: { tenantId, code },
    });
    if (!control) {
      throw new NotFoundException(`Control ${code} not found for tenant`);
    }

    if (!control.testAdapterKey) {
      const manual = this.runRepository.create({
        tenantId,
        controlId: control.id,
        ranAt: new Date(),
        triggeredBy: trigger,
        actorUserId: actorUserId ?? null,
        result: ControlTestResult.MANUAL,
        summary: { reason: 'No automated adapter' },
        evidenceRefs: [],
      });
      return this.runRepository.save(manual);
    }

    const adapter = this.adapterRegistry.get(control.testAdapterKey);
    if (!adapter) {
      const missing = this.runRepository.create({
        tenantId,
        controlId: control.id,
        ranAt: new Date(),
        triggeredBy: trigger,
        actorUserId: actorUserId ?? null,
        result: ControlTestResult.ERROR,
        summary: { reason: `Unknown adapter ${control.testAdapterKey}` },
        evidenceRefs: [],
      });
      return this.runRepository.save(missing);
    }

    let result;
    try {
      result = await adapter.run(tenantId);
    } catch (error) {
      result = {
        result: 'error' as const,
        summary: { message: (error as Error).message },
        evidenceRefs: [],
      };
    }

    const run = await this.runRepository.save(
      this.runRepository.create({
        tenantId,
        controlId: control.id,
        ranAt: new Date(),
        triggeredBy: trigger,
        actorUserId: actorUserId ?? null,
        result: result.result as ControlTestResult,
        summary: result.summary,
        evidenceRefs: result.evidenceRefs,
      }),
    );

    if (result.result === 'fail') {
      await this.openFailAlert(tenantId, control.code);
    }

    if (trigger === ControlTestTrigger.MANUAL || trigger === ControlTestTrigger.API) {
      await this.auditLogService.append({
        tenantId,
        actorId: actorUserId ?? SYSTEM_ACTOR_ID,
        action: 'compliance.control.run',
        entityType: 'compliance_control',
        entityId: control.id,
        changes: {
          code: { old: null, new: control.code },
          result: { old: null, new: result.result },
          runId: { old: null, new: run.id },
        },
      });
    }

    return run;
  }

  async runAll(
    tenantId: string,
    trigger: ControlTestTrigger,
    actorUserId?: string | null,
  ): Promise<ControlTestRunEntity[]> {
    const controls = await this.controlRepository.find({
      where: { tenantId, inScope: true },
      order: { sortOrder: 'ASC' },
    });

    const runs: ControlTestRunEntity[] = [];
    for (const control of controls) {
      if (trigger === ControlTestTrigger.SCHEDULE && !control.testAdapterKey) {
        continue;
      }
      runs.push(
        await this.runOne(control.code, tenantId, trigger, actorUserId),
      );
    }
    return runs;
  }

  /** Daily schedule: every tenant. */
  async runScheduledForAllTenants(): Promise<number> {
    const tenants = await this.tenantRepository.find({ select: ['id'] });
    let total = 0;
    for (const tenant of tenants) {
      const runs = await this.runAll(
        tenant.id,
        ControlTestTrigger.SCHEDULE,
        null,
      );
      total += runs.length;
    }
    return total;
  }

  private async openFailAlert(tenantId: string, code: string): Promise<void> {
    const dueDate = new Date().toISOString().slice(0, 10);
    const existing = await this.alertRepository.findOne({
      where: {
        tenantId,
        alertType: ComplianceAlertType.CONTROL_TEST_FAIL,
        dueDate,
        status: ComplianceAlertStatus.OPEN,
        title: `Control failed: ${code}`,
      },
    });
    if (existing) {
      return;
    }
    await this.alertRepository.save(
      this.alertRepository.create({
        tenantId,
        workerId: null,
        alertType: ComplianceAlertType.CONTROL_TEST_FAIL,
        title: `Control failed: ${code}`,
        dueDate,
        severity: ComplianceAlertSeverity.WARNING,
        status: ComplianceAlertStatus.OPEN,
        sourceRuleId: null,
      }),
    );
  }
}
