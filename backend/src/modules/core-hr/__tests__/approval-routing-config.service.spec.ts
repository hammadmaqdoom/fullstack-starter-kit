import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ApprovalRoutingConfigService } from '../approval-routing-config.service';
import { ApprovalRoutingConfigEntity } from '../entities/approval-routing-config.entity';
import { ApprovalMode, ApprovalWorkflowType } from '../enums/approval-routing.enum';

describe('ApprovalRoutingConfigService', () => {
  let service: ApprovalRoutingConfigService;
  let configRepository: jest.Mocked<
    Pick<Repository<ApprovalRoutingConfigEntity>, 'create' | 'save' | 'findOne' | 'find' | 'remove'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;

  beforeEach(async () => {
    configRepository = {
      create: jest.fn((entity) => entity as ApprovalRoutingConfigEntity),
      save: jest.fn(
        async (entity) => ({ ...entity, id: 'config-1' }) as ApprovalRoutingConfigEntity,
      ),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      remove: jest.fn(),
    } as unknown as typeof configRepository;

    auditLogService = { append: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalRoutingConfigService,
        {
          provide: getRepositoryToken(ApprovalRoutingConfigEntity),
          useValue: configRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(ApprovalRoutingConfigService);
  });

  it('creates a routing config tier and writes an audit log entry', async () => {
    const result = await service.create(
      {
        workflowType: ApprovalWorkflowType.EXPENSE,
        amountThreshold: 5000,
        approverMode: ApprovalMode.SERIAL,
        escalationAfterDays: 3,
      },
      'ops-user',
    );

    expect(result.id).toBe('config-1');
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'approval_routing_config.create' }),
    );
  });

  it('updates a routing config tier and writes an audit log entry', async () => {
    configRepository.findOne.mockResolvedValue({
      id: 'config-1',
      tenantId: DIGITARO_TENANT_ID,
      workflowType: ApprovalWorkflowType.TRAVEL,
      countryCode: null,
      legalEntityId: null,
      amountThreshold: '1000.00',
      approverMode: ApprovalMode.SERIAL,
      escalationAfterDays: 2,
      isActive: true,
      createdByUserId: 'ops-user',
    } as ApprovalRoutingConfigEntity);

    const result = await service.update(
      'config-1',
      { approverMode: ApprovalMode.PARALLEL },
      'ops-user',
    );

    expect(result.approverMode).toBe(ApprovalMode.PARALLEL);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'approval_routing_config.update' }),
    );
  });

  it('throws when updating a nonexistent config', async () => {
    configRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update('missing', { approverMode: ApprovalMode.PARALLEL }, 'ops-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes a routing config tier and writes an audit log entry', async () => {
    configRepository.findOne.mockResolvedValue({
      id: 'config-1',
      tenantId: DIGITARO_TENANT_ID,
      workflowType: ApprovalWorkflowType.LEAVE,
    } as ApprovalRoutingConfigEntity);

    await service.remove('config-1', 'ops-user');

    expect(configRepository.remove).toHaveBeenCalled();
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'approval_routing_config.delete' }),
    );
  });
});
