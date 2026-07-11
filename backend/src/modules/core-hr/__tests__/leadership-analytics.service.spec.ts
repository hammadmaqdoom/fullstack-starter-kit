import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { LeadershipAnalyticsService } from '../leadership-analytics.service';

describe('LeadershipAnalyticsService', () => {
  let service: LeadershipAnalyticsService;
  let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadershipAnalyticsService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(LeadershipAnalyticsService);
  });

  it('groups headcount by legal entity, division and location', async () => {
    dataSource.query.mockResolvedValue([
      { legalEntityCode: 'DIGI-PK', divisionName: 'Engineering', location: 'PK', headcount: 42 },
    ]);

    const result = await service.headcountByEntity();

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM workers w'),
      expect.any(Array),
    );
    expect(result).toEqual([
      { legalEntityCode: 'DIGI-PK', divisionName: 'Engineering', location: 'PK', headcount: 42 },
    ]);
  });

  it('computes attrition trend joined against legal entity code', async () => {
    dataSource.query.mockResolvedValue([]);

    await service.attritionByEntity();

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('separations'),
      expect.any(Array),
    );
  });

  it('defaults leave liability to the current year when not provided', async () => {
    dataSource.query.mockResolvedValue([]);
    const currentYear = new Date().getUTCFullYear();

    await service.leaveLiabilityByEntity();

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([currentYear]),
    );
  });

  it('buckets visa pipeline expiries into 30/60/90 day windows', async () => {
    dataSource.query.mockResolvedValue([]);

    await service.visaPipelineByEntity();

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('expiringWithin30Days'),
      expect.any(Array),
    );
  });
});
