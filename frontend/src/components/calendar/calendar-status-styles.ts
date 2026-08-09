import type { CalendarCellStatus } from '@/libs/api/calendars';

export const CALENDAR_STATUS_CLASS: Record<CalendarCellStatus, string> = {
  in: 'bg-emerald-100 text-emerald-800',
  out: 'bg-sky-100 text-sky-800',
  on_leave: 'bg-amber-100 text-amber-800',
  missing: 'bg-red-100 text-red-800',
  incomplete: 'bg-orange-100 text-orange-800',
  holiday: 'bg-violet-100 text-violet-800',
  non_working: 'bg-gray-100 text-gray-500',
  planned: 'border border-dashed border-gray-200 bg-white text-gray-400',
};

export const CALENDAR_STATUS_KEYS: CalendarCellStatus[] = [
  'in',
  'out',
  'on_leave',
  'missing',
  'incomplete',
  'holiday',
  'non_working',
  'planned',
];
