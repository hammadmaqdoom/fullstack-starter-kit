import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { SYSTEM_ACTOR_ID } from '@/modules/compliance/constants/tenant.constants';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { EntraStatus } from '@/modules/core-hr/enums/worker.enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EntraWebhookEventDto,
  EntraWebhookEventType,
} from './dto/entra-webhook.dto';

export interface EntraWebhookResult {
  handled: boolean;
  workerId: string | null;
}

const NEXT_STATUS_BY_EVENT: Record<EntraWebhookEventType, EntraStatus> = {
  [EntraWebhookEventType.USER_DISABLED]: EntraStatus.DISABLED,
  [EntraWebhookEventType.USER_DELETED]: EntraStatus.DISABLED,
  [EntraWebhookEventType.USER_ENABLED]: EntraStatus.PROVISIONED,
};

/**
 * FLW-SEC-006 — reconciles worker.entraStatus when Entra ID reports a user
 * lifecycle change out-of-band (e.g. an admin disables/deletes the account
 * directly in Entra rather than through the Polaris separation flow).
 */
@Injectable()
export class EntraWebhookService {
  private readonly logger = new Logger(EntraWebhookService.name);

  constructor(
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async handleEvent(dto: EntraWebhookEventDto): Promise<EntraWebhookResult> {
    const worker = await this.workerRepository.findOne({
      where: { entraObjectId: dto.entraObjectId },
    });

    if (!worker) {
      this.logger.warn(
        `Entra webhook event "${dto.eventType}" for unknown entraObjectId ${dto.entraObjectId}`,
      );
      return { handled: false, workerId: null };
    }

    const nextStatus = NEXT_STATUS_BY_EVENT[dto.eventType];
    if (!nextStatus || worker.entraStatus === nextStatus) {
      return { handled: false, workerId: worker.id };
    }

    const previousStatus = worker.entraStatus;
    worker.entraStatus = nextStatus;
    await this.workerRepository.save(worker);

    await this.auditLogService.append({
      tenantId: worker.tenantId,
      actorId: SYSTEM_ACTOR_ID,
      action: `entra.webhook.${dto.eventType}`,
      entityType: 'worker',
      entityId: worker.id,
      changes: {
        entraStatus: { old: previousStatus, new: nextStatus },
      },
    });

    return { handled: true, workerId: worker.id };
  }
}
