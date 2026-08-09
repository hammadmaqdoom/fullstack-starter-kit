import { apiRequest, ApiRequestError } from '@/libs/api/client';

export type LeaveRequestStatus =
  | 'draft'
  | 'submitted'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type LeaveType = {
  id: string;
  name: string;
  code: string;
  countryCode?: string;
  accrualMethod?: 'annual' | 'monthly' | string;
  daysPerYear?: string | number;
  carryForwardCap?: string | number;
  unit?: 'days' | 'hours';
};

export type Holiday = {
  id: string;
  name: string;
  holidayDate: string;
  isCompanyClosure?: boolean;
  isOptionalWorking?: boolean;
  holidayCalendarId?: string;
};

export type HolidayCalendar = {
  id: string;
  name: string;
  countryCode: string;
  effectiveYear: number;
  isActive: boolean;
  holidays?: Holiday[];
};

export type CreateLeaveTypeInput = {
  countryCode: string;
  code: string;
  name: string;
  accrualMethod?: 'annual' | 'monthly';
  daysPerYear?: number;
  carryForwardCap?: number;
};

export type UpdateLeaveTypeInput = Partial<CreateLeaveTypeInput>;

export type CreateHolidayCalendarInput = {
  countryCode: string;
  name: string;
  effectiveYear: number;
  isActive?: boolean;
};

export type CreateHolidayInput = {
  name: string;
  holidayDate: string;
  isCompanyClosure?: boolean;
  isOptionalWorking?: boolean;
};

export type LeaveBalance = {
  leaveTypeId: string;
  leaveTypeName: string;
  remaining: number;
  used: number;
  accruing: number;
  unit: 'days' | 'hours';
};

export type LeaveRequest = {
  id: string;
  workerId?: string;
  leaveTypeId?: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  status: LeaveRequestStatus | string;
  reason?: string | null;
  nextStepText?: string | null;
  createdAt?: string;
};

export type CreateLeaveRequestInput = {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  halfDay?: boolean;
};

export type TeamCalendarEntry = {
  workerId: string;
  workerName: string;
  leaveTypeName?: string | null;
  status: string;
  startDate: string;
  endDate: string;
};

export type TeamCalendarDay = {
  date: string;
  entries: Array<{
    workerId: string;
    workerName: string;
    status: 'working' | 'on_leave' | 'holiday' | 'pending_leave' | string;
    leaveTypeName?: string | null;
  }>;
};

export type TeamCalendarResponse =
  | TeamCalendarEntry[]
  | { entries: TeamCalendarEntry[]; days?: TeamCalendarDay[] }
  | { days: TeamCalendarDay[] };

const BASE = '/api/v1/leave';

export function normalizeTeamCalendar(data: TeamCalendarResponse): {
  entries: TeamCalendarEntry[];
  days: TeamCalendarDay[];
} {
  if (Array.isArray(data)) {
    return { entries: data, days: [] };
  }
  if ('entries' in data && data.entries) {
    return { entries: data.entries, days: data.days ?? [] };
  }
  if ('days' in data && data.days) {
    const entries: TeamCalendarEntry[] = data.days.flatMap(day =>
      day.entries
        .filter(e => e.status === 'on_leave' || e.status === 'pending_leave')
        .map(e => ({
          workerId: e.workerId,
          workerName: e.workerName,
          leaveTypeName: e.leaveTypeName,
          status: e.status,
          startDate: day.date,
          endDate: day.date,
        })),
    );
    return { entries, days: data.days };
  }
  return { entries: [], days: [] };
}

export async function listLeaveTypes() {
  try {
    return await apiRequest<LeaveType[]>(`${BASE}/types`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: [] as LeaveType[], meta: { unavailable: true } };
    }
    throw err;
  }
}

const ADMIN_BASE = `${BASE}/admin`;

export async function listAdminLeaveTypes() {
  return apiRequest<LeaveType[]>(`${ADMIN_BASE}/types`);
}

export async function createLeaveType(input: CreateLeaveTypeInput) {
  return apiRequest<LeaveType>(`${ADMIN_BASE}/types`, {
    method: 'POST',
    body: input,
  });
}

export async function updateLeaveType(id: string, input: UpdateLeaveTypeInput) {
  return apiRequest<LeaveType>(`${ADMIN_BASE}/types/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function listHolidayCalendars() {
  return apiRequest<HolidayCalendar[]>(`${ADMIN_BASE}/holiday-calendars`);
}

export async function createHolidayCalendar(input: CreateHolidayCalendarInput) {
  return apiRequest<HolidayCalendar>(`${ADMIN_BASE}/holiday-calendars`, {
    method: 'POST',
    body: input,
  });
}

export async function createHoliday(calendarId: string, input: CreateHolidayInput) {
  return apiRequest<Holiday>(`${ADMIN_BASE}/holiday-calendars/${calendarId}/holidays`, {
    method: 'POST',
    body: input,
  });
}

export async function listLeaveBalances(workerId?: string) {
  try {
    return await apiRequest<LeaveBalance[]>(`${BASE}/balances`, {
      params: workerId ? { workerId } : undefined,
    });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: [] as LeaveBalance[], meta: { unavailable: true } };
    }
    throw err;
  }
}

export async function listLeaveRequests(params?: { page?: number; limit?: number }) {
  try {
    return await apiRequest<LeaveRequest[]>(`${BASE}/requests`, { params });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return { data: [] as LeaveRequest[], meta: { unavailable: true } };
    }
    throw err;
  }
}

export async function createLeaveRequest(input: CreateLeaveRequestInput) {
  return apiRequest<LeaveRequest>(`${BASE}/requests`, {
    method: 'POST',
    body: input,
  });
}

export async function cancelLeaveRequest(id: string) {
  return apiRequest<LeaveRequest>(`${BASE}/requests/${id}/cancel`, {
    method: 'POST',
  });
}

export async function getTeamLeaveCalendar(params?: {
  from?: string;
  to?: string;
}) {
  const { data, meta } = await apiRequest<TeamCalendarResponse>(
    `${BASE}/team-calendar`,
    { params },
  );
  return { data: normalizeTeamCalendar(data), meta };
}

export async function approveLeaveRequest(id: string) {
  return apiRequest<LeaveRequest>(`${BASE}/requests/${id}/approve`, {
    method: 'POST',
  });
}

export async function rejectLeaveRequest(id: string, reason: string) {
  return apiRequest<LeaveRequest>(`${BASE}/requests/${id}/reject`, {
    method: 'POST',
    body: { reason },
  });
}
