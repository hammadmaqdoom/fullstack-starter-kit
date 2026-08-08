import type { LocalePrefixMode } from 'next-intl/routing';

const localePrefix: LocalePrefixMode = 'as-needed';

/** Polaris v1 is English-only — do not add ar/fr/RTL locales. */
export const AppConfig = {
  name: 'Polaris',
  locales: ['en'],
  defaultLocale: 'en',
  localePrefix,
};
