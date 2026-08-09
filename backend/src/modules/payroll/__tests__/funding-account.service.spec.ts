import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FundingAccountEntity } from '../entities/funding-account.entity';
import { FundingAccountProvider } from '../enums/payout.enum';
import { FundingAccountService } from '../funding-account.service';

describe('FundingAccountService', () => {
  let service: FundingAccountService;
  let save: jest.Mock;
  let create: jest.Mock;
  let find: jest.Mock;
  let auditAppend: jest.Mock;
  let getAuthContext: jest.Mock;

  const actor = {
    userId: 'u1',
    tenantId: DIGITARO_TENANT_ID,
  };

  beforeEach(async () => {
    save = jest.fn(async (row) => ({ id: 'fa1', ...row }));
    create = jest.fn((row) => row);
    find = jest.fn();
    auditAppend = jest.fn();
    getAuthContext = jest.fn().mockResolvedValue({
      tenantId: DIGITARO_TENANT_ID,
      roleCodes: [PolarisRoleCode.FINANCE],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundingAccountService,
        {
          provide: getRepositoryToken(FundingAccountEntity),
          useValue: { save, create, find, findOne: jest.fn() },
        },
        { provide: AuditLogService, useValue: { append: auditAppend } },
        { provide: RbacService, useValue: { getAuthContext } },
      ],
    }).compile();

    service = module.get(FundingAccountService);
  });

  it('creates manual_bank funding account with bankDetails and audits', async () => {
    const saved = await service.create(
      {
        legalEntityId: 'le-pk',
        provider: FundingAccountProvider.MANUAL_BANK,
        currency: 'PKR',
        label: 'PK Payroll — HBL',
        bankDetails: { accountNumber: '123', iban: 'PK00' },
      },
      actor,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: FundingAccountProvider.MANUAL_BANK,
        bankDetails: { accountNumber: '123', iban: 'PK00' },
      }),
    );
    expect(auditAppend).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'funding_account.create' }),
    );
    expect(saved.label).toBe('PK Payroll — HBL');
  });

  it('redacts bankDetails for non-finance roles', () => {
    const dto = service.toPublicDto(
      {
        id: 'fa1',
        legalEntityId: 'le',
        provider: FundingAccountProvider.MANUAL_BANK,
        currency: 'PKR',
        label: 'HBL',
        externalAccountId: null,
        bankDetails: { iban: 'secret' },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as FundingAccountEntity,
      [PolarisRoleCode.PEOPLE_OPS],
    );
    expect(dto.bankDetails).toBeNull();
    expect(dto.bankDetailsRedacted).toBe(true);
  });
});
