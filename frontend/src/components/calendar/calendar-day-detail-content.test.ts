import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CalendarDayDetailContent } from '@/components/calendar/CalendarDayDetailPopover';

const labels = {
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  total: (d: string) => `Total · ${d}`,
  inProgress: 'In progress',
  noPunches: 'No punches this day',
  punchLine: (label: string, time: string) => `${label} · ${time}`,
};

describe('CalendarDayDetailContent', () => {
  it('lists punches and total hours', () => {
    const html = renderToStaticMarkup(
      createElement(CalendarDayDetailContent, {
        date: '2026-08-08',
        today: '2026-08-09',
        timezone: 'UTC',
        status: 'out',
        statusLabel: 'Out',
        punches: [
          {
            id: '1',
            punchType: 'check_in',
            punchedAt: '2026-08-08T09:00:00.000Z',
          },
          {
            id: '2',
            punchType: 'check_out',
            punchedAt: '2026-08-08T17:00:00.000Z',
          },
        ],
        workedMinutes: 480,
        labels,
      }),
    );
    expect(html).toContain('Check-in');
    expect(html).toContain('Check-out');
    expect(html).toContain('Total · 8h 0m');
  });

  it('shows empty copy when no punches', () => {
    const html = renderToStaticMarkup(
      createElement(CalendarDayDetailContent, {
        date: '2026-08-14',
        today: '2026-08-09',
        timezone: 'UTC',
        status: 'holiday',
        statusLabel: 'Holiday',
        holidayName: 'Independence Day',
        punches: [],
        workedMinutes: 0,
        labels,
      }),
    );
    expect(html).toContain('No punches this day');
    expect(html).toContain('Independence Day');
  });

  it('shows In progress for open check-in today', () => {
    const html = renderToStaticMarkup(
      createElement(CalendarDayDetailContent, {
        date: '2026-08-09',
        today: '2026-08-09',
        timezone: 'UTC',
        status: 'in',
        statusLabel: 'In',
        punches: [
          {
            id: '1',
            punchType: 'check_in',
            punchedAt: '2026-08-09T09:00:00.000Z',
          },
        ],
        workedMinutes: 0,
        labels,
      }),
    );
    expect(html).toContain('In progress');
  });
});
