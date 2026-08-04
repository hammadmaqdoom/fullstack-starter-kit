import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import { OrgService } from '@/modules/core-hr/org.service';
import { PolicyService } from '@/modules/documents/policy.service';
import { HubService } from '@/modules/operations/hub.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ShellSearchService } from '../shell-search.service';

function authContext(
  roleCodes: PolarisRoleCode[],
  userId = 'u1',
): PolarisAuthContext {
  return {
    tenantId: DIGITARO_TENANT_ID,
    userId,
    roleCodes,
    assignments: [],
    broadestScope: ScopeType.OWN,
  };
}

describe('ShellSearchService.search', () => {
  let service: ShellSearchService;
  let rbac: { getAuthContext: jest.Mock };
  let org: { getDirectory: jest.Mock };
  let hub: { getInbox: jest.Mock };
  let policies: { list: jest.Mock };

  beforeEach(async () => {
    rbac = { getAuthContext: jest.fn() };
    org = { getDirectory: jest.fn() };
    hub = { getInbox: jest.fn() };
    policies = { list: jest.fn() };

    rbac.getAuthContext.mockResolvedValue(
      authContext([PolarisRoleCode.EMPLOYEE]),
    );
    org.getDirectory.mockResolvedValue({ items: [], meta: {} });
    hub.getInbox.mockResolvedValue({
      data: { mine: [], forMe: [] },
      meta: { page: 1, limit: 10, total: 0 },
      errors: [],
    });
    policies.list.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShellSearchService,
        { provide: RbacService, useValue: rbac },
        { provide: OrgService, useValue: org },
        { provide: HubService, useValue: hub },
        { provide: PolicyService, useValue: policies },
      ],
    }).compile();

    service = module.get(ShellSearchService);
  });

  it('browse mode (empty q) returns only action + module hits', async () => {
    const hits = await service.search('u1', '', 20);
    expect(hits.every((h) => h.type === 'action' || h.type === 'module')).toBe(
      true,
    );
    expect(org.getDirectory).not.toHaveBeenCalled();
  });

  it('full search includes scoped workers', async () => {
    org.getDirectory.mockResolvedValue({
      items: [
        {
          id: 'w1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
        },
      ],
      meta: { page: 1, limit: 10, total: 1 },
    });

    const hits = await service.search('u1', 'ada', 20);
    expect(hits.some((h) => h.type === 'worker' && h.id === 'w1')).toBe(true);
  });

  it('filters action catalog by role (no setup action for employee)', async () => {
    const hits = await service.search('u1', '', 50);
    expect(hits.some((h) => h.id === 'action:setup')).toBe(false);
  });
});
