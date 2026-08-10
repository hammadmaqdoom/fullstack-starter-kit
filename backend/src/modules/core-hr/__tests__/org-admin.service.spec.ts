import { NotFoundException } from '@nestjs/common';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { OrgAdminService } from '../org-admin.service';

function emptyRepo() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 'new-id', ...x })),
  };
}

describe('OrgAdminService', () => {
  it('lists divisions for tenant only', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const service = new OrgAdminService(
      { find, findOne: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
      emptyRepo() as never,
      emptyRepo() as never,
      emptyRepo() as never,
      emptyRepo() as never,
      emptyRepo() as never,
      emptyRepo() as never,
      { append: jest.fn() } as never,
    );

    await service.listDivisions(DIGITARO_TENANT_ID);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: DIGITARO_TENANT_ID },
        order: { name: 'ASC' },
      }),
    );
  });

  it('rejects getDivision for wrong tenant', async () => {
    const OTHER = 'b0000000-0000-4000-8000-000000000099';
    const findOne = jest.fn().mockResolvedValue(null);
    const service = new OrgAdminService(
      { find: jest.fn(), findOne, create: jest.fn(), save: jest.fn() } as never,
      emptyRepo() as never,
      emptyRepo() as never,
      emptyRepo() as never,
      emptyRepo() as never,
      emptyRepo() as never,
      emptyRepo() as never,
      { append: jest.fn() } as never,
    );

    await expect(service.getDivision('div-1', OTHER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates division mapping with parent legal entity tenant', async () => {
    const leId = 'a0000000-0000-4000-8000-000000000001';
    const append = jest.fn();
    const mappingRepo = emptyRepo();
    const leRepo = {
      find: jest.fn(),
      findOne: jest.fn().mockResolvedValue({
        id: leId,
        tenantId: DIGITARO_TENANT_ID,
      }),
      create: jest.fn(),
      save: jest.fn(),
    };

    const service = new OrgAdminService(
      emptyRepo() as never,
      emptyRepo() as never,
      leRepo as never,
      emptyRepo() as never,
      mappingRepo as never,
      emptyRepo() as never,
      emptyRepo() as never,
      { append } as never,
    );

    await service.createLegalEntityMapping(
      leId,
      {
        countryCode: 'pk',
        effectiveFrom: '2026-01-01',
      },
      'actor-1',
      DIGITARO_TENANT_ID,
    );

    expect(mappingRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: DIGITARO_TENANT_ID,
        legalEntityId: leId,
        countryCode: 'PK',
      }),
    );
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'legal_entity_division_mapping.create',
        tenantId: DIGITARO_TENANT_ID,
      }),
    );
  });

  it('rejects mapping create when legal entity is missing for tenant', async () => {
    const leRepo = {
      find: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new OrgAdminService(
      emptyRepo() as never,
      emptyRepo() as never,
      leRepo as never,
      emptyRepo() as never,
      emptyRepo() as never,
      emptyRepo() as never,
      emptyRepo() as never,
      { append: jest.fn() } as never,
    );

    await expect(
      service.createLegalEntityMapping(
        'missing',
        { countryCode: 'PK', effectiveFrom: '2026-01-01' },
        'actor-1',
        DIGITARO_TENANT_ID,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
