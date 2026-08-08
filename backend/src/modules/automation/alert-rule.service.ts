import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/automation.dto';
import { AlertRuleEntity } from './entities/alert-rule.entity';
import { AlertRuleChannel } from './enums/automation.enum';

@Injectable()
export class AlertRuleService {
  constructor(
    @InjectRepository(AlertRuleEntity)
    private readonly alertRuleRepository: Repository<AlertRuleEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<AlertRuleEntity[]> {
    return this.alertRuleRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    dto: CreateAlertRuleDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<AlertRuleEntity> {
    const saved = await this.alertRuleRepository.save(
      this.alertRuleRepository.create({
        tenantId,
        name: dto.name,
        conditionJson: dto.condition,
        channel: dto.channel ?? AlertRuleChannel.IN_APP,
        isActive: true,
        createdByUserId: actorId,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'alert_rule.create',
      entityType: 'alert_rule',
      entityId: saved.id,
      changes: {
        name: { old: null, new: saved.name },
        conditionJson: { old: null, new: saved.conditionJson },
        channel: { old: null, new: saved.channel },
      },
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateAlertRuleDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<AlertRuleEntity> {
    const rule = await this.getOrThrow(id, tenantId);
    const before = {
      name: rule.name,
      conditionJson: rule.conditionJson,
      channel: rule.channel,
      isActive: rule.isActive,
    };

    if (dto.name !== undefined) {
      rule.name = dto.name;
    }
    if (dto.condition !== undefined) {
      rule.conditionJson = dto.condition;
    }
    if (dto.channel !== undefined) {
      rule.channel = dto.channel;
    }
    if (dto.isActive !== undefined) {
      rule.isActive = dto.isActive;
    }

    const saved = await this.alertRuleRepository.save(rule);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'alert_rule.update',
      entityType: 'alert_rule',
      entityId: saved.id,
      changes: {
        name: { old: before.name, new: saved.name },
        conditionJson: { old: before.conditionJson, new: saved.conditionJson },
        channel: { old: before.channel, new: saved.channel },
        isActive: { old: before.isActive, new: saved.isActive },
      },
    });

    return saved;
  }

  async remove(
    id: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<void> {
    const rule = await this.getOrThrow(id, tenantId);
    await this.alertRuleRepository.remove(rule);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'alert_rule.delete',
      entityType: 'alert_rule',
      entityId: id,
      changes: {
        name: { old: rule.name, new: null },
      },
    });
  }

  private async getOrThrow(
    id: string,
    tenantId: string,
  ): Promise<AlertRuleEntity> {
    const rule = await this.alertRuleRepository.findOne({
      where: { id, tenantId },
    });
    if (!rule) {
      throw new NotFoundException({
        code: 'ALERT_RULE_NOT_FOUND',
        message: 'Alert rule not found',
      });
    }
    return rule;
  }
}
