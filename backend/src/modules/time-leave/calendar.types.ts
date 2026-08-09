export type CalendarCellStatus =
  | 'in'
  | 'out'
  | 'on_leave'
  | 'missing'
  | 'incomplete'
  | 'holiday'
  | 'non_working'
  | 'planned';

export type CalendarDayCell = {
  date: string;
  status: CalendarCellStatus;
  leaveTypeName?: string | null;
  holidayName?: string | null;
  firstIn?: string | null;
  lastOut?: string | null;
};
