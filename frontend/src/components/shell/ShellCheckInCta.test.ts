import type { ShellCheckInCtaModel } from '@/libs/shell/shell-topbar.util';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { ShellCheckInCta } from './ShellCheckInCta';

const messages = {
  AuthenticatedShell: {
    check_in: 'Check in',
    checked_in_with_time: 'Checked in · {time}',
    checked_out: 'Checked out',
  },
};

function renderCta(model: ShellCheckInCtaModel, onOpen = vi.fn()) {
  return renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale: 'en', messages, timeZone: 'UTC' },
      createElement(ShellCheckInCta, { model, onOpen }),
    ),
  );
}

describe('ShellCheckInCta', () => {
  it('renders Check in when kind is check_in', () => {
    const html = renderCta({ kind: 'check_in' });
    expect(html).toContain('Check in');
    expect(html).toContain('type="button"');
  });

  it('renders checked-in time', () => {
    const html = renderCta({ kind: 'checked_in', timeLabel: '9:00 AM' });
    expect(html).toContain('Checked in · 9:00 AM');
  });

  it('renders nothing when hidden', () => {
    const html = renderCta({ kind: 'hidden' });
    expect(html).toBe('');
  });

  it('renders checked out', () => {
    const html = renderCta({ kind: 'checked_out' });
    expect(html).toContain('Checked out');
  });
});
