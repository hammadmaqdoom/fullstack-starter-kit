import { apiRequest } from '@/libs/api/client';

export type AttendanceDayStatus = 'in' | 'out' | 'on_leave' | 'missing' | 'incomplete';

export type AttendanceDaySummary = {
  id: string;
  workerId: string;
  workDate: string;
  status: AttendanceDayStatus;
  firstIn: string | null;
  lastOut: string | null;
};

export type AttendancePunch = {
  id: string;
  workerId: string;
  punchType: 'check_in' | 'check_out';
  punchedAt: string;
  source: string;
  timezone: string;
};

export type TodayAttendance = {
  workerId: string;
  workDate: string;
  daySummary: AttendanceDaySummary | null;
  punches: AttendancePunch[];
};

export type PunchResult = {
  punch: AttendancePunch;
  daySummary: AttendanceDaySummary;
};

export type TeamPunchToday = {
  workerId: string;
  workerName: string;
  status: AttendanceDayStatus | string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  localTimeZone?: string | null;
  leaveTypeName?: string | null;
};

export type PunchesTodayResponse =
  | TeamPunchToday[]
  | { team: TeamPunchToday[]; self?: TeamPunchToday | null }
  | { items: TeamPunchToday[] }
  | TodayAttendance;

const BASE = '/api/v1/attendance';

function normalizeTeamPunches(data: PunchesTodayResponse): TeamPunchToday[] {
  if (Array.isArray(data)) {
    return data;
  }
  if ('team' in data && data.team) {
    return data.team;
  }
  if ('items' in data && data.items) {
    return data.items;
  }
  return [];
}

export async function getTodayAttendance() {
  return apiRequest<TodayAttendance>(`${BASE}/punches/today`);
}

/** Team punch strip for manager cockpit. */
export async function getTodayPunches(params?: { scope?: 'self' | 'team' }) {
  const { data, meta } = await apiRequest<PunchesTodayResponse>(`${BASE}/punches/today`, {
    params: { scope: params?.scope ?? 'team' },
  });
  return { data: normalizeTeamPunches(data), meta };
}

export async function approvePunchCorrection(id: string) {
  return apiRequest<unknown>(`${BASE}/punch-corrections/${id}/approve`, {
    method: 'POST',
  });
}

export async function checkIn(body: {
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  source?: 'web' | 'pwa' | 'offline';
} = {}) {
  return apiRequest<PunchResult>(`${BASE}/punches/check-in`, {
    method: 'POST',
    body,
  });
}

export async function checkOut(body: {
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  source?: 'web' | 'pwa' | 'offline';
} = {}) {
  return apiRequest<PunchResult>(`${BASE}/punches/check-out`, {
    method: 'POST',
    body,
  });
}
