import { resolveCellStatus, isDefaultWorkingDay } from '../calendar-cell.util';

describe('calendar-cell.util', () => {
  it('treats Sat/Sun as non-working by default', () => {
    expect(isDefaultWorkingDay('2026-08-08')).toBe(false); // Sat
    expect(isDefaultWorkingDay('2026-08-07')).toBe(true); // Fri
  });

  it('prefers holiday over leave and attendance', () => {
    expect(
      resolveCellStatus({
        date: '2026-08-03',
        today: '2026-08-09',
        isHoliday: true,
        hasApprovedLeave: true,
        attendanceStatus: 'in',
      }),
    ).toBe('holiday');
  });

  it('uses planned for future working days', () => {
    expect(
      resolveCellStatus({
        date: '2026-08-10',
        today: '2026-08-09',
        isHoliday: false,
        hasApprovedLeave: false,
        attendanceStatus: null,
      }),
    ).toBe('planned');
  });

  it('never marks future dates missing', () => {
    expect(
      resolveCellStatus({
        date: '2026-08-11',
        today: '2026-08-09',
        isHoliday: false,
        hasApprovedLeave: false,
        attendanceStatus: 'missing',
      }),
    ).toBe('planned');
  });

  it('uses attendance for past/today when present', () => {
    expect(
      resolveCellStatus({
        date: '2026-08-09',
        today: '2026-08-09',
        isHoliday: false,
        hasApprovedLeave: false,
        attendanceStatus: 'out',
      }),
    ).toBe('out');
  });
});
