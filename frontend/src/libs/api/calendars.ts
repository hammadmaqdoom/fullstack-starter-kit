import { apiRequest } from '@/libs/api/client';

export type CalendarCellStatus =
  | 'in'
  | 'out'
  | 'on_leave'
  | 'missing'
  | 'incomplete'
  | 'holiday'
  | 'non_working'
  | 'planned';

export type StaffCalendarResponse = {
  from: string;
  to: string;
  timezone: string;
  days: Array<{
    date: string;
    status: CalendarCellStatus;
    leaveTypeName?: string | null;
    holidayName?: string | null;
    firstIn?: string | null;
    lastOut?: string | null;
  }>;
  leave: Array<{
    leaveRequestId: string;
    leaveTypeId: string;
    leaveTypeName?: string | null;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  holidays: Array<{
    id: string;
    name: string;
    holidayDate: string;
    countryCode: string;
    isCompanyClosure: boolean;
  }>;
};

export type TeamCalendarResponse = {
  from: string;
  to: string;
  days: Array<{ date: string; isHoliday: boolean; holidayName?: string | null }>;
  workers: Array<{
    workerId: string;
    workerName: string;
    timezone: string;
    cells: Array<{
      date: string;
      status: CalendarCellStatus;
      leaveTypeName?: string | null;
      firstIn?: string | null;
      lastOut?: string | null;
    }>;
  }>;
};

const BASE = '/api/v1/calendars';

export async function getMyCalendar(params?: { from?: string; to?: string }) {
  return apiRequest<StaffCalendarResponse>(`${BASE}/me`, { params });
}

export async function getStaffCalendar(
  workerId: string,
  params?: { from?: string; to?: string },
) {
  return apiRequest<StaffCalendarResponse>(`${BASE}/staff/${workerId}`, {
    params,
  });
}

export async function getTeamCalendar(params?: {
  from?: string;
  to?: string;
  divisionId?: string;
}) {
  return apiRequest<TeamCalendarResponse>(`${BASE}/team`, { params });
}
