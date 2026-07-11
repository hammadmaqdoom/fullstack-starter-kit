import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManpowerPlanEntity } from '../entities/manpower-plan.entity';
import { ManpowerPositionEntity } from '../entities/manpower-position.entity';
import {
  ManpowerPlanStatus,
  ManpowerPositionStatus,
} from '../enums/manpower.enum';
import { ManpowerService } from '../manpower.service';

describe('ManpowerService', () => {
  let service: ManpowerService;
  let planRepository: jest.Mocked<
    Pick<Repository<ManpowerPlanEntity>, 'create' | 'save' | 'findOne' | 'find'>
  >;
  let positionRepository: jest.Mocked<
    Pick<
      Repository<ManpowerPositionEntity>,
      'create' | 'save' | 'findOne' | 'find'
    >
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;

  const tenantId = DIGITARO_TENANT_ID;
  const actor = { userId: 'ops-user', tenantId };

  beforeEach(async () => {
    planRepository = {
      create: jest.fn((entity) => entity as ManpowerPlanEntity),
      save: jest.fn(
        async (entity) =>
          ({ ...entity, id: entity.id ?? 'plan-1' }) as ManpowerPlanEntity,
      ),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    } as unknown as typeof planRepository;
    positionRepository = {
      create: jest.fn((entity) => entity as ManpowerPositionEntity),
      save: jest.fn(
        async (entity) =>
          ({ ...entity, id: entity.id ?? 'pos-1' }) as ManpowerPositionEntity,
      ),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    } as unknown as typeof positionRepository;
    auditLogService = { append: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManpowerService,
        {
          provide: getRepositoryToken(ManpowerPlanEntity),
          useValue: planRepository,
        },
        {
          provide: getRepositoryToken(ManpowerPositionEntity),
          useValue: positionRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(ManpowerService);
  });

  it('creates a manpower plan in draft status and writes an audit log entry', async () => {
    const plan = await service.createPlan(
      { name: 'FY26 Labs Plan', planYear: 2026 } as any,
      actor,
    );

    expect(plan.id).toBe('plan-1');
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'manpower_plan.create',
        entityType: 'manpower_plan',
      }),
    );
  });

  it('throws when updating a plan that does not exist', async () => {
    planRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updatePlan(
        'missing-plan',
        { status: ManpowerPlanStatus.ACTIVE } as any,
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('adds a position to an existing plan and writes an audit log entry', async () => {
    planRepository.findOne.mockResolvedValue({
      id: 'plan-1',
      tenantId,
    } as ManpowerPlanEntity);

    const position = await service.createPosition(
      'plan-1',
      { roleTitle: 'Senior Engineer', employmentTypeId: 'et-1' } as any,
      actor,
    );

    expect(position.planId).toBe('plan-1');
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'manpower_position.create',
        entityType: 'manpower_position',
      }),
    );
  });

  it('rejects adding a position to a plan that does not exist', async () => {
    planRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createPosition(
        'missing-plan',
        { roleTitle: 'Engineer', employmentTypeId: 'et-1' } as any,
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a position status', async () => {
    positionRepository.findOne.mockResolvedValue({
      id: 'pos-1',
      tenantId,
      status: ManpowerPositionStatus.OPEN,
    } as ManpowerPositionEntity);

    const updated = await service.updatePosition(
      'pos-1',
      { status: ManpowerPositionStatus.FROZEN } as any,
      actor,
    );

    expect(updated.status).toBe(ManpowerPositionStatus.FROZEN);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'manpower_position.update' }),
    );
  });
});
