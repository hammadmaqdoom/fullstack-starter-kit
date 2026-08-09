import type { TodayAttendance } from '@/libs/api/attendance';
import { describe, expect, it } from 'vitest';
import {
  buildLocationLabel,
  formatHeaderDate,
  resolveCheckInCta,
} from './shell-topbar.util';

describe('formatHeaderDate', () => {
  it('formats weekday short, day, month short in en-GB style', () => {
    const label = formatHeaderDate(new Date('2026-08-10T12:00:00'), 'en-GB');
    expect(label).toMatch(/Mon/);
    expect(label).toMatch(/10/);
    expect(label).toMatch(/Aug/);
  });
});

describe('buildLocationLabel', () => {
  it('prefers city then locality then subdivision', () => {
    expect(buildLocationLabel({ city: 'Karachi', locality: 'Clifton' })).toBe('Karachi');
    expect(buildLocationLabel({ city: null, locality: 'Clifton' })).toBe('Clifton');
    expect(
      buildLocationLabel({
        city: null,
        locality: null,
        principalSubdivision: 'Sindh',
      }),
    ).toBe('Sindh');
    expect(buildLocationLabel({})).toBeNull();
  });
});

function baseToday(overrides: Partial<TodayAttendance> = {}): TodayAttendance {
  return {
    workerId: 'w1',
    workDate: '2026-08-10',
    daySummary: null,
    punches: [],
    ...overrides,
  };
}

describe('resolveCheckInCta', () => {
  it('defaults to check_in when no summary', () => {
    expect(resolveCheckInCta(null)).toEqual({ kind: 'check_in' });
    expect(resolveCheckInCta(baseToday())).toEqual({ kind: 'check_in' });
  });

  it('returns checked_in with firstIn for status in', () => {
    const model = resolveCheckInCta(
      baseToday({
        daySummary: {
          id: 'd1',
          workerId: 'w1',
          workDate: '2026-08-10',
          status: 'in',
          firstIn: '2026-08-10T04:00:00.000Z',
          lastOut: null,
        },
      }),
    );
    expect(model.kind).toBe('checked_in');
    expect(model.timeLabel).toBeTruthy();
  });

  it('returns checked_out for status out', () => {
    expect(
      resolveCheckInCta(
        baseToday({
          daySummary: {
            id: 'd1',
            workerId: 'w1',
            workDate: '2026-08-10',
            status: 'out',
            firstIn: '2026-08-10T04:00:00.000Z',
            lastOut: '2026-08-10T13:00:00.000Z',
          },
        }),
      ).kind,
    ).toBe('checked_out');
  });

  it('hides CTA on leave', () => {
    expect(
      resolveCheckInCta(
        baseToday({
          daySummary: {
            id: 'd1',
            workerId: 'w1',
            workDate: '2026-08-10',
            status: 'on_leave',
            firstIn: null,
            lastOut: null,
          },
        }),
      ),
    ).toEqual({ kind: 'hidden' });
  });

  it('treats missing/incomplete as check_in', () => {
    expect(
      resolveCheckInCta(
        baseToday({
          daySummary: {
            id: 'd1',
            workerId: 'w1',
            workDate: '2026-08-10',
            status: 'missing',
            firstIn: null,
            lastOut: null,
          },
        }),
      ).kind,
    ).toBe('check_in');
  });
});
