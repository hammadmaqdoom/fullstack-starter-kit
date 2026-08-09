import { ComplianceControlSeedService } from '../compliance-control-seed.service';
import { SEED_CONTROLS } from '../constants/compliance-controls.seed';

describe('ComplianceControlSeedService', () => {
  const tenantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const tenantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  function createService() {
    const programmes = new Map<string, { tenantId: string }>();
    const controls = new Map<string, { id: string; tenantId: string; code: string }>();
    const maps = new Map<string, unknown>();

    const programmeRepository = {
      findOne: jest.fn(async ({ where }: { where: { tenantId: string } }) =>
        programmes.get(where.tenantId) ?? null,
      ),
      create: jest.fn((row: { tenantId: string }) => row),
      save: jest.fn(async (row: { tenantId: string }) => {
        programmes.set(row.tenantId, row);
        return row;
      }),
    };

    const controlRepository = {
      findOne: jest.fn(
        async ({ where }: { where: { tenantId: string; code: string } }) =>
          controls.get(`${where.tenantId}:${where.code}`) ?? null,
      ),
      create: jest.fn((row: { tenantId: string; code: string }) => ({
        ...row,
        id: `${row.tenantId}-${row.code}`,
      })),
      save: jest.fn(
        async (row: { id: string; tenantId: string; code: string }) => {
          controls.set(`${row.tenantId}:${row.code}`, row);
          return row;
        },
      ),
    };

    const mapRepository = {
      findOne: jest.fn(async ({ where }: { where: Record<string, string> }) => {
        const key = `${where.tenantId}:${where.controlId}:${where.framework}:${where.externalRef}`;
        return maps.get(key) ?? null;
      }),
      create: jest.fn((row: Record<string, string>) => row),
      save: jest.fn(async (row: Record<string, string>) => {
        const key = `${row.tenantId}:${row.controlId}:${row.framework}:${row.externalRef}`;
        maps.set(key, row);
        return row;
      }),
    };

    const service = new ComplianceControlSeedService(
      programmeRepository as never,
      controlRepository as never,
      mapRepository as never,
    );

    return { service, programmes, controls, maps, controlRepository };
  }

  it('seeds programme and controls for a tenant idempotently', async () => {
    const { service, programmes, controls, controlRepository } = createService();

    await service.ensureSeeded(tenantA);
    await service.ensureSeeded(tenantA);

    expect(programmes.size).toBe(1);
    expect(controls.size).toBe(SEED_CONTROLS.length);
    expect(controlRepository.save).toHaveBeenCalledTimes(SEED_CONTROLS.length);
  });

  it('seeds separate rows for two tenants', async () => {
    const { service, programmes, controls } = createService();

    await service.ensureSeeded(tenantA);
    await service.ensureSeeded(tenantB);

    expect(programmes.size).toBe(2);
    expect(controls.size).toBe(SEED_CONTROLS.length * 2);
    expect(controls.has(`${tenantA}:POL-ACK-CURRENT`)).toBe(true);
    expect(controls.has(`${tenantB}:POL-ACK-CURRENT`)).toBe(true);
  });
});
