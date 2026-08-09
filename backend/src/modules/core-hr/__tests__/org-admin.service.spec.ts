import { NotFoundException } from '@nestjs/common';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { OrgAdminService } from '../org-admin.service';

describe('OrgAdminService', () => {
  it('lists divisions for tenant only', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const service = new OrgAdminService(
      { find, findOne: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
      { find, findOne: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
      { find, findOne: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
      { find, findOne: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
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
      { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
      { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
      { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
      { append: jest.fn() } as never,
    );

    await expect(service.getDivision('div-1', OTHER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
