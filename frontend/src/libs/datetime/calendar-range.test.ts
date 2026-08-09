import { describe, expect, it } from 'vitest';
import { monthRange, weekRange } from './calendar-range';

describe('calendar-range', () => {
  it('weekRange returns Mon–Sun for a Wednesday', () => {
    expect(weekRange(new Date(2026, 7, 5))).toEqual({
      from: '2026-08-03',
      to: '2026-08-09',
    });
  });

  it('monthRange returns first–last day of month', () => {
    expect(monthRange(new Date(2026, 7, 15))).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });
});
