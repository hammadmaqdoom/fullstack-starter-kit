import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { PayrollReportService } from '../payroll-report.service';

describe('PayrollReportService', () => {
  let service: PayrollReportService;
  let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;

  const payRunId = 'pr000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollReportService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(PayrollReportService);
  });

  describe('register', () => {
    it('filters by payRunId, legalEntityId and period when provided', async () => {
      dataSource.query.mockResolvedValue([]);

      await service.register({
        payRunId,
        legalEntityId: 'le000000-0000-4000-8000-000000000001',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
      });

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('pr.id = $2'),
        [
          expect.any(String),
          payRunId,
          'le000000-0000-4000-8000-000000000001',
          '2026-07-01',
          '2026-07-31',
        ],
      );
    });

    it('applies only the tenant filter when no query params are given', async () => {
      dataSource.query.mockResolvedValue([]);

      await service.register({});

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        [expect.any(String)],
      );
    });
  });

  describe('deductions', () => {
    it('expands calculationSnapshot employeeDeductions per worker', async () => {
      dataSource.query.mockResolvedValue([
        { workerId: 'w-1', deductionCode: 'TAX', amount: 100 },
      ]);

      const result = await service.deductions({ payRunId });

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('jsonb_array_elements'),
        expect.arrayContaining([payRunId]),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('variance', () => {
    it('returns the comparison row for the given pay run', async () => {
      dataSource.query.mockResolvedValue([
        {
          payRunId,
          currentGross: 10000,
          priorGross: 9000,
          grossVariancePercent: 11.11,
        },
      ]);

      const result = await service.variance(payRunId);

      expect(result).toEqual(
        expect.objectContaining({ payRunId, grossVariancePercent: 11.11 }),
      );
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([payRunId]),
      );
    });

    it('throws NotFoundException when the pay run does not exist', async () => {
      dataSource.query.mockResolvedValue([]);

      await expect(service.variance(payRunId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
