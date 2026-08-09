import type { WeekStripDay } from '@/libs/datetime/week-strip-days';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { WeekAttendanceStrip } from './WeekAttendanceStrip';

vi.mock('@/libs/I18nNavigation', () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => createElement('a', { href, className }, children),
}));

const messages = {
  EmployeeHome: {
    week_title: 'This week',
    week_view_calendar: 'View calendar',
    week_loading: "Loading this week's attendance",
    week_empty: 'Weekly attendance will appear here once calendar data is available.',
    week_error: "Could not load this week's attendance.",
    retry: 'Try again',
  },
  EmployeeCalendar: {
    status_out: 'Out',
    status_planned: 'Planned',
    status_in: 'In',
    status_on_leave: 'On leave',
    status_missing: 'Missing',
    status_incomplete: 'Incomplete',
    status_holiday: 'Holiday',
    status_non_working: 'Non-working',
    detail_check_in: 'Check-in',
    detail_check_out: 'Check-out',
    detail_total: 'Total · {duration}',
    detail_in_progress: 'In progress',
    detail_no_punches: 'No punches this day',
    detail_punch_line: '{label} · {time}',
  },
};

const days: WeekStripDay[] = [
  '2026-08-03',
  '2026-08-04',
  '2026-08-05',
  '2026-08-06',
  '2026-08-07',
  '2026-08-08',
  '2026-08-09',
].map((date, i) => ({
  date,
  status: i === 2 ? 'out' : 'planned',
  punches: [],
  workedMinutes: i === 2 ? 480 : 0,
}));

function renderStrip(
  props: Partial<React.ComponentProps<typeof WeekAttendanceStrip>> = {},
) {
  return renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale: 'en', messages, timeZone: 'UTC' },
      createElement(WeekAttendanceStrip, {
        days,
        timezone: 'Asia/Karachi',
        today: '2026-08-05',
        ...props,
      }),
    ),
  );
}

describe('WeekAttendanceStrip', () => {
  it('renders seven weekday cells and view calendar link', () => {
    const html = renderStrip();
    expect(html).toContain('This week');
    expect(html).toContain('View calendar');
    expect(html).toContain('href="/employee/calendar"');
    expect(html).toContain('bg-sky-100');
    expect((html.match(/role="button"/g) ?? []).length).toBeGreaterThanOrEqual(7);
  });

  it('renders error with retry', () => {
    const html = renderStrip({ days: [], error: 'boom', onRetry: () => undefined });
    expect(html).toContain('boom');
    expect(html).toContain('Try again');
  });
});
