import { describe, expect, it } from 'vitest';
import { buildWeekStripDays } from './week-strip-days';

describe('buildWeekStripDays', () => {
  it('returns exactly 7 Mon–Sun dates and fills gaps as planned', () => {
    const result = buildWeekStripDays('2026-08-03', '2026-08-09', [
      {
        date: '2026-08-05',
        status: 'out',
        punches: [],
        workedMinutes: 480,
        firstIn: '2026-08-05T04:00:00.000Z',
        lastOut: '2026-08-05T12:00:00.000Z',
      },
    ]);
    expect(result).toHaveLength(7);
    expect(result.map(d => d.date)).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
    ]);
    expect(result[0]?.status).toBe('planned');
    expect(result[2]?.status).toBe('out');
    expect(result[2]?.workedMinutes).toBe(480);
  });
});
