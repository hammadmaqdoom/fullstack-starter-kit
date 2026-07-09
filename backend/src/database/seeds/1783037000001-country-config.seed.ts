import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import {
  buildEmploymentTypeCountryMatrix,
  COUNTRY_CONFIG_SEED,
  COUNTRY_CURRENCY_SEED,
  CURRENCY_SEED,
  EMPLOYMENT_TYPE_SEED,
} from '@/modules/country-config/constants/country-config.seed-data';
import { CountryConfigEntity } from '@/modules/country-config/entities/country-config.entity';
import { CountryCurrencyConfigEntity } from '@/modules/country-config/entities/country-currency-config.entity';
import { CurrencyCodeEntity } from '@/modules/country-config/entities/currency-code.entity';
import { EmploymentTypeCountryConfigEntity } from '@/modules/country-config/entities/employment-type-country-config.entity';
import { EmploymentTypeEntity } from '@/modules/country-config/entities/employment-type.entity';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

export class CountryConfigSeed1783037000001 implements Seeder {
  track = true;

  public async run(
    dataSource: DataSource,
    _: SeederFactoryManager,
  ): Promise<void> {
    const currencyRepository = dataSource.getRepository(CurrencyCodeEntity);
    for (const currency of CURRENCY_SEED) {
      const existing = await currencyRepository.findOne({
        where: { code: currency.code },
      });
      if (!existing) {
        await currencyRepository.save(currencyRepository.create(currency));
      }
    }

    const employmentTypeRepository =
      dataSource.getRepository(EmploymentTypeEntity);
    const employmentTypeByCode = new Map<string, EmploymentTypeEntity>();

    for (const employmentType of EMPLOYMENT_TYPE_SEED) {
      let record = await employmentTypeRepository.findOne({
        where: { tenantId: DIGITARO_TENANT_ID, code: employmentType.code },
      });

      if (!record) {
        record = await employmentTypeRepository.save(
          employmentTypeRepository.create({
            id: employmentType.id,
            tenantId: DIGITARO_TENANT_ID,
            code: employmentType.code,
            displayName: employmentType.displayName,
            isFte: employmentType.isFte,
          }),
        );
      }

      employmentTypeByCode.set(employmentType.code, record);
    }

    const countryRepository = dataSource.getRepository(CountryConfigEntity);
    for (const country of COUNTRY_CONFIG_SEED) {
      const existing = await countryRepository.findOne({
        where: {
          tenantId: DIGITARO_TENANT_ID,
          countryCode: country.countryCode,
        },
      });
      if (!existing) {
        await countryRepository.save(
          countryRepository.create({
            tenantId: DIGITARO_TENANT_ID,
            countryCode: country.countryCode,
            configJson: country.configJson,
            isActive: true,
          }),
        );
      }
    }

    const countryCurrencyRepository = dataSource.getRepository(
      CountryCurrencyConfigEntity,
    );
    for (const config of COUNTRY_CURRENCY_SEED) {
      const existing = await countryCurrencyRepository.findOne({
        where: {
          tenantId: DIGITARO_TENANT_ID,
          countryCode: config.countryCode,
        },
      });
      if (!existing) {
        await countryCurrencyRepository.save(
          countryCurrencyRepository.create({
            tenantId: DIGITARO_TENANT_ID,
            countryCode: config.countryCode,
            defaultCurrency: config.defaultCurrency,
            allowedCurrencies: [...config.allowedCurrencies],
          }),
        );
      }
    }

    const matrixRepository = dataSource.getRepository(
      EmploymentTypeCountryConfigEntity,
    );
    for (const row of buildEmploymentTypeCountryMatrix()) {
      const employmentType = employmentTypeByCode.get(row.employmentTypeCode);
      if (!employmentType) {
        continue;
      }

      const existing = await matrixRepository.findOne({
        where: {
          tenantId: DIGITARO_TENANT_ID,
          employmentTypeId: employmentType.id,
          countryCode: row.countryCode,
        },
      });

      if (!existing) {
        await matrixRepository.save(
          matrixRepository.create({
            tenantId: DIGITARO_TENANT_ID,
            employmentTypeId: employmentType.id,
            countryCode: row.countryCode,
            leaveEnabled: row.leaveEnabled,
            checkInRequired: row.checkInRequired,
            payrollRoute: row.payrollRoute,
            performanceIncluded: row.performanceIncluded,
            configJson: {},
          }),
        );
      }
    }
  }
}
