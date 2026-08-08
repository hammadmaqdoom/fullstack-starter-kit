import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Queue as QueueEnum } from '@/constants/job.constant';
import { NotificationPreferenceEntity } from '../entities/notification-preference.entity';
import { TEAMS_GRAPH_CLIENT } from '../interfaces/teams-graph-client.interface';
import { TeamsNotificationService } from '../teams-notification.service';

describe('TeamsNotificationService', () => {
  let service: TeamsNotificationService;
  let preferenceRepository: { findOne: jest.Mock };
  let workerRepository: { findOne: jest.Mock };
  let auditLogService: { append: jest.Mock };
  let graphClient: { isConfigured: jest.Mock; sendAdaptiveCard: jest.Mock };
  let automationQueue: { add: jest.Mock };

  const userId = 'u0000000-0000-4000-8000-000000000001';
  const entraObjectId = 'entra-obj-1';

  beforeEach(async () => {
    preferenceRepository = { findOne: jest.fn().mockResolvedValue(null) };
    workerRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'worker-1',
        userId,
        tenantId: DIGITARO_TENANT_ID,
        entraObjectId,
      } as WorkerEntity),
    };
    auditLogService = { append: jest.fn() };
    graphClient = {
      isConfigured: jest.fn().mockReturnValue(true),
      sendAdaptiveCard: jest.fn().mockResolvedValue({
        success: true,
        reason: 'sent',
        chatId: 'chat-1',
        messageId: 'msg-1',
      }),
    };
    automationQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsNotificationService,
        {
          provide: getRepositoryToken(NotificationPreferenceEntity),
          useValue: preferenceRepository,
        },
        { provide: getRepositoryToken(WorkerEntity), useValue: workerRepository },
        { provide: getQueueToken(QueueEnum.Automation), useValue: automationQueue },
        { provide: TEAMS_GRAPH_CLIENT, useValue: graphClient },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(TeamsNotificationService);
  });

  describe('enqueue*', () => {
    it('enqueues a leave approval card job', async () => {
      await service.enqueueLeaveApprovalPending({
        approverUserId: userId,
        workerName: 'Jane Doe',
        leaveTypeName: 'Annual Leave',
        startDate: '2026-08-01',
        endDate: '2026-08-02',
        leaveRequestId: 'lr-1',
      });

      expect(automationQueue.add).toHaveBeenCalledWith(
        'send-leave-approval-card',
        expect.objectContaining({ leaveRequestId: 'lr-1' }),
        expect.any(Object),
      );
    });

    it('enqueues a check-in nudge card job', async () => {
      await service.enqueueCheckInNudge({
        userId,
        workerId: 'worker-1',
        workerName: 'Jane Doe',
      });

      expect(automationQueue.add).toHaveBeenCalledWith(
        'send-check-in-nudge-card',
        expect.objectContaining({ workerId: 'worker-1' }),
        expect.any(Object),
      );
    });
  });

  describe('send* (via Graph client)', () => {
    it('sends a leave approval card and audits success', async () => {
      await service.sendLeaveApprovalCard({
        approverUserId: userId,
        workerName: 'Jane Doe',
        leaveTypeName: 'Annual Leave',
        startDate: '2026-08-01',
        endDate: '2026-08-02',
        leaveRequestId: 'lr-1',
      });

      expect(graphClient.sendAdaptiveCard).toHaveBeenCalledWith(
        expect.objectContaining({
          entraObjectId,
          card: expect.objectContaining({ type: 'AdaptiveCard' }),
        }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'teams.card.send',
          entityType: 'leave_request',
          entityId: 'lr-1',
          changes: expect.objectContaining({
            cardType: { old: null, new: 'leave_approval_pending' },
            success: { old: null, new: true },
          }),
        }),
      );
    });

    it('sends a profile change card and audits success', async () => {
      await service.sendProfileChangeCard({
        approverUserId: userId,
        workerName: 'Jane Doe',
        fieldsSummary: 'phone, personalEmail',
        requestId: 'pcr-1',
      });

      expect(graphClient.sendAdaptiveCard).toHaveBeenCalled();
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'teams.card.send',
          entityType: 'profile_change_request',
          entityId: 'pcr-1',
        }),
      );
    });

    it('sends a check-in nudge card and audits success', async () => {
      await service.sendCheckInNudgeCard({
        userId,
        workerId: 'worker-1',
        workerName: 'Jane Doe',
      });

      expect(graphClient.sendAdaptiveCard).toHaveBeenCalled();
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'teams.card.send',
          entityType: 'worker',
          entityId: 'worker-1',
        }),
      );
    });

    it('skips send and audits when preference has teamsAdaptiveCards disabled', async () => {
      preferenceRepository.findOne.mockResolvedValue({
        teamsAdaptiveCards: false,
      });

      await service.sendCheckInNudgeCard({
        userId,
        workerId: 'worker-1',
        workerName: 'Jane Doe',
      });

      expect(graphClient.sendAdaptiveCard).not.toHaveBeenCalled();
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'teams.card.skip',
          changes: expect.objectContaining({
            reason: { old: null, new: 'preference_disabled' },
          }),
        }),
      );
    });

    it('audits a failed send with stubbed=true when Graph is not configured', async () => {
      graphClient.isConfigured.mockReturnValue(false);
      graphClient.sendAdaptiveCard.mockResolvedValue({
        success: false,
        reason: 'not_configured',
        chatId: null,
        messageId: null,
      });

      await service.sendCheckInNudgeCard({
        userId,
        workerId: 'worker-1',
        workerName: 'Jane Doe',
      });

      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'teams.card.send',
          changes: expect.objectContaining({
            success: { old: null, new: false },
            reason: { old: null, new: 'not_configured' },
            stubbed: { old: null, new: true },
          }),
        }),
      );
    });

    it('skips send and audits when worker has no Entra object id', async () => {
      workerRepository.findOne.mockResolvedValue({
        id: 'worker-1',
        userId,
        tenantId: DIGITARO_TENANT_ID,
        entraObjectId: null,
      } as WorkerEntity);

      await service.sendCheckInNudgeCard({
        userId,
        workerId: 'worker-1',
        workerName: 'Jane Doe',
      });

      expect(graphClient.sendAdaptiveCard).not.toHaveBeenCalled();
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.objectContaining({
            reason: { old: null, new: 'no_entra_object_id' },
          }),
        }),
      );
    });
  });
});
