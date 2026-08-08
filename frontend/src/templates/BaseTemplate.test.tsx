import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';
import messages from '@/locales/en.json';
import { BaseTemplate } from './BaseTemplate';

describe('Base template', () => {
  describe('Render method', () => {
    it('should render children', () => {
      render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <BaseTemplate leftNav={<li>link 1</li>}>
            <p>Auth content</p>
          </BaseTemplate>
        </NextIntlClientProvider>,
      );

      expect(page.getByText('Auth content').elements()).toHaveLength(1);
    });
  });
});
