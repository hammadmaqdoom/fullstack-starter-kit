import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlertRuleService } from '../alert-rule.service';
import { AlertRuleEntity } from '../entities/alert-rule.entity';
import {
  AlertRuleChannel,
  ComplianceAlertType,
} from '../enums/automation.enum';

describe('AlertRuleService', () => {
  let service: AlertRuleService;
  let alertRuleRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let auditLogService: { append: jest.Mock };

  beforeEach(async () => {
    alertRuleRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({
        ...entity,
        id: entity.id ?? 'rule-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      remove: jest.fn(),
    };
    auditLogService = { append: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertRuleService,
        {
          provide: getRepositoryToken(AlertRuleEntity),
          useValue: alertRuleRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(AlertRuleService);
  });

  it('creates a rule with the given condition and default in_app channel', async () => {
    const rule = await service.create(
      {
        name: 'Visa expiring in 45 days',
        condition: {
          metric: ComplianceAlertType.VISA_EXPIRY,
          withinDays: 45,
        },
      },
      'user-1',
      DIGITARO_TENANT_ID,
    );

    expect(rule.channel).toBe(AlertRuleChannel.IN_APP);
    expect(rule.conditionJson).toEqual({
      metric: ComplianceAlertType.VISA_EXPIRY,
      withinDays: 45,
    });
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'alert_rule.create' }),
    );
  });

  it('updates fields and records the diff in audit_log', async () => {
    alertRuleRepository.findOne.mockResolvedValue({
      id: 'rule-1',
      tenantId: DIGITARO_TENANT_ID,
      name: 'Old name',
      conditionJson: {
        metric: ComplianceAlertType.PROBATION_END,
        withinDays: 7,
      },
      channel: AlertRuleChannel.IN_APP,
      isActive: true,
    } as AlertRuleEntity);

    const updated = await service.update(
      'rule-1',
      { isActive: false },
      'user-1',
      DIGITARO_TENANT_ID,
    );

    expect(updated.isActive).toBe(false);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'alert_rule.update',
        changes: expect.objectContaining({
          isActive: { old: true, new: false },
        }),
      }),
    );
  });

  it('throws NotFoundException when updating a missing rule', async () => {
    alertRuleRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update(
        'missing',
        { isActive: false },
        'user-1',
        DIGITARO_TENANT_ID,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('removes a rule and writes an audit entry', async () => {
    alertRuleRepository.findOne.mockResolvedValue({
      id: 'rule-1',
      tenantId: DIGITARO_TENANT_ID,
      name: 'Old name',
    } as AlertRuleEntity);

    await service.remove('rule-1', 'user-1', DIGITARO_TENANT_ID);

    expect(alertRuleRepository.remove).toHaveBeenCalled();
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'alert_rule.delete' }),
    );
  });
});
