import { BadRequestException } from '@nestjs/common';
import {
  assertCalendarRangeSpan,
  enumerateDates,
  resolveCalendarRange,
} from '../calendar-range.util';

describe('calendar-range.util', () => {
  it('defaults to Mon–Sun week containing now in timezone', () => {
    // Wednesday 2026-08-05 12:00 UTC → week Mon 2026-08-03 .. Sun 2026-08-09 in UTC
    const now = new Date('2026-08-05T12:00:00.000Z');
    const range = resolveCalendarRange(undefined, undefined, now, 'UTC');
    expect(range).toEqual({ from: '2026-08-03', to: '2026-08-09' });
  });

  it('echoes explicit from/to', () => {
    expect(
      resolveCalendarRange('2026-08-01', '2026-08-31', new Date(), 'UTC'),
    ).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('rejects span over 62 days', () => {
    expect(() =>
      assertCalendarRangeSpan('2026-01-01', '2026-03-15'),
    ).toThrow(BadRequestException);
  });

  it('enumerates inclusive dates', () => {
    expect(enumerateDates('2026-08-01', '2026-08-03')).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
    ]);
  });
});
