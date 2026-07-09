import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { CountryConfigService } from '@/modules/country-config/country-config.service';
import { CountryConfigEntity } from '@/modules/country-config/entities/country-config.entity';
import { CountryCurrencyConfigEntity } from '@/modules/country-config/entities/country-currency-config.entity';
import { EmploymentTypeCountryConfigEntity } from '@/modules/country-config/entities/employment-type-country-config.entity';
import { EmploymentTypeEntity } from '@/modules/country-config/entities/employment-type.entity';
import { PayrollRoute } from '@/modules/country-config/enums/country-config.enum';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('CountryConfigService', () => {
  let service: CountryConfigService;
  let countryRepository: jest.Mocked<
    Pick<Repository<CountryConfigEntity>, 'find' | 'findOne'>
  >;
  let employmentTypeRepository: jest.Mocked<
    Pick<Repository<EmploymentTypeEntity>, 'find'>
  >;
  let matrixRepository: jest.Mocked<
    Pick<Repository<EmploymentTypeCountryConfigEntity>, 'find' | 'findOne'>
  >;
  let countryCurrencyRepository: jest.Mocked<
    Pick<Repository<CountryCurrencyConfigEntity>, 'findOne'>
  >;

  beforeEach(async () => {
    countryRepository = { find: jest.fn(), findOne: jest.fn() };
    employmentTypeRepository = { find: jest.fn() };
    matrixRepository = { find: jest.fn(), findOne: jest.fn() };
    countryCurrencyRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountryConfigService,
        {
          provide: getRepositoryToken(CountryConfigEntity),
          useValue: countryRepository,
        },
        {
          provide: getRepositoryToken(EmploymentTypeEntity),
          useValue: employmentTypeRepository,
        },
        {
          provide: getRepositoryToken(EmploymentTypeCountryConfigEntity),
          useValue: matrixRepository,
        },
        {
          provide: getRepositoryToken(CountryCurrencyConfigEntity),
          useValue: countryCurrencyRepository,
        },
      ],
    }).compile();

    service = module.get(CountryConfigService);
  });

  it('lists active countries for the tenant', async () => {
    const countries = [
      { id: '1', tenantId: DIGITARO_TENANT_ID, countryCode: 'PK' },
    ] as CountryConfigEntity[];
    countryRepository.find.mockResolvedValue(countries);

    await expect(service.listCountries()).resolves.toEqual(countries);
    expect(countryRepository.find).toHaveBeenCalledWith({
      where: { tenantId: DIGITARO_TENANT_ID, isActive: true },
      order: { countryCode: 'ASC' },
    });
  });

  it('resolves employment type country rules', async () => {
    const config = {
      id: 'cfg-1',
      tenantId: DIGITARO_TENANT_ID,
      employmentTypeId: 'type-1',
      countryCode: 'PK',
      payrollRoute: PayrollRoute.EMPLOYEE_PAY_RUN,
    } as EmploymentTypeCountryConfigEntity;
    matrixRepository.findOne.mockResolvedValue(config);

    await expect(
      service.resolveEmploymentTypeCountryRules('type-1', 'PK'),
    ).resolves.toEqual(config);
  });

  it('throws when employment type country rules are missing', async () => {
    matrixRepository.findOne.mockResolvedValue(null);

    await expect(
      service.resolveEmploymentTypeCountryRules('missing', 'PK'),
    ).rejects.toThrow(NotFoundException);
  });
});
