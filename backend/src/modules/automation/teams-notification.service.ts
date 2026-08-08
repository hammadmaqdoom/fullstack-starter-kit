import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import {
  DIGITARO_TENANT_ID,
  SYSTEM_ACTOR_ID,
} from '@/modules/compliance/constants/tenant.constants';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';
import {
  AdaptiveCard,
  ITeamsGraphClient,
  TEAMS_GRAPH_CLIENT,
} from './interfaces/teams-graph-client.interface';

export type LeaveApprovalCardInput = {
  approverUserId: string;
  workerName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  leaveRequestId: string;
  tenantId?: string;
};

export type ProfileChangeCardInput = {
  approverUserId: string;
  workerName: string;
  fieldsSummary: string;
  requestId: string;
  tenantId?: string;
};

export type CheckInNudgeCardInput = {
  userId: string;
  workerId: string;
  workerName: string;
  tenantId?: string;
};

const frontendUrl = (): string =>
  process.env.FRONTEND_URL || 'http://localhost:3000';

@Injectable()
export class TeamsNotificationService {
  private readonly logger = new Logger(TeamsNotificationService.name);

  constructor(
    @InjectRepository(NotificationPreferenceEntity)
    private readonly preferenceRepository: Repository<NotificationPreferenceEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectQueue(QueueEnum.Automation)
    private readonly automationQueue: Queue,
    @Inject(TEAMS_GRAPH_CLIENT)
    private readonly graphClient: ITeamsGraphClient,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ---------------------------------------------------------------------
  // Enqueue (called from API-side triggers and the daily nudge scan)
  // ---------------------------------------------------------------------

  async enqueueLeaveApprovalPending(
    input: LeaveApprovalCardInput,
  ): Promise<void> {
    await this.automationQueue.add(
      JobEnum.Automation.SendLeaveApprovalCard,
      input,
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  async enqueueProfileChangePending(
    input: ProfileChangeCardInput,
  ): Promise<void> {
    await this.automationQueue.add(
      JobEnum.Automation.SendProfileChangeCard,
      input,
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  async enqueueCheckInNudge(input: CheckInNudgeCardInput): Promise<void> {
    await this.automationQueue.add(
      JobEnum.Automation.SendCheckInNudgeCard,
      input,
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  // ---------------------------------------------------------------------
  // Send (executed by the automation BullMQ processor)
  // ---------------------------------------------------------------------

  async sendLeaveApprovalCard(input: LeaveApprovalCardInput): Promise<void> {
    const card: AdaptiveCard = {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: 'Leave approval pending',
          weight: 'Bolder',
          size: 'Medium',
        },
        {
          type: 'TextBlock',
          text: `${input.workerName} requested ${input.leaveTypeName} from ${input.startDate} to ${input.endDate}.`,
          wrap: true,
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Review in Hub',
          url: `${frontendUrl()}/hub/approvals`,
        },
      ],
    };

    await this.dispatch({
      userId: input.approverUserId,
      tenantId: input.tenantId,
      cardType: 'leave_approval_pending',
      entityType: 'leave_request',
      entityId: input.leaveRequestId,
      card,
    });
  }

  async sendProfileChangeCard(input: ProfileChangeCardInput): Promise<void> {
    const card: AdaptiveCard = {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: 'Profile change pending',
          weight: 'Bolder',
          size: 'Medium',
        },
        {
          type: 'TextBlock',
          text: `${input.workerName} requested a profile update: ${input.fieldsSummary}.`,
          wrap: true,
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Review in Hub',
          url: `${frontendUrl()}/hub/approvals`,
        },
      ],
    };

    await this.dispatch({
      userId: input.approverUserId,
      tenantId: input.tenantId,
      cardType: 'profile_change_pending',
      entityType: 'profile_change_request',
      entityId: input.requestId,
      card,
    });
  }

  async sendCheckInNudgeCard(input: CheckInNudgeCardInput): Promise<void> {
    const card: AdaptiveCard = {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: "Don't forget to check in",
          weight: 'Bolder',
          size: 'Medium',
        },
        {
          type: 'TextBlock',
          text: `Hi ${input.workerName}, you haven't checked in yet today. One tap and you're done.`,
          wrap: true,
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Check in now',
          url: `${frontendUrl()}/employee/home`,
        },
      ],
    };

    await this.dispatch({
      userId: input.userId,
      tenantId: input.tenantId,
      cardType: 'check_in_nudge',
      entityType: 'worker',
      entityId: input.workerId,
      card,
    });
  }

  async sendComplianceAlertCard(input: {
    userId: string;
    title: string;
    dueDate: string;
    entityId: string;
    tenantId?: string;
  }): Promise<void> {
    const card: AdaptiveCard = {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: 'Compliance alert',
          weight: 'Bolder',
          size: 'Medium',
        },
        {
          type: 'TextBlock',
          text: `${input.title} — due ${input.dueDate}.`,
          wrap: true,
        },
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Review',
          url: `${frontendUrl()}/people-ops/dashboard`,
        },
      ],
    };

    await this.dispatch({
      userId: input.userId,
      tenantId: input.tenantId,
      cardType: 'compliance_alert',
      entityType: 'compliance_alert',
      entityId: input.entityId,
      card,
    });
  }

  // ---------------------------------------------------------------------
  // Shared send + audit pipeline
  // ---------------------------------------------------------------------

  private async dispatch(input: {
    userId: string;
    tenantId?: string;
    cardType: string;
    entityType: string;
    entityId: string;
    card: AdaptiveCard;
  }): Promise<void> {
    const tenantId = input.tenantId ?? DIGITARO_TENANT_ID;

    const preference = await this.preferenceRepository.findOne({
      where: { tenantId, userId: input.userId },
    });
    if (preference && !preference.teamsAdaptiveCards) {
      await this.auditLogService.append({
        tenantId,
        actorId: SYSTEM_ACTOR_ID,
        action: 'teams.card.skip',
        entityType: input.entityType,
        entityId: input.entityId,
        changes: {
          cardType: { old: null, new: input.cardType },
          reason: { old: null, new: 'preference_disabled' },
        },
      });
      return;
    }

    const worker = await this.workerRepository.findOne({
      where: { tenantId, userId: input.userId },
    });
    if (!worker?.entraObjectId) {
      this.logger.warn(
        `No Entra object id for user ${input.userId} — skip Teams card ${input.cardType}`,
      );
      await this.auditLogService.append({
        tenantId,
        actorId: SYSTEM_ACTOR_ID,
        action: 'teams.card.send',
        entityType: input.entityType,
        entityId: input.entityId,
        changes: {
          cardType: { old: null, new: input.cardType },
          success: { old: null, new: false },
          reason: { old: null, new: 'no_entra_object_id' },
          stubbed: { old: null, new: !this.graphClient.isConfigured() },
        },
      });
      return;
    }

    const result = await this.graphClient.sendAdaptiveCard({
      entraObjectId: worker.entraObjectId,
      card: input.card,
    });

    await this.auditLogService.append({
      tenantId,
      actorId: SYSTEM_ACTOR_ID,
      action: 'teams.card.send',
      entityType: input.entityType,
      entityId: input.entityId,
      changes: {
        cardType: { old: null, new: input.cardType },
        success: { old: null, new: result.success },
        reason: { old: null, new: result.reason },
        stubbed: { old: null, new: !this.graphClient.isConfigured() },
      },
    });

    if (!result.success) {
      this.logger.warn(
        `Teams card ${input.cardType} not delivered for user ${input.userId}: ${result.reason}`,
      );
    }
  }
}
