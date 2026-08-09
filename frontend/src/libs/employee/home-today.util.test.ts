import type { StaffCalendarResponse } from '@/libs/api/calendars';
import { describe, expect, it } from 'vitest';
import {
  anniversaryYears,
  firstNameFromDisplayName,
  greetingPeriod,
  isMonthDayMatch,
  upcomingFromCalendar,
} from './home-today.util';

describe('firstNameFromDisplayName', () => {
  it('returns first token', () => {
    expect(firstNameFromDisplayName('Ayesha Khan')).toBe('Ayesha');
  });
  it('returns empty for blank', () => {
    expect(firstNameFromDisplayName('  ')).toBe('');
  });
});

describe('greetingPeriod', () => {
  it('classifies morning in UTC', () => {
    expect(greetingPeriod(new Date('2026-08-10T08:00:00Z'), 'UTC')).toBe('morning');
  });
  it('classifies afternoon in UTC', () => {
    expect(greetingPeriod(new Date('2026-08-10T14:00:00Z'), 'UTC')).toBe('afternoon');
  });
  it('classifies evening in UTC', () => {
    expect(greetingPeriod(new Date('2026-08-10T19:00:00Z'), 'UTC')).toBe('evening');
  });
});

describe('isMonthDayMatch', () => {
  it('matches month and day ignoring year', () => {
    expect(isMonthDayMatch('1995-08-10', new Date('2026-08-10T12:00:00Z'), 'UTC')).toBe(true);
    expect(isMonthDayMatch('1995-08-11', new Date('2026-08-10T12:00:00Z'), 'UTC')).toBe(false);
  });
});

describe('anniversaryYears', () => {
  it('returns years when anniversary day and at least 1 year', () => {
    expect(anniversaryYears('2024-08-10', new Date('2026-08-10T12:00:00Z'), 'UTC')).toBe(2);
  });
  it('returns null on start year anniversary day (0 years)', () => {
    expect(anniversaryYears('2026-08-10', new Date('2026-08-10T12:00:00Z'), 'UTC')).toBeNull();
  });
});

describe('upcomingFromCalendar', () => {
  it('includes leave and holidays in range', () => {
    const calendar: StaffCalendarResponse = {
      from: '2026-08-10',
      to: '2026-08-16',
      timezone: 'UTC',
      days: [],
      leave: [
        {
          leaveRequestId: 'lr1',
          leaveTypeId: 'lt1',
          leaveTypeName: 'Annual',
          startDate: '2026-08-12',
          endDate: '2026-08-13',
          status: 'approved',
        },
      ],
      holidays: [
        {
          id: 'h1',
          name: 'Independence Day',
          holidayDate: '2026-08-14',
          countryCode: 'PK',
          isCompanyClosure: false,
        },
      ],
    };
    const items = upcomingFromCalendar(calendar, '2026-08-10', '2026-08-16');
    expect(items.map(i => i.kind)).toEqual(['leave', 'holiday']);
  });
});
