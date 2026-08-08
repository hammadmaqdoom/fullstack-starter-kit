import { describe, expect, it } from 'vitest';
import { routing } from '@/libs/I18nRouting';
import { getI18nPath } from './Helpers';

describe('Helpers', () => {
  describe('getI18nPath function', () => {
    it('should not change the path for default language', () => {
      const url = '/random-url';
      const locale = routing.defaultLocale;

      expect(getI18nPath(url, locale)).toBe(url);
    });

    it('should return the path for the only supported locale (en)', () => {
      const url = '/random-url';
      const locale = 'en';

      expect(getI18nPath(url, locale)).toBe(url);
    });
  });
});
