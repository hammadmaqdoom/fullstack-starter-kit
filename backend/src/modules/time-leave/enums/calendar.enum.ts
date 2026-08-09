export enum WorkWeekScopeType {
  GLOBAL = 'global',
  COUNTRY = 'country',
  DIVISION = 'division',
  WORKER = 'worker',
}

export enum StaffCalendarDayType {
  WORKING = 'working',
  HOLIDAY = 'holiday',
  LEAVE = 'leave',
  CLOSURE = 'closure',
  NON_WORKING = 'non_working',
}

export enum StaffCalendarSource {
  AUTO_GENERATED = 'auto_generated',
  MANUAL_OVERRIDE = 'manual_override',
}
