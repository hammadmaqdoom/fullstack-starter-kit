import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { CountryConfigService } from '@/modules/country-config/country-config.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue as QueueEnum } from '@/constants/job.constant';
import { Repository } from 'typeorm';
import { WorkerImportBatchEntity } from '../entities/worker-import-batch.entity';
import { WorkerEntity } from '../entities/worker.entity';
import { WorkerImportBatchStatus } from '../enums/worker-import.enum';
import { WorkerImportService } from '../worker-import.service';
import { WorkerService } from '../worker.service';

const VALID_ROW = {
  employmentTypeId: 'c0000000-0000-4000-8000-000000000001',
  countryCode: 'PK',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  startDate: '2026-01-01',
  statutoryFieldsJson: JSON.stringify({ cnic: '123', ntn: '456', eobi_number: '789' }),
};

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: Record<string, string>[]): string {
  const columns = Object.keys(rows[0]);
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvField(row[column] ?? '')).join(','));
  }
  return lines.join('\n');
}

describe('WorkerImportService', () => {
  let service: WorkerImportService;
  let batchRepository: jest.Mocked<
    Pick<Repository<WorkerImportBatchEntity>, 'create' | 'save' | 'findOne' | 'find'>
  >;
  let workerRepository: jest.Mocked<Pick<Repository<WorkerEntity>, 'find'>>;
  let countryConfigService: jest.Mocked<
    Pick<CountryConfigService, 'resolveEmploymentTypeCountryRules'>
  >;
  let workerService: jest.Mocked<Pick<WorkerService, 'create' | 'update'>>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'append'>>;
  let queueAdd: jest.Mock;

  beforeEach(async () => {
    batchRepository = {
      create: jest.fn((entity) => entity as WorkerImportBatchEntity),
      save: jest.fn(
        async (entity) => ({ ...entity, id: 'batch-1' }) as WorkerImportBatchEntity,
      ),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    } as unknown as typeof batchRepository;

    workerRepository = { find: jest.fn().mockResolvedValue([]) };

    countryConfigService = {
      resolveEmploymentTypeCountryRules: jest.fn().mockResolvedValue({
        employmentType: { code: 'FULL_TIME' },
      }),
    };

    workerService = {
      create: jest.fn().mockResolvedValue({ id: 'worker-1' }),
      update: jest.fn().mockResolvedValue({ id: 'worker-2' }),
    };

    auditLogService = { append: jest.fn() };
    queueAdd = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerImportService,
        { provide: getRepositoryToken(WorkerImportBatchEntity), useValue: batchRepository },
        { provide: getRepositoryToken(WorkerEntity), useValue: workerRepository },
        { provide: CountryConfigService, useValue: countryConfigService },
        { provide: WorkerService, useValue: workerService },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: getQueueToken(QueueEnum.CoreHr), useValue: { add: queueAdd } },
      ],
    }).compile();

    service = module.get(WorkerImportService);
  });

  describe('preview', () => {
    it('marks a well-formed row as valid and destined for create', async () => {
      const result = await service.preview(toCsv([VALID_ROW]));

      expect(result.totalRows).toBe(1);
      expect(result.validCount).toBe(1);
      expect(result.rows[0]?.action).toBe('create');
    });

    it('flags missing required fields', async () => {
      const result = await service.preview(toCsv([{ ...VALID_ROW, firstName: '' }]));

      expect(result.invalidCount).toBe(1);
      expect(result.rows[0]?.errors).toContain('firstName is required');
    });

    it('flags duplicate emails within the same file', async () => {
      const result = await service.preview(toCsv([VALID_ROW, VALID_ROW]));

      expect(result.invalidCount).toBe(2);
      expect(result.rows[0]?.errors.some((e) => e.includes('duplicated'))).toBe(true);
    });

    it('flags missing statutory fields for the country', async () => {
      const result = await service.preview(
        toCsv([{ ...VALID_ROW, statutoryFieldsJson: '{}' }]),
      );

      expect(result.invalidCount).toBe(1);
      expect(result.rows[0]?.errors.some((e) => e.includes('statutory fields'))).toBe(true);
    });

    it('marks a row as update when the email matches an existing worker', async () => {
      workerRepository.find.mockResolvedValue([
        { id: 'existing-worker', email: VALID_ROW.email } as WorkerEntity,
      ]);

      const result = await service.preview(toCsv([VALID_ROW]));

      expect(result.rows[0]?.action).toBe('update');
      expect(result.rows[0]?.existingWorkerId).toBe('existing-worker');
    });

    it('throws on an empty CSV', async () => {
      await expect(service.preview('firstName,lastName')).rejects.toThrow();
    });
  });

  describe('enqueueImport', () => {
    it('creates a batch and enqueues a BullMQ job', async () => {
      const batch = await service.enqueueImport(
        toCsv([VALID_ROW]),
        'ops-user',
        'workers.csv',
      );

      expect(batch.id).toBe('batch-1');
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'worker_import_batch.create' }),
      );
      expect(queueAdd).toHaveBeenCalledWith(
        'import-workers',
        expect.objectContaining({ batchId: 'batch-1' }),
      );
    });
  });

  describe('processBatch', () => {
    it('creates valid rows, marks the batch completed, and audits per row', async () => {
      batchRepository.findOne.mockResolvedValue({
        id: 'batch-1',
        tenantId: DIGITARO_TENANT_ID,
        status: WorkerImportBatchStatus.PENDING,
        rows: [VALID_ROW],
        totalRows: 1,
      } as unknown as WorkerImportBatchEntity);

      await service.processBatch('batch-1', DIGITARO_TENANT_ID, 'ops-user');

      expect(workerService.create).toHaveBeenCalled();
      const saved = batchRepository.save.mock.calls.at(-1)?.[0] as WorkerImportBatchEntity;
      expect(saved.status).toBe(WorkerImportBatchStatus.COMPLETED);
      expect(saved.successCount).toBe(1);
      expect(saved.failureCount).toBe(0);
    });

    it('records failed rows without throwing and marks the batch completed_with_errors', async () => {
      batchRepository.findOne.mockResolvedValue({
        id: 'batch-1',
        tenantId: DIGITARO_TENANT_ID,
        status: WorkerImportBatchStatus.PENDING,
        rows: [{ ...VALID_ROW, firstName: '' }],
        totalRows: 1,
      } as unknown as WorkerImportBatchEntity);

      await service.processBatch('batch-1', DIGITARO_TENANT_ID, 'ops-user');

      expect(workerService.create).not.toHaveBeenCalled();
      const saved = batchRepository.save.mock.calls.at(-1)?.[0] as WorkerImportBatchEntity;
      expect(saved.status).toBe(WorkerImportBatchStatus.COMPLETED_WITH_ERRORS);
      expect(saved.failureCount).toBe(1);
      expect(auditLogService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'worker_import_batch.row_failed' }),
      );
    });
  });
});
