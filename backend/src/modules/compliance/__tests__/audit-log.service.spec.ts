import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { AuditLogEntity } from '@/modules/compliance/entities/audit-log.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<Pick<Repository<AuditLogEntity>, 'create' | 'save'>>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLogEntity),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(AuditLogService);
  });

  it('appends immutable entry with actor, action, entity, diff', async () => {
    const createdAt = new Date();
    const savedEntry = {
      id: 'audit-1',
      tenantId: DIGITARO_TENANT_ID,
      actorId: 'user-1',
      action: 'worker.create',
      entityType: 'worker',
      entityId: 'worker-1',
      changes: { email: { old: null, new: 'a@digitaro.co' } },
      correlationId: null,
      ipAddress: null,
      createdAt,
    } as AuditLogEntity;

    repository.create.mockReturnValue(savedEntry);
    repository.save.mockResolvedValue(savedEntry);

    const entry = await service.append({
      tenantId: DIGITARO_TENANT_ID,
      actorId: 'user-1',
      action: 'worker.create',
      entityType: 'worker',
      entityId: 'worker-1',
      changes: { email: { old: null, new: 'a@digitaro.co' } },
    });

    expect(entry.id).toBeDefined();
    expect(entry.createdAt).toBeInstanceOf(Date);
    expect(repository.create).toHaveBeenCalledWith({
      tenantId: DIGITARO_TENANT_ID,
      actorId: 'user-1',
      action: 'worker.create',
      entityType: 'worker',
      entityId: 'worker-1',
      changes: { email: { old: null, new: 'a@digitaro.co' } },
      correlationId: null,
      ipAddress: null,
    });
    expect(repository.save).toHaveBeenCalledWith(savedEntry);
  });
});
