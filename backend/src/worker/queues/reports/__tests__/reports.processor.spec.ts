import { UserEntity } from '@/auth/entities/user.entity';
import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { AutomationService } from '@/modules/automation/automation.service';
import { ScheduledReportSubscriptionEntity } from '@/modules/automation/entities/scheduled-report-subscription.entity';
import {
  ReportCadence,
  ReportType,
} from '@/modules/automation/enums/automation.enum';
import { ReportBlobStorageService } from '@/modules/automation/report-blob-storage.service';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { MailService } from '@/shared/mail/mail.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { ReportsProcessor } from '../reports.processor';

describe('ReportsProcessor', () => {
  let processor: ReportsProcessor;
  let subscriptionRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };
  let reportsQueue: { add: jest.Mock };
  let automationService: { runReport: jest.Mock };
  let reportBlobStorageService: { uploadCsv: jest.Mock };
  let mailService: { sendReportExportReadyMail: jest.Mock };
  let auditLogService: { append: jest.Mock };

  const subscription = {
    id: 'sub-1',
    tenantId: DIGITARO_TENANT_ID,
    userId: 'user-1',
    reportType: ReportType.HEADCOUNT,
    cadence: ReportCadence.WEEKLY,
    filters: {},
    isActive: true,
    lastDeliveredAt: null,
  } as ScheduledReportSubscriptionEntity;

  beforeEach(async () => {
    subscriptionRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn(async (entity) => entity),
    };
    userRepository = { findOne: jest.fn() };
    reportsQueue = { add: jest.fn() };
    automationService = {
      runReport: jest.fn().mockResolvedValue({
        reportType: ReportType.HEADCOUNT,
        generatedAt: new Date().toISOString(),
        rows: [{ countryCode: 'PK', workerCount: 10 }],
      }),
    };
    reportBlobStorageService = {
      uploadCsv: jest
        .fn()
        .mockResolvedValue('https://blob.example.com/reports/headcount.csv'),
    };
    mailService = { sendReportExportReadyMail: jest.fn() };
    auditLogService = { append: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsProcessor,
        {
          provide: getRepositoryToken(ScheduledReportSubscriptionEntity),
          useValue: subscriptionRepository,
        },
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        { provide: getQueueToken(QueueEnum.Reports), useValue: reportsQueue },
        { provide: AutomationService, useValue: automationService },
        {
          provide: ReportBlobStorageService,
          useValue: reportBlobStorageService,
        },
        { provide: MailService, useValue: mailService },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    processor = module.get(ReportsProcessor);
  });

  describe('EvaluateDueSubscriptions', () => {
    it('queues delivery for subscriptions with no prior delivery', async () => {
      subscriptionRepository.find.mockResolvedValue([subscription]);

      const job = {
        name: JobEnum.Reports.EvaluateDueSubscriptions,
        data: {},
      } as Job;
      const result = await processor.process(job);

      expect(result).toEqual({ queued: 1 });
      expect(reportsQueue.add).toHaveBeenCalledWith(
        JobEnum.Reports.DeliverSubscription,
        { subscriptionId: 'sub-1' },
        expect.objectContaining({ removeOnComplete: true }),
      );
    });

    it('skips a weekly subscription delivered yesterday', async () => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      subscriptionRepository.find.mockResolvedValue([
        { ...subscription, lastDeliveredAt: yesterday },
      ]);

      const job = {
        name: JobEnum.Reports.EvaluateDueSubscriptions,
        data: {},
      } as Job;
      const result = await processor.process(job);

      expect(result).toEqual({ queued: 0 });
      expect(reportsQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('DeliverSubscription', () => {
    it('generates CSV, uploads it, emails the recipient, and updates lastDeliveredAt', async () => {
      subscriptionRepository.findOne.mockResolvedValue({ ...subscription });
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'ops@example.com',
        firstName: 'Ops',
      } as UserEntity);

      const job = {
        name: JobEnum.Reports.DeliverSubscription,
        data: { subscriptionId: 'sub-1' },
      } as Job;
      const result = await processor.process(job);

      expect(result).toEqual({ delivered: true, rows: 1 });
      expect(reportBlobStorageService.uploadCsv).toHaveBeenCalledWith(
        expect.stringContaining('countryCode,workerCount'),
        expect.stringContaining('headcount'),
      );
      expect(mailService.sendReportExportReadyMail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ops@example.com',
          url: 'https://blob.example.com/reports/headcount.csv',
        }),
      );
      expect(subscriptionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ lastDeliveredAt: expect.any(Date) }),
      );
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'scheduled_report.deliver' }),
      );
    });

    it('skips delivery when the subscription is missing', async () => {
      subscriptionRepository.findOne.mockResolvedValue(null);

      const job = {
        name: JobEnum.Reports.DeliverSubscription,
        data: { subscriptionId: 'missing' },
      } as Job;
      const result = await processor.process(job);

      expect(result).toEqual({ delivered: false });
      expect(mailService.sendReportExportReadyMail).not.toHaveBeenCalled();
    });

    it('skips delivery when the recipient has no email', async () => {
      subscriptionRepository.findOne.mockResolvedValue({ ...subscription });
      userRepository.findOne.mockResolvedValue(null);

      const job = {
        name: JobEnum.Reports.DeliverSubscription,
        data: { subscriptionId: 'sub-1' },
      } as Job;
      const result = await processor.process(job);

      expect(result).toEqual({ delivered: false });
    });
  });
});
