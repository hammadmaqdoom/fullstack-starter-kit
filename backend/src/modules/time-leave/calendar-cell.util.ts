import type { CalendarCellStatus } from './calendar.types';
import type { AttendanceDayStatus } from './enums/attendance.enum';

/**
 * TODO: swap in work_week_patterns lookup (table now exists) when calendar
 * resolve is wired; keep Mon–Fri fallback until then.
 */
export function isDefaultWorkingDay(isoDate: string): boolean {
  const dow = new Date(`${isoDate}T00:00:00.000Z`).getUTCDay(); // 0=Sun
  return dow >= 1 && dow <= 5;
}

export function resolveCellStatus(input: {
  date: string;
  today: string;
  isHoliday: boolean;
  hasApprovedLeave: boolean;
  attendanceStatus: AttendanceDayStatus | string | null;
}): CalendarCellStatus {
  const isFuture = input.date > input.today;

  if (input.isHoliday) {
    return 'holiday';
  }
  if (input.hasApprovedLeave) {
    return 'on_leave';
  }
  if (isFuture) {
    if (!isDefaultWorkingDay(input.date)) {
      return 'non_working';
    }
    return 'planned';
  }
  if (input.attendanceStatus) {
    return input.attendanceStatus as CalendarCellStatus;
  }
  if (!isDefaultWorkingDay(input.date)) {
    return 'non_working';
  }
  return 'missing';
}
