import { Job as JobEnum } from '@/constants/job.constant';
import { ComplianceAlertScannerService } from '@/modules/automation/compliance-alert-scanner.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Test, TestingModule } from '@nestjs/testing';
import type { Job } from 'bullmq';
import { ComplianceAlertProcessor } from '../compliance-alert.processor';

describe('ComplianceAlertProcessor', () => {
  let processor: ComplianceAlertProcessor;
  let scannerService: { scan: jest.Mock };

  beforeEach(async () => {
    scannerService = {
      scan: jest.fn().mockResolvedValue({ evaluated: 2, created: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceAlertProcessor,
        { provide: ComplianceAlertScannerService, useValue: scannerService },
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

  it('ignores unrelated job names', async () => {
    const job = { id: 'job-2', name: 'not-scan-alerts', data: {} } as Job;

    const result = await processor.process(job);

    expect(scannerService.scan).not.toHaveBeenCalled();
    expect(result).toEqual({ alerts: 0 });
  });
});
