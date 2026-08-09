import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { LeaveService } from '../leave.service';

describe('LeaveService listTypes tenancy', () => {
  it('queries leave types filtered by tenantId', async () => {
    const getMany = jest.fn().mockResolvedValue([]);
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany,
    };
    const leaveTypeRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    const workerRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const service = new LeaveService(
      {} as never,
      {} as never,
      leaveTypeRepository as never,
      {} as never,
      workerRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.listTypes('actor-1', DIGITARO_TENANT_ID);

    expect(leaveTypeRepository.createQueryBuilder).toHaveBeenCalledWith(
      'leaveType',
    );
    expect(qb.where).toHaveBeenCalledWith('leaveType.tenantId = :tenantId', {
      tenantId: DIGITARO_TENANT_ID,
    });
    expect(getMany).toHaveBeenCalled();
  });
});
