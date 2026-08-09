import { describe, expect, it } from 'vitest';
import {
  formatWorkedMinutes,
  isDayInProgress,
} from './format-worked-minutes';

describe('formatWorkedMinutes', () => {
  it('formats hours and minutes', () => {
    expect(formatWorkedMinutes(450)).toBe('7h 30m');
    expect(formatWorkedMinutes(0)).toBe('0h 0m');
    expect(formatWorkedMinutes(59)).toBe('0h 59m');
  });
});

describe('isDayInProgress', () => {
  it('is true when today and last punch is unpaired check_in', () => {
    expect(
      isDayInProgress({
        date: '2026-08-09',
        today: '2026-08-09',
        punches: [
          { punchType: 'check_in' },
          { punchType: 'check_out' },
          { punchType: 'check_in' },
        ],
      }),
    ).toBe(true);
  });

  it('is false when not today or day closed with check_out', () => {
    expect(
      isDayInProgress({
        date: '2026-08-08',
        today: '2026-08-09',
        punches: [{ punchType: 'check_in' }],
      }),
    ).toBe(false);
    expect(
      isDayInProgress({
        date: '2026-08-09',
        today: '2026-08-09',
        punches: [
          { punchType: 'check_in' },
          { punchType: 'check_out' },
        ],
      }),
    ).toBe(false);
  });
});
