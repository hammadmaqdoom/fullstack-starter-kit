import type {
  CalendarCellStatus,
  CalendarDayPunch,
  StaffCalendarResponse,
} from '@/libs/api/calendars';

export type WeekStripDay = {
  date: string;
  status: CalendarCellStatus;
  leaveTypeName?: string | null;
  holidayName?: string | null;
  firstIn?: string | null;
  lastOut?: string | null;
  punches: CalendarDayPunch[];
  workedMinutes: number;
};

function addDaysIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y!, m! - 1, d! + delta);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function buildWeekStripDays(
  from: string,
  to: string,
  days: StaffCalendarResponse['days'],
): WeekStripDay[] {
  const byDate = new Map(days.map(day => [day.date, day]));
  const out: WeekStripDay[] = [];
  let cursor = from;
  for (let i = 0; i < 7; i++) {
    const found = byDate.get(cursor);
    out.push(
      found
        ? {
            date: found.date,
            status: found.status,
            leaveTypeName: found.leaveTypeName,
            holidayName: found.holidayName,
            firstIn: found.firstIn,
            lastOut: found.lastOut,
            punches: found.punches ?? [],
            workedMinutes: found.workedMinutes ?? 0,
          }
        : {
            date: cursor,
            status: 'planned',
            punches: [],
            workedMinutes: 0,
          },
    );
    if (cursor === to) {
      break;
    }
    cursor = addDaysIso(cursor, 1);
  }
  while (out.length < 7) {
    const next = addDaysIso(out[out.length - 1]!.date, 1);
    out.push({ date: next, status: 'planned', punches: [], workedMinutes: 0 });
  }
  return out.slice(0, 7);
}
