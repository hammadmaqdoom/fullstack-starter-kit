import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CountryConfigEntity } from './entities/country-config.entity';
import { CountryCurrencyConfigEntity } from './entities/country-currency-config.entity';
import { EmploymentTypeCountryConfigEntity } from './entities/employment-type-country-config.entity';
import { EmploymentTypeEntity } from './entities/employment-type.entity';

@Injectable()
export class CountryConfigService {
  constructor(
    @InjectRepository(CountryConfigEntity)
    private readonly countryRepository: Repository<CountryConfigEntity>,
    @InjectRepository(EmploymentTypeEntity)
    private readonly employmentTypeRepository: Repository<EmploymentTypeEntity>,
    @InjectRepository(EmploymentTypeCountryConfigEntity)
    private readonly matrixRepository: Repository<EmploymentTypeCountryConfigEntity>,
    @InjectRepository(CountryCurrencyConfigEntity)
    private readonly countryCurrencyRepository: Repository<CountryCurrencyConfigEntity>,
  ) {}

  async listCountries(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<CountryConfigEntity[]> {
    return this.countryRepository.find({
      where: { tenantId, isActive: true },
      order: { countryCode: 'ASC' },
    });
  }

  async listEmploymentTypes(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<EmploymentTypeEntity[]> {
    return this.employmentTypeRepository.find({
      where: { tenantId },
      order: { code: 'ASC' },
    });
  }

  async listEmploymentTypeCountryConfigs(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<EmploymentTypeCountryConfigEntity[]> {
    return this.matrixRepository.find({
      where: { tenantId },
      relations: ['employmentType'],
      order: { countryCode: 'ASC', employmentTypeId: 'ASC' },
    });
  }

  async resolveEmploymentTypeCountryRules(
    employmentTypeId: string,
    countryCode: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<EmploymentTypeCountryConfigEntity> {
    const config = await this.matrixRepository.findOne({
      where: { tenantId, employmentTypeId, countryCode },
      relations: ['employmentType'],
    });

    if (!config) {
      throw new NotFoundException({
        code: 'EMPLOYMENT_TYPE_COUNTRY_CONFIG_NOT_FOUND',
        message: `No configuration for employment type ${employmentTypeId} in ${countryCode}`,
      });
    }

    return config;
  }

  async getCountryCurrencyConfig(
    countryCode: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<CountryCurrencyConfigEntity | null> {
    return this.countryCurrencyRepository.findOne({
      where: { tenantId, countryCode },
    });
  }
}
