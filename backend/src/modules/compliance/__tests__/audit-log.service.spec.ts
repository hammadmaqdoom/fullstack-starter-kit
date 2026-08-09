import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogEntity } from '@/modules/compliance/entities/audit-log.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<
    Pick<Repository<AuditLogEntity>, 'create' | 'save' | 'createQueryBuilder'>
  >;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
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

  describe('list', () => {
    const buildQb = (items: AuditLogEntity[], total: number) => {
      const qb: Partial<SelectQueryBuilder<AuditLogEntity>> = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(total),
        getMany: jest.fn().mockResolvedValue(items),
      };
      return qb as jest.Mocked<SelectQueryBuilder<AuditLogEntity>>;
    };

    it('paginates and applies tenant + filter clauses', async () => {
      const entries = [{ id: 'audit-1' } as AuditLogEntity];
      const qb = buildQb(entries, 1);
      repository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list(
        {
          page: 2,
          limit: 10,
          entityType: 'worker',
          actorId: 'user-1',
          action: 'worker.update',
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
        },
        DIGITARO_TENANT_ID,
      );

      expect(qb.where).toHaveBeenCalledWith('auditLog.tenantId = :tenantId', {
        tenantId: DIGITARO_TENANT_ID,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'auditLog.entityType = :entityType',
        { entityType: 'worker' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('auditLog.actorId = :actorId', {
        actorId: 'user-1',
      });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.items).toEqual(entries);
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('defaults to page 1 / limit 25 when unset', async () => {
      const qb = buildQb([], 0);
      repository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list({}, DIGITARO_TENANT_ID);

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(25);
      expect(result.meta).toEqual({
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe('exportCsv', () => {
    it('scopes export to tenantId and includes only that tenant rows', async () => {
      const OTHER = 'b0000000-0000-4000-8000-000000000099';
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'a1',
            tenantId: DIGITARO_TENANT_ID,
            actorId: 'u1',
            action: 'worker.create',
            entityType: 'worker',
            entityId: 'w1',
            changes: { email: { old: null, new: 'a@digitaro.co' } },
            correlationId: null,
            ipAddress: null,
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
          },
        ]),
      };
      repository.createQueryBuilder.mockReturnValue(qb as never);

      const csv = await service.exportCsv({ entityType: 'worker' }, DIGITARO_TENANT_ID);

      expect(qb.where).toHaveBeenCalledWith('auditLog.tenantId = :tenantId', {
        tenantId: DIGITARO_TENANT_ID,
      });
      expect(qb.where).not.toHaveBeenCalledWith(
        'auditLog.tenantId = :tenantId',
        { tenantId: OTHER },
      );
      expect(qb.take).toHaveBeenCalledWith(AuditLogService.EXPORT_ROW_LIMIT);
      expect(csv).toContain('worker.create');
      expect(csv).toContain('email');
      expect(csv.split('\n')[0]).toContain('changesSummary');
    });
  });
});
