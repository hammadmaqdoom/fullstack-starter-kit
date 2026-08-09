import { BadRequestException } from '@nestjs/common';
import { workDateInTimezone } from './time-leave-scope.util';

export const MAX_CALENDAR_SPAN_DAYS = 62;

function parseIsoDate(value: string): Date {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException({
      code: 'INVALID_DATE',
      message: `Invalid date: ${value}`,
    });
  }
  return d;
}

/** Monday of the week containing `isoDate` (ISO week, Mon=start). */
function mondayOfWeek(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const offset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const d = parseIsoDate(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function resolveCalendarRange(
  from: string | undefined,
  to: string | undefined,
  now: Date,
  timeZone: string,
): { from: string; to: string } {
  if (!from && !to) {
    const today = workDateInTimezone(now, timeZone);
    const monday = mondayOfWeek(today);
    return { from: monday, to: addDays(monday, 6) };
  }
  if (!from || !to) {
    throw new BadRequestException({
      code: 'INVALID_RANGE',
      message: 'Both from and to are required when either is provided',
    });
  }
  if (from > to) {
    throw new BadRequestException({
      code: 'INVALID_RANGE',
      message: 'from must be on or before to',
    });
  }
  return { from, to };
}

export function assertCalendarRangeSpan(from: string, to: string): void {
  const start = parseIsoDate(from).getTime();
  const end = parseIsoDate(to).getTime();
  const days = Math.floor((end - start) / 86_400_000) + 1;
  if (days > MAX_CALENDAR_SPAN_DAYS) {
    throw new BadRequestException({
      code: 'RANGE_TOO_LARGE',
      message: `Calendar range cannot exceed ${MAX_CALENDAR_SPAN_DAYS} days`,
    });
  }
}

export function enumerateDates(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}
