import { getMetadataArgsStorage } from 'typeorm';
import { CompensationRecordEntity } from '../entities/compensation-record.entity';
import { PayComponentEntity } from '../entities/pay-component.entity';
import {
  EmployeeBenefitStatus,
  ExportFileFormat,
  PayComponentType,
  PayFrequency,
  PayRunStatus,
  PayslipStatus,
  StatutoryRateUnit,
  StatutoryScheduleStatus,
} from '../enums/payroll.enum';
import { PayrollModule } from '../payroll.module';

describe('PayrollModule scaffold', () => {
  describe('enums', () => {
    it('exports PayComponentType values', () => {
      expect(Object.values(PayComponentType)).toEqual(
        expect.arrayContaining([
          'earning',
          'deduction',
          'employer_contribution',
        ]),
      );
    });

    it('exports PayFrequency values', () => {
      expect(Object.values(PayFrequency)).toEqual(
        expect.arrayContaining(['monthly', 'hourly', 'daily']),
      );
    });

    it('exports PayRunStatus values', () => {
      expect(Object.values(PayRunStatus)).toEqual(
        expect.arrayContaining([
          'draft',
          'review',
          'approved',
          'exported',
          'locked',
        ]),
      );
    });

    it('exports PayslipStatus values', () => {
      expect(Object.values(PayslipStatus)).toEqual(
        expect.arrayContaining(['draft', 'released']),
      );
    });

    it('exports StatutoryScheduleStatus values', () => {
      expect(Object.values(StatutoryScheduleStatus)).toEqual(
        expect.arrayContaining(['draft', 'active', 'superseded']),
      );
    });

    it('exports StatutoryRateUnit values', () => {
      expect(Object.values(StatutoryRateUnit)).toEqual(
        expect.arrayContaining(['percentage', 'fixed_amount']),
      );
    });

    it('exports EmployeeBenefitStatus values', () => {
      expect(Object.values(EmployeeBenefitStatus)).toEqual(
        expect.arrayContaining(['active', 'suspended', 'terminated', 'draft']),
      );
    });

    it('exports ExportFileFormat values', () => {
      expect(Object.values(ExportFileFormat)).toEqual(
        expect.arrayContaining(['xlsx', 'csv', 'pdf']),
      );
    });
  });

  describe('entities', () => {
    it('maps PayComponentEntity to pay_components table', () => {
      const table = getMetadataArgsStorage().tables.find(
        (t) => t.target === PayComponentEntity,
      );
      expect(table?.name).toBe('pay_components');
    });

    it('has unique index on tenantId and code for PayComponentEntity', () => {
      const index = getMetadataArgsStorage().indices.find(
        (i) => i.target === PayComponentEntity && i.unique,
      );
      expect(index?.columns).toEqual(['tenantId', 'code']);
    });

    it('maps CompensationRecordEntity to compensation_records table', () => {
      const table = getMetadataArgsStorage().tables.find(
        (t) => t.target === CompensationRecordEntity,
      );
      expect(table?.name).toBe('compensation_records');
    });

    it('has index on tenantId and workerId for CompensationRecordEntity', () => {
      const index = getMetadataArgsStorage().indices.find(
        (i) =>
          i.target === CompensationRecordEntity &&
          i.name === 'IDX_compensation_records_tenant_worker',
      );
      expect(index?.columns).toEqual(['tenantId', 'workerId']);
    });
  });

  describe('PayrollModule', () => {
    it('is defined', () => {
      expect(PayrollModule).toBeDefined();
    });
  });
});
