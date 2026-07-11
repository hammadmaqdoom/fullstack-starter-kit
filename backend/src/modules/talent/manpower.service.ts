import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateManpowerPlanDto,
  CreateManpowerPositionDto,
  UpdateManpowerPlanDto,
  UpdateManpowerPositionDto,
} from './dto/manpower.dto';
import { ManpowerPlanEntity } from './entities/manpower-plan.entity';
import { ManpowerPositionEntity } from './entities/manpower-position.entity';

type ActorContext = {
  userId: string;
  tenantId: string;
  correlationId?: string;
  ipAddress?: string;
};

/**
 * §6.19 manpower planning — strategic staffing visibility per
 * division/country/year, positions link to recruitment requisitions.
 */
@Injectable()
export class ManpowerService {
  constructor(
    @InjectRepository(ManpowerPlanEntity)
    private readonly planRepository: Repository<ManpowerPlanEntity>,
    @InjectRepository(ManpowerPositionEntity)
    private readonly positionRepository: Repository<ManpowerPositionEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async audit(
    actor: ActorContext,
    action: string,
    entityType: string,
    entityId: string,
    fields: Record<string, unknown>,
  ) {
    const changes = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        { old: null, new: value },
      ]),
    );
    await this.auditLogService.append({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action,
      entityType,
      entityId,
      changes,
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
  }

  async listPlans(tenantId = DIGITARO_TENANT_ID) {
    return this.planRepository.find({
      where: { tenantId },
      order: { planYear: 'DESC', createdAt: 'DESC' },
    });
  }

  async getPlan(id: string, tenantId = DIGITARO_TENANT_ID) {
    const plan = await this.planRepository.findOne({ where: { id, tenantId } });
    if (!plan) {
      throw new NotFoundException({
        code: 'MANPOWER_PLAN_NOT_FOUND',
        message: 'Manpower plan not found',
      });
    }
    return plan;
  }

  async createPlan(dto: CreateManpowerPlanDto, actor: ActorContext) {
    const plan = await this.planRepository.save(
      this.planRepository.create({
        tenantId: actor.tenantId,
        name: dto.name,
        divisionId: dto.divisionId ?? null,
        countryCode: dto.countryCode ?? null,
        planYear: dto.planYear,
        budgetedFte: dto.budgetedFte ?? 0,
        budgetedContractorCapacity: dto.budgetedContractorCapacity ?? 0,
        plannedAttritionPercent:
          dto.plannedAttritionPercent != null
            ? String(dto.plannedAttritionPercent)
            : '0',
        createdByUserId: actor.userId,
      }),
    );

    await this.audit(actor, 'manpower_plan.create', 'manpower_plan', plan.id, {
      name: plan.name,
      planYear: plan.planYear,
    });

    return plan;
  }

  async updatePlan(
    id: string,
    dto: UpdateManpowerPlanDto,
    actor: ActorContext,
  ) {
    const plan = await this.getPlan(id, actor.tenantId);
    if (dto.status != null) plan.status = dto.status;
    if (dto.budgetedFte != null) plan.budgetedFte = dto.budgetedFte;
    if (dto.budgetedContractorCapacity != null)
      plan.budgetedContractorCapacity = dto.budgetedContractorCapacity;

    const saved = await this.planRepository.save(plan);
    await this.audit(
      actor,
      'manpower_plan.update',
      'manpower_plan',
      id,
      dto as Record<string, unknown>,
    );
    return saved;
  }

  async listPositions(planId: string, tenantId = DIGITARO_TENANT_ID) {
    return this.positionRepository.find({
      where: { tenantId, planId },
      order: { createdAt: 'DESC' },
    });
  }

  async createPosition(
    planId: string,
    dto: CreateManpowerPositionDto,
    actor: ActorContext,
  ) {
    await this.getPlan(planId, actor.tenantId);

    const position = await this.positionRepository.save(
      this.positionRepository.create({
        tenantId: actor.tenantId,
        planId,
        roleTitle: dto.roleTitle,
        departmentId: dto.departmentId ?? null,
        employmentTypeId: dto.employmentTypeId,
        headcount: dto.headcount ?? 1,
      }),
    );

    await this.audit(
      actor,
      'manpower_position.create',
      'manpower_position',
      position.id,
      {
        planId,
        roleTitle: position.roleTitle,
      },
    );

    return position;
  }

  async updatePosition(
    id: string,
    dto: UpdateManpowerPositionDto,
    actor: ActorContext,
  ) {
    const position = await this.positionRepository.findOne({
      where: { id, tenantId: actor.tenantId },
    });
    if (!position) {
      throw new NotFoundException({
        code: 'MANPOWER_POSITION_NOT_FOUND',
        message: 'Manpower position not found',
      });
    }

    if (dto.status != null) position.status = dto.status;
    if (dto.headcount != null) position.headcount = dto.headcount;

    const saved = await this.positionRepository.save(position);
    await this.audit(
      actor,
      'manpower_position.update',
      'manpower_position',
      id,
      dto as Record<string, unknown>,
    );
    return saved;
  }
}
