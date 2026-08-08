import { registerAs } from '@nestjs/config';

import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../../utils/config/validate-config';
import { AzureConfig } from './azure-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  AZURE_STORAGE_CONNECTION_STRING: string;

  @IsString()
  @IsOptional()
  AZURE_STORAGE_CONTAINER: string;
}

export function getConfig(): AzureConfig {
  return {
    storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    storageContainer: process.env.AZURE_STORAGE_CONTAINER,
  };
}

export default registerAs<AzureConfig>('azure', () => {
  // eslint-disable-next-line no-console
  console.info(`Registering AzureConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
