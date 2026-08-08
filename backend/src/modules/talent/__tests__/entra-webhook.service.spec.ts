import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { EntraStatus } from '@/modules/core-hr/enums/worker.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntraWebhookEventType } from '../dto/entra-webhook.dto';
import { EntraWebhookService } from '../entra-webhook.service';

describe('EntraWebhookService', () => {
  let service: EntraWebhookService;
  let workerRepository: jest.Mocked<
    Pick<Repository<WorkerEntity>, 'findOne' | 'save'>
  >;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;

  const entraObjectId = 'e0000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    workerRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (entity) => entity as WorkerEntity),
    } as unknown as typeof workerRepository;
    auditLogService = { append: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntraWebhookService,
        {
          provide: getRepositoryToken(WorkerEntity),
          useValue: workerRepository,
        },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(EntraWebhookService);
  });

  it('returns handled:false when no worker matches the entraObjectId', async () => {
    workerRepository.findOne.mockResolvedValue(null);

    const result = await service.handleEvent({
      entraObjectId,
      eventType: EntraWebhookEventType.USER_DISABLED,
    });

    expect(result).toEqual({ handled: false, workerId: null });
    expect(auditLogService.append).not.toHaveBeenCalled();
  });

  it('sets entraStatus to disabled on a user.disabled event and writes audit log', async () => {
    const worker = {
      id: 'worker-1',
      tenantId: 'tenant-1',
      entraObjectId,
      entraStatus: EntraStatus.PROVISIONED,
    } as WorkerEntity;
    workerRepository.findOne.mockResolvedValue(worker);

    const result = await service.handleEvent({
      entraObjectId,
      eventType: EntraWebhookEventType.USER_DISABLED,
    });

    expect(result).toEqual({ handled: true, workerId: 'worker-1' });
    expect(workerRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ entraStatus: EntraStatus.DISABLED }),
    );
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'entra.webhook.user.disabled',
        entityType: 'worker',
        entityId: 'worker-1',
        changes: {
          entraStatus: {
            old: EntraStatus.PROVISIONED,
            new: EntraStatus.DISABLED,
          },
        },
      }),
    );
  });

  it('sets entraStatus to disabled on a user.deleted event', async () => {
    const worker = {
      id: 'worker-2',
      tenantId: 'tenant-1',
      entraObjectId,
      entraStatus: EntraStatus.PROVISIONED,
    } as WorkerEntity;
    workerRepository.findOne.mockResolvedValue(worker);

    const result = await service.handleEvent({
      entraObjectId,
      eventType: EntraWebhookEventType.USER_DELETED,
    });

    expect(result.handled).toBe(true);
    expect(workerRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ entraStatus: EntraStatus.DISABLED }),
    );
  });

  it('is a no-op when the worker already has the target status', async () => {
    const worker = {
      id: 'worker-3',
      tenantId: 'tenant-1',
      entraObjectId,
      entraStatus: EntraStatus.DISABLED,
    } as WorkerEntity;
    workerRepository.findOne.mockResolvedValue(worker);

    const result = await service.handleEvent({
      entraObjectId,
      eventType: EntraWebhookEventType.USER_DISABLED,
    });

    expect(result).toEqual({ handled: false, workerId: 'worker-3' });
    expect(workerRepository.save).not.toHaveBeenCalled();
  });

  it('re-enables entraStatus on a user.enabled event', async () => {
    const worker = {
      id: 'worker-4',
      tenantId: 'tenant-1',
      entraObjectId,
      entraStatus: EntraStatus.DISABLED,
    } as WorkerEntity;
    workerRepository.findOne.mockResolvedValue(worker);

    const result = await service.handleEvent({
      entraObjectId,
      eventType: EntraWebhookEventType.USER_ENABLED,
    });

    expect(result.handled).toBe(true);
    expect(workerRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ entraStatus: EntraStatus.PROVISIONED }),
    );
  });
});
