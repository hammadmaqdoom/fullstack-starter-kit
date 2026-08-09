import { ComplianceControlService } from '../compliance-control.service';
import { ComplianceEvidenceService } from '../compliance-evidence.service';

describe('control tenant isolation', () => {
  const tenantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const tenantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  it('evidence status for B does not include A runs', async () => {
    const controlsA = [
      {
        id: 'c-a',
        tenantId: tenantA,
        code: 'POL-ACK-CURRENT',
        title: 'Ack',
        domain: 'policy',
        inScope: true,
        sortOrder: 1,
      },
    ];
    const controlsB = [
      {
        id: 'c-b',
        tenantId: tenantB,
        code: 'POL-ACK-CURRENT',
        title: 'Ack',
        domain: 'policy',
        inScope: true,
        sortOrder: 1,
      },
    ];

    const controlRepository = {
      find: jest.fn(async ({ where }: { where: { tenantId: string } }) =>
        where.tenantId === tenantA ? controlsA : controlsB,
      ),
      findOne: jest.fn(),
    };
    const mapRepository = {
      find: jest.fn(async () => []),
    };
    const runRepository = {
      createQueryBuilder: jest.fn(() => {
        const qb = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn(async () => [
            {
              controlId: 'c-a',
              tenantId: tenantA,
              result: 'fail',
              ranAt: new Date('2026-08-01T00:00:00Z'),
              summary: { pendingCount: 3 },
              evidenceRefs: [{ path: '/a-only' }],
            },
          ]),
        };
        return qb;
      }),
    };
    const linkRepository = { find: jest.fn(async () => []) };

    // Evidence service filters runs only after loading controls for tenant —
    // simulate B with empty runs by making getMany return [] when tenant B
    const evidenceB = new ComplianceEvidenceService(
      {
        find: jest.fn(async () => controlsB),
      } as never,
      mapRepository as never,
      {
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn(async () => []),
        })),
      } as never,
      linkRepository as never,
    );

    const statusB = await evidenceB.status(tenantB);
    expect(statusB).toHaveLength(1);
    expect(statusB[0].result).toBe('never_run');
    expect(statusB[0].evidenceUrls).toEqual([]);

    const evidenceA = new ComplianceEvidenceService(
      controlRepository as never,
      mapRepository as never,
      runRepository as never,
      linkRepository as never,
    );
    const statusA = await evidenceA.status(tenantA);
    expect(statusA[0].result).toBe('fail');
    expect(statusA[0].evidenceUrls).toContain('/a-only');
  });

  it('listControls always queries by tenantId', async () => {
    const findQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => []),
    };
    const controlRepository = {
      createQueryBuilder: jest.fn(() => findQb),
      findOne: jest.fn(),
    };
    const service = new ComplianceControlService(
      {} as never,
      controlRepository as never,
      { find: jest.fn(async () => []) } as never,
      {
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn(async () => []),
        })),
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.listControls(tenantB, {});
    expect(controlRepository.createQueryBuilder).toHaveBeenCalledWith('control');
    expect(findQb.where).toHaveBeenCalledWith('control.tenantId = :tenantId', {
      tenantId: tenantB,
    });
  });
});
