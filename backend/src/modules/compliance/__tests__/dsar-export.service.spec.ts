import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { AuditLogService } from '../audit-log.service';
import { DsarExportService } from '../dsar-export.service';
import { AuditLogEntity } from '../entities/audit-log.entity';

describe('DsarExportService', () => {
  let service: DsarExportService;
  let auditLogRepository: jest.Mocked<Pick<Repository<AuditLogEntity>, 'createQueryBuilder'>>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;

  const workerId = 'w0000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    auditLogRepository = { createQueryBuilder: jest.fn() };
    auditLogService = { append: jest.fn() };
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DsarExportService,
        { provide: getRepositoryToken(AuditLogEntity), useValue: auditLogRepository },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(DsarExportService);
  });

  it('builds the export package from profile, documents, payslips and audit trail', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ id: workerId, firstName: 'Ada', lastName: 'Lovelace' }])
      .mockResolvedValueOnce([{ id: 'doc-1', status: 'issued' }])
      .mockResolvedValueOnce([{ id: 'payslip-1', netPay: '5000.00' }]);

    const auditQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { action: 'worker.create', entityType: 'worker', createdAt: new Date(), changes: {} },
      ]),
    } as unknown as SelectQueryBuilder<AuditLogEntity>;
    auditLogRepository.createQueryBuilder.mockReturnValue(auditQb);

    const result = await service.exportForWorker(
      { workerId, reason: 'employee request' },
      'ops-user',
    );

    expect(result.profile.firstName).toBe('Ada');
    expect(result.documents).toHaveLength(1);
    expect(result.payslips).toHaveLength(1);
    expect(result.auditTrail).toHaveLength(1);
    expect(auditLogService.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'dsar.export', entityId: workerId }),
    );
  });

  it('throws when the worker does not exist', async () => {
    dataSource.query.mockResolvedValueOnce([]);

    await expect(
      service.exportForWorker({ workerId }, 'ops-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
