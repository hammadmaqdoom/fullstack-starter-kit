import validateConfig from '@/utils/config/validate-config';
import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import process from 'node:process';
import { GraphConfig } from './graph-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  GRAPH_TENANT_ID: string;

  @IsString()
  @IsOptional()
  GRAPH_CLIENT_ID: string;

  @IsString()
  @IsOptional()
  GRAPH_CLIENT_SECRET: string;
}

export function getConfig(): GraphConfig {
  return {
    tenantId: process.env.GRAPH_TENANT_ID,
    clientId: process.env.GRAPH_CLIENT_ID,
    clientSecret: process.env.GRAPH_CLIENT_SECRET,
  };
}

export default registerAs<GraphConfig>('graph', () => {
  // eslint-disable-next-line no-console
  console.info(`Registering GraphConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
