import { Job as JobEnum } from '@/constants/job.constant';
import { ComplianceAlertScannerService } from '@/modules/automation/compliance-alert-scanner.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { ControlTestRunnerService } from '@/modules/compliance/control-test-runner.service';
import { Test, TestingModule } from '@nestjs/testing';
import type { Job } from 'bullmq';
import { ComplianceAlertProcessor } from '../compliance-alert.processor';

describe('ComplianceAlertProcessor', () => {
  let processor: ComplianceAlertProcessor;
  let scannerService: { scan: jest.Mock };
  let controlTestRunner: { runScheduledForAllTenants: jest.Mock };

  beforeEach(async () => {
    scannerService = {
      scan: jest.fn().mockResolvedValue({ evaluated: 2, created: 1 }),
    };
    controlTestRunner = {
      runScheduledForAllTenants: jest.fn().mockResolvedValue(5),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceAlertProcessor,
        { provide: ComplianceAlertScannerService, useValue: scannerService },
        { provide: ControlTestRunnerService, useValue: controlTestRunner },
      ],
    }).compile();

    processor = module.get(ComplianceAlertProcessor);
  });

  it('runs the scanner for the job tenant and returns the created count', async () => {
    const job = {
      id: 'job-1',
      name: JobEnum.Compliance.ScanAlerts,
      data: { tenantId: DIGITARO_TENANT_ID },
    } as Job;

    const result = await processor.process(job);

    expect(scannerService.scan).toHaveBeenCalledWith(DIGITARO_TENANT_ID);
    expect(result).toEqual({ alerts: 1 });
  });

  it('runs control tests for all tenants', async () => {
    const job = {
      id: 'job-3',
      name: JobEnum.Compliance.ScanControlTests,
      data: {},
    } as Job;

    const result = await processor.process(job);

    expect(controlTestRunner.runScheduledForAllTenants).toHaveBeenCalled();
    expect(result).toEqual({ controlRuns: 5 });
  });

  it('ignores unrelated job names', async () => {
    const job = { id: 'job-2', name: 'not-scan-alerts', data: {} } as Job;

    const result = await processor.process(job);

    expect(scannerService.scan).not.toHaveBeenCalled();
    expect(result).toEqual({ alerts: 0 });
  });
});
