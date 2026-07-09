import validateConfig from '@/utils/config/validate-config';
import { registerAs } from '@nestjs/config';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AuthConfig } from './auth-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  AUTH_SECRET: string;

  @IsString()
  @IsOptional()
  BASIC_AUTH_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  BASIC_AUTH_PASSWORD: string;

  @IsString()
  @IsOptional()
  GITHUB_CLIENT_ID: string;

  @IsString()
  @IsOptional()
  GITHUB_CLIENT_SECRET: string;

  @IsString()
  @IsOptional()
  ENTRA_CLIENT_ID: string;

  @IsString()
  @IsOptional()
  ENTRA_CLIENT_SECRET: string;

  @IsString()
  @IsOptional()
  ENTRA_TENANT_ID: string;
}

export function getConfig(): AuthConfig {
  return {
    authSecret: process.env.AUTH_SECRET,
    basicAuth: {
      username: process.env.BASIC_AUTH_USERNAME,
      password: process.env.BASIC_AUTH_PASSWORD,
    },
    oAuth: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      },
    },
    entra: {
      clientId: process.env.ENTRA_CLIENT_ID,
      clientSecret: process.env.ENTRA_CLIENT_SECRET,
      tenantId: process.env.ENTRA_TENANT_ID,
    },
  };
}

export default registerAs<AuthConfig>('auth', () => {
  // eslint-disable-next-line no-console
  console.info(`Registering AuthConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
