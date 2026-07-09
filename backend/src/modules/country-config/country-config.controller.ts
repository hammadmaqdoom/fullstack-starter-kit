import { AuthGuard } from '@/auth/auth.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CountryConfigService } from './country-config.service';

@ApiTags('config')
@Controller({ path: 'config', version: '1' })
@UseGuards(AuthGuard)
export class CountryConfigController {
  constructor(private readonly countryConfigService: CountryConfigService) {}

  @Get('countries')
  @ApiOperation({ summary: 'List active country configurations' })
  async listCountries() {
    return this.countryConfigService.listCountries();
  }

  @Get('employment-types')
  @ApiOperation({ summary: 'List employment type definitions' })
  async listEmploymentTypes() {
    return this.countryConfigService.listEmploymentTypes();
  }

  @Get('employment-type-country-configs')
  @ApiOperation({ summary: 'List employment type x country rules matrix' })
  async listEmploymentTypeCountryConfigs() {
    return this.countryConfigService.listEmploymentTypeCountryConfigs();
  }
}
