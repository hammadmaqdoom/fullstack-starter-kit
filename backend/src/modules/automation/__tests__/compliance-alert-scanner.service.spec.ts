import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { MailService } from '@/shared/mail/mail.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ComplianceAlertScannerService } from '../compliance-alert-scanner.service';
import { AlertRuleEntity } from '../entities/alert-rule.entity';
import { ComplianceAlertEntity } from '../entities/compliance-alert.entity';
import {
  AlertRuleChannel,
  ComplianceAlertSeverity,
  ComplianceAlertType,
} from '../enums/automation.enum';
import { TeamsNotificationService } from '../teams-notification.service';

describe('ComplianceAlertScannerService', () => {
  let service: ComplianceAlertScannerService;
  let alertRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let alertRuleRepository: { find: jest.Mock };
  let dataSource: { query: jest.Mock };
  let mailService: { sendComplianceAlertMail: jest.Mock };
  let teamsNotificationService: { sendComplianceAlertCard: jest.Mock };

  beforeEach(async () => {
    alertRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({ ...entity, id: 'alert-1' })),
    };
    alertRuleRepository = { find: jest.fn().mockResolvedValue([]) };
    dataSource = { query: jest.fn().mockResolvedValue([]) };
    mailService = { sendComplianceAlertMail: jest.fn() };
    teamsNotificationService = { sendComplianceAlertCard: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceAlertScannerService,
        {
          provide: getRepositoryToken(ComplianceAlertEntity),
          useValue: alertRepository,
        },
        {
          provide: getRepositoryToken(AlertRuleEntity),
          useValue: alertRuleRepository,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: MailService, useValue: mailService },
        {
          provide: TeamsNotificationService,
          useValue: teamsNotificationService,
        },
      ],
    }).compile();

    service = module.get(ComplianceAlertScannerService);
  });

  it('creates a baseline probation alert and skips already-open duplicates', async () => {
    dataSource.query.mockImplementation(async (sql: string) => {
      if (sql.includes('w."probationEndDate"')) {
        return [
          {
            id: 'worker-1',
            firstName: 'Amina',
            lastName: 'Khan',
            dueDate: '2026-07-15',
            managerUserId: null,
            managerEmail: null,
            managerFirstName: null,
          },
        ];
      }
      return [];
    });

    const result = await service.scan(DIGITARO_TENANT_ID);

    expect(result.created).toBe(1);
    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        alertType: ComplianceAlertType.PROBATION_END,
        workerId: 'worker-1',
        sourceRuleId: null,
      }),
    );
  });

  it('does not duplicate an alert that is already open', async () => {
    alertRepository.findOne.mockResolvedValue({ id: 'existing-alert' });
    dataSource.query.mockImplementation(async (sql: string) => {
      if (sql.includes('w."probationEndDate"')) {
        return [
          {
            id: 'worker-1',
            firstName: 'Amina',
            lastName: 'Khan',
            dueDate: '2026-07-15',
            managerUserId: null,
            managerEmail: null,
            managerFirstName: null,
          },
        ];
      }
      return [];
    });

    const result = await service.scan(DIGITARO_TENANT_ID);

    expect(result.created).toBe(0);
    expect(alertRepository.save).not.toHaveBeenCalled();
  });

  it('evaluates active custom alert_rules and dispatches via the configured channel', async () => {
    alertRuleRepository.find.mockResolvedValue([
      {
        id: 'rule-1',
        tenantId: DIGITARO_TENANT_ID,
        conditionJson: {
          metric: ComplianceAlertType.VISA_EXPIRY,
          withinDays: 60,
          severity: 'critical',
        },
        channel: AlertRuleChannel.EMAIL,
        isActive: true,
      },
    ]);
    dataSource.query.mockImplementation(async (sql: string) => {
      if (sql.includes('worker_visa_records')) {
        return [
          {
            id: 'worker-2',
            firstName: 'Wei',
            lastName: 'Tan',
            dueDate: '2026-08-01',
            managerUserId: 'manager-user-1',
            managerEmail: 'manager@example.com',
            managerFirstName: 'Sam',
          },
        ];
      }
      return [];
    });

    const result = await service.scan(DIGITARO_TENANT_ID);

    expect(result.evaluated).toBe(3); // 2 baseline + 1 custom rule
    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        alertType: ComplianceAlertType.VISA_EXPIRY,
        severity: ComplianceAlertSeverity.CRITICAL,
        sourceRuleId: 'rule-1',
      }),
    );
    expect(mailService.sendComplianceAlertMail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'manager@example.com' }),
    );
  });

  it('ignores alert_rules with unsupported metrics', async () => {
    alertRuleRepository.find.mockResolvedValue([
      {
        id: 'rule-2',
        tenantId: DIGITARO_TENANT_ID,
        conditionJson: { metric: ComplianceAlertType.BIRTHDAY, withinDays: 3 },
        channel: AlertRuleChannel.TEAMS,
        isActive: true,
      },
    ]);

    const result = await service.scan(DIGITARO_TENANT_ID);

    expect(result.evaluated).toBe(2); // baseline only
    expect(
      teamsNotificationService.sendComplianceAlertCard,
    ).not.toHaveBeenCalled();
  });
});
