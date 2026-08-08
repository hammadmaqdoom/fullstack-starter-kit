import { EntityManager } from 'typeorm';
import { DocumentNumberService } from '../document-number.service';

describe('DocumentNumberService', () => {
  let service: DocumentNumberService;
  let manager: jest.Mocked<Pick<EntityManager, 'query'>>;

  beforeEach(() => {
    service = new DocumentNumberService();
    manager = { query: jest.fn() };
  });

  it('formats {ENTITY_CODE}-{TYPE}-{YYYY}-{SEQ} using the atomic sequence result', async () => {
    manager.query.mockResolvedValue([{ lastSeq: 42 }]);

    const result = await service.next(manager as unknown as EntityManager, {
      tenantId: 'tenant-1',
      legalEntityId: 'entity-1',
      legalEntityCode: 'DIGITARO_LABS_PK',
      documentType: 'offer_letter',
      issuedAt: new Date('2026-07-10T00:00:00Z'),
    });

    expect(result).toBe('DIGITARO_LABS_PK-OFR-2026-0042');
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT'),
      ['tenant-1', 'entity-1', 'offer_letter', 2026],
    );
  });

  it('pads sequence numbers to 4 digits', async () => {
    manager.query.mockResolvedValue([{ lastSeq: 7 }]);

    const result = await service.next(manager as unknown as EntityManager, {
      tenantId: 'tenant-1',
      legalEntityId: 'entity-1',
      legalEntityCode: 'DIGITARO_STUDIO_UAE',
      documentType: 'sow',
      issuedAt: new Date('2026-01-01T00:00:00Z'),
    });

    expect(result).toBe('DIGITARO_STUDIO_UAE-SOW-2026-0007');
  });

  it('falls back to an uppercased 3-letter type code for unmapped document types', async () => {
    manager.query.mockResolvedValue([{ lastSeq: 1 }]);

    const result = await service.next(manager as unknown as EntityManager, {
      tenantId: 'tenant-1',
      legalEntityId: 'entity-1',
      legalEntityCode: 'DIGITARO_SG',
      documentType: 'increment_letter',
      issuedAt: new Date('2026-03-01T00:00:00Z'),
    });

    expect(result).toBe('DIGITARO_SG-INC-2026-0001');
  });

  it('defaults the year to the current UTC year when issuedAt is omitted', async () => {
    manager.query.mockResolvedValue([{ lastSeq: 1 }]);
    const expectedYear = new Date().getUTCFullYear();

    await service.next(manager as unknown as EntityManager, {
      tenantId: 'tenant-1',
      legalEntityId: 'entity-1',
      legalEntityCode: 'DIGITARO_LABS_PK',
      documentType: 'nda',
    });

    expect(manager.query).toHaveBeenCalledWith(expect.any(String), [
      'tenant-1',
      'entity-1',
      'nda',
      expectedYear,
    ]);
  });
});
