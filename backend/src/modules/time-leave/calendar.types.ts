export type CalendarCellStatus =
  | 'in'
  | 'out'
  | 'on_leave'
  | 'missing'
  | 'incomplete'
  | 'holiday'
  | 'non_working'
  | 'planned';

export type CalendarDayPunch = {
  id: string;
  punchType: 'check_in' | 'check_out';
  punchedAt: string;
};

export type CalendarDayCell = {
  date: string;
  status: CalendarCellStatus;
  leaveTypeName?: string | null;
  holidayName?: string | null;
  firstIn?: string | null;
  lastOut?: string | null;
  punches: CalendarDayPunch[];
  workedMinutes: number;
};
