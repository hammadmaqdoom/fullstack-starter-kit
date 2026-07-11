import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateApprovalRoutingConfigDto,
  UpdateApprovalRoutingConfigDto,
} from './dto/approval-routing-config.dto';
import { ApprovalRoutingConfigEntity } from './entities/approval-routing-config.entity';
import { ApprovalWorkflowType } from './enums/approval-routing.enum';

@Injectable()
export class ApprovalRoutingConfigService {
  constructor(
    @InjectRepository(ApprovalRoutingConfigEntity)
    private readonly configRepository: Repository<ApprovalRoutingConfigEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(
    workflowType?: ApprovalWorkflowType,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ApprovalRoutingConfigEntity[]> {
    return this.configRepository.find({
      where: workflowType ? { tenantId, workflowType } : { tenantId },
      order: { workflowType: 'ASC', amountThreshold: 'ASC' },
    });
  }

  async create(
    dto: CreateApprovalRoutingConfigDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ApprovalRoutingConfigEntity> {
    const saved = await this.configRepository.save(
      this.configRepository.create({
        tenantId,
        workflowType: dto.workflowType,
        countryCode: dto.countryCode?.toUpperCase() ?? null,
        legalEntityId: dto.legalEntityId ?? null,
        amountThreshold: dto.amountThreshold?.toFixed(2) ?? null,
        approverMode: dto.approverMode,
        escalationAfterDays: dto.escalationAfterDays ?? null,
        isActive: dto.isActive ?? true,
        createdByUserId: actorId,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'approval_routing_config.create',
      entityType: 'approval_routing_config',
      entityId: saved.id,
      changes: {
        workflowType: { old: null, new: saved.workflowType },
        countryCode: { old: null, new: saved.countryCode },
        legalEntityId: { old: null, new: saved.legalEntityId },
        amountThreshold: { old: null, new: saved.amountThreshold },
        approverMode: { old: null, new: saved.approverMode },
        escalationAfterDays: { old: null, new: saved.escalationAfterDays },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateApprovalRoutingConfigDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ApprovalRoutingConfigEntity> {
    const config = await this.getOrThrow(id, tenantId);
    const before = { ...config };

    if (dto.amountThreshold !== undefined) {
      config.amountThreshold = dto.amountThreshold.toFixed(2);
    }
    if (dto.approverMode !== undefined) {
      config.approverMode = dto.approverMode;
    }
    if (dto.escalationAfterDays !== undefined) {
      config.escalationAfterDays = dto.escalationAfterDays;
    }
    if (dto.isActive !== undefined) {
      config.isActive = dto.isActive;
    }

    const saved = await this.configRepository.save(config);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'approval_routing_config.update',
      entityType: 'approval_routing_config',
      entityId: saved.id,
      changes: {
        amountThreshold: { old: before.amountThreshold, new: saved.amountThreshold },
        approverMode: { old: before.approverMode, new: saved.approverMode },
        escalationAfterDays: {
          old: before.escalationAfterDays,
          new: saved.escalationAfterDays,
        },
        isActive: { old: before.isActive, new: saved.isActive },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async remove(
    id: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<void> {
    const config = await this.getOrThrow(id, tenantId);
    await this.configRepository.remove(config);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'approval_routing_config.delete',
      entityType: 'approval_routing_config',
      entityId: config.id,
      changes: {
        workflowType: { old: config.workflowType, new: null },
      },
      correlationId,
      ipAddress,
    });
  }

  private async getOrThrow(
    id: string,
    tenantId: string,
  ): Promise<ApprovalRoutingConfigEntity> {
    const config = await this.configRepository.findOne({ where: { id, tenantId } });

    if (!config) {
      throw new NotFoundException({
        code: 'APPROVAL_ROUTING_CONFIG_NOT_FOUND',
        message: 'Approval routing config not found',
      });
    }

    return config;
  }
}
