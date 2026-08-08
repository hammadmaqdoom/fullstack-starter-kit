import validateConfig from '@/utils/config/validate-config';
import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import process from 'node:process';
import { EntraWebhookConfig } from './entra-webhook-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  ENTRA_WEBHOOK_SECRET: string;
}

export function getConfig(): EntraWebhookConfig {
  return {
    secret: process.env.ENTRA_WEBHOOK_SECRET,
  };
}

export default registerAs<EntraWebhookConfig>('entraWebhook', () => {
  // eslint-disable-next-line no-console
  console.info(`Registering EntraWebhookConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
