import { AutomationService } from '@/modules/automation/automation.service';
import { ComplianceAlertEntity } from '@/modules/automation/entities/compliance-alert.entity';
import { NotificationPreferenceEntity } from '@/modules/automation/entities/notification-preference.entity';
import { ScheduledReportSubscriptionEntity } from '@/modules/automation/entities/scheduled-report-subscription.entity';
import { ReportType } from '@/modules/automation/enums/automation.enum';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

describe('AutomationService', () => {
  let service: AutomationService;
  let preferenceRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let reportRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let complianceAlertRepository: { find: jest.Mock };
  let dataSource: { query: jest.Mock };
  let auditLogService: { append: jest.Mock };

  beforeEach(async () => {
    preferenceRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: 'pref-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };
    reportRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: 'sub-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };
    complianceAlertRepository = { find: jest.fn().mockResolvedValue([]) };
    dataSource = { query: jest.fn().mockResolvedValue([]) };
    auditLogService = { append: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        {
          provide: getRepositoryToken(NotificationPreferenceEntity),
          useValue: preferenceRepository,
        },
        {
          provide: getRepositoryToken(ScheduledReportSubscriptionEntity),
          useValue: reportRepository,
        },
        {
          provide: getRepositoryToken(ComplianceAlertEntity),
          useValue: complianceAlertRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(AutomationService);
  });

  it('creates default notification preferences', async () => {
    const prefs = await service.getNotificationPreferences('user-1');
    expect(prefs.emailApprovals).toBe(true);
    expect(preferenceRepository.save).toHaveBeenCalled();
  });

  it('creates scheduled report with audit', async () => {
    const sub = await service.createScheduledReport(
      'user-1',
      { reportType: ReportType.HEADCOUNT },
      'user-1',
      DIGITARO_TENANT_ID,
    );
    expect(sub.reportType).toBe(ReportType.HEADCOUNT);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'scheduled_report.create' }),
    );
  });

  it('lists open compliance alerts from the database', async () => {
    complianceAlertRepository.find.mockResolvedValue([
      { id: 'alert-1', alertType: 'visa_expiry', status: 'open' },
    ]);

    const alerts = await service.listComplianceAlerts(DIGITARO_TENANT_ID);

    expect(alerts).toHaveLength(1);
    expect(complianceAlertRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: DIGITARO_TENANT_ID, status: 'open' },
      }),
    );
  });

  it('runs the headcount report against real data via the query builder', async () => {
    dataSource.query.mockResolvedValue([
      {
        countryCode: 'PK',
        divisionName: 'Labs',
        departmentName: 'Engineering',
        workerCount: 12,
      },
    ]);

    const result = await service.runReport(
      ReportType.HEADCOUNT,
      {},
      DIGITARO_TENANT_ID,
    );

    expect(result.reportType).toBe(ReportType.HEADCOUNT);
    expect(result.rows).toHaveLength(1);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM workers'),
      [DIGITARO_TENANT_ID],
    );
  });

  it('returns an empty row set for an unknown report type', async () => {
    const result = await service.runReport(
      'not-a-real-report',
      {},
      DIGITARO_TENANT_ID,
    );
    expect(result.rows).toEqual([]);
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
