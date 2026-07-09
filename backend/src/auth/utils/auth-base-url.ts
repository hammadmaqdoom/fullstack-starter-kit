import { AppConfig } from '@/config/app/app-config.type';

export function resolveAuthBaseUrl(appConfig: AppConfig): string {
  const origins = appConfig.corsOrigin;
  if (Array.isArray(origins) && origins.length > 0) {
    return origins[0];
  }
  return appConfig.url;
}
