import { ConflictException, NotFoundException } from '@nestjs/common';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { LeaveAccrualMethod } from '@/modules/country-config/enums/setup-wizard.enum';
import { LeaveAdminService } from '../leave-admin.service';

describe('LeaveAdminService', () => {
  const OTHER_TENANT = 'b0000000-0000-4000-8000-000000000099';

  function buildService(overrides?: {
    leaveTypeRepo?: Partial<Record<string, jest.Mock>>;
    calendarRepo?: Partial<Record<string, jest.Mock>>;
    holidayRepo?: Partial<Record<string, jest.Mock>>;
    audit?: { append: jest.Mock };
  }) {
    const leaveTypeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'lt-1', ...x })),
      ...overrides?.leaveTypeRepo,
    };
    const calendarRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'cal-1', ...x })),
      ...overrides?.calendarRepo,
    };
    const holidayRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'hol-1', ...x })),
      ...overrides?.holidayRepo,
    };
    const audit = overrides?.audit ?? { append: jest.fn() };

    const service = new LeaveAdminService(
      leaveTypeRepo as never,
      calendarRepo as never,
      holidayRepo as never,
      audit as never,
    );

    return { service, leaveTypeRepo, calendarRepo, holidayRepo, audit };
  }

  it('lists leave types filtered by tenantId', async () => {
    const { service, leaveTypeRepo } = buildService();

    await service.listLeaveTypes(DIGITARO_TENANT_ID);

    expect(leaveTypeRepo.find).toHaveBeenCalledWith({
      where: { tenantId: DIGITARO_TENANT_ID },
      order: { countryCode: 'ASC', name: 'ASC' },
    });
  });

  it('creates leave type with tenant + audit', async () => {
    const { service, leaveTypeRepo, audit } = buildService();

    const row = await service.createLeaveType(
      {
        countryCode: 'PK',
        code: 'ANNUAL',
        name: 'Annual leave',
        accrualMethod: LeaveAccrualMethod.ANNUAL,
        daysPerYear: 20,
        carryForwardCap: 5,
      },
      'actor-1',
      DIGITARO_TENANT_ID,
    );

    expect(leaveTypeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: DIGITARO_TENANT_ID,
        countryCode: 'PK',
        code: 'ANNUAL',
        daysPerYear: '20',
        carryForwardCap: '5',
      }),
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'leave_type.create',
        entityType: 'leave_type',
        entityId: row.id,
        tenantId: DIGITARO_TENANT_ID,
      }),
    );
  });

  it('rejects create when code already exists for country', async () => {
    const { service } = buildService({
      leaveTypeRepo: {
        findOne: jest.fn().mockResolvedValue({ id: 'existing' }),
      },
    });

    await expect(
      service.createLeaveType(
        { countryCode: 'PK', code: 'ANNUAL', name: 'Annual' },
        'actor-1',
        DIGITARO_TENANT_ID,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects getLeaveType for wrong tenant', async () => {
    const { service } = buildService({
      leaveTypeRepo: {
        findOne: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.getLeaveType('lt-1', OTHER_TENANT),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists holiday calendars for tenant only', async () => {
    const { service, calendarRepo } = buildService();

    await service.listHolidayCalendars(DIGITARO_TENANT_ID);

    expect(calendarRepo.find).toHaveBeenCalledWith({
      where: { tenantId: DIGITARO_TENANT_ID },
      relations: ['holidays'],
      order: { countryCode: 'ASC', effectiveYear: 'DESC' },
    });
  });
});
