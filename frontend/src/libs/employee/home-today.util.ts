import type { StaffCalendarResponse } from '@/libs/api/calendars';

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

export type HomeUpcomingItem = {
  key: string;
  kind: 'leave' | 'holiday';
  title: string;
  dateLabel: string;
};

export function firstNameFromDisplayName(
  name: string | null | undefined,
): string {
  if (!name) {
    return '';
  }
  const token = name.trim().split(/\s+/)[0];
  return token ?? '';
}

function hourInZone(date: Date, timeZone?: string | null): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    hour12: false,
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(date);
  const hourPart = parts.find(p => p.type === 'hour')?.value;
  return Number.parseInt(hourPart ?? '0', 10);
}

export function greetingPeriod(
  date: Date,
  timeZone?: string | null,
): GreetingPeriod {
  const hour = hourInZone(date, timeZone);
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 17) {
    return 'afternoon';
  }
  return 'evening';
}

function monthDayParts(
  isoDate: string,
): { month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    return null;
  }
  return {
    month: Number.parseInt(match[2]!, 10),
    day: Number.parseInt(match[3]!, 10),
  };
}

function todayMonthDay(
  today: Date,
  timeZone?: string | null,
): { month: number; day: number; year: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(today);
  const year = Number.parseInt(parts.find(p => p.type === 'year')?.value ?? '0', 10);
  const month = Number.parseInt(parts.find(p => p.type === 'month')?.value ?? '0', 10);
  const day = Number.parseInt(parts.find(p => p.type === 'day')?.value ?? '0', 10);
  return { year, month, day };
}

export function isMonthDayMatch(
  isoDate: string | null | undefined,
  today: Date,
  timeZone?: string | null,
): boolean {
  if (!isoDate) {
    return false;
  }
  const source = monthDayParts(isoDate);
  if (!source) {
    return false;
  }
  const current = todayMonthDay(today, timeZone);
  return source.month === current.month && source.day === current.day;
}

export function anniversaryYears(
  startDate: string,
  today: Date,
  timeZone?: string | null,
): number | null {
  if (!isMonthDayMatch(startDate, today, timeZone)) {
    return null;
  }
  const source = monthDayParts(startDate);
  if (!source) {
    return null;
  }
  const current = todayMonthDay(today, timeZone);
  const years = current.year - Number.parseInt(startDate.slice(0, 4), 10);
  if (years < 1) {
    return null;
  }
  return years;
}

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

export function upcomingFromCalendar(
  calendar: StaffCalendarResponse,
  fromIso: string,
  toIso: string,
): HomeUpcomingItem[] {
  const items: HomeUpcomingItem[] = [];

  for (const leave of calendar.leave) {
    if (!rangesOverlap(leave.startDate, leave.endDate, fromIso, toIso)) {
      continue;
    }
    const dateLabel
      = leave.startDate === leave.endDate
        ? leave.startDate
        : `${leave.startDate} – ${leave.endDate}`;
    items.push({
      key: `leave:${leave.leaveRequestId}`,
      kind: 'leave',
      title: leave.leaveTypeName ?? 'Leave',
      dateLabel,
    });
  }

  for (const holiday of calendar.holidays) {
    if (holiday.holidayDate < fromIso || holiday.holidayDate > toIso) {
      continue;
    }
    items.push({
      key: `holiday:${holiday.id}`,
      kind: 'holiday',
      title: holiday.name,
      dateLabel: holiday.holidayDate,
    });
  }

  return items;
}
