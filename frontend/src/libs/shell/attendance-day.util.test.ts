import { describe, expect, it } from 'vitest';
import { computeDayWorkedMinutes } from './attendance-day.util';

describe('computeDayWorkedMinutes', () => {
  it('sums completed check-in/out pairs', () => {
    const minutes = computeDayWorkedMinutes(
      [
        { punchType: 'check_in', punchedAt: '2026-08-10T04:00:00.000Z' },
        { punchType: 'check_out', punchedAt: '2026-08-10T08:00:00.000Z' },
        { punchType: 'check_in', punchedAt: '2026-08-10T09:00:00.000Z' },
        { punchType: 'check_out', punchedAt: '2026-08-10T10:30:00.000Z' },
      ],
      new Date('2026-08-10T12:00:00.000Z'),
    );
    // 4h + 1.5h = 330 minutes
    expect(minutes).toBe(330);
  });

  it('includes open check-in segment through now', () => {
    const minutes = computeDayWorkedMinutes(
      [{ punchType: 'check_in', punchedAt: '2026-08-10T04:00:00.000Z' }],
      new Date('2026-08-10T06:15:00.000Z'),
    );
    expect(minutes).toBe(135);
  });

  it('returns 0 for empty punches', () => {
    expect(computeDayWorkedMinutes([])).toBe(0);
  });
});
