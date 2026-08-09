import type { TodayAttendance } from '@/libs/api/attendance';

export function formatHeaderDate(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function buildLocationLabel(parts: {
  city?: string | null;
  locality?: string | null;
  principalSubdivision?: string | null;
}): string | null {
  const candidate
    = parts.city?.trim()
      || parts.locality?.trim()
      || parts.principalSubdivision?.trim()
      || '';
  return candidate.length > 0 ? candidate : null;
}

export type ShellCheckInCtaModel = {
  kind: 'check_in' | 'checked_in' | 'checked_out' | 'hidden';
  timeLabel?: string;
};

function formatPunchTime(iso: string | null | undefined): string | undefined {
  if (!iso) {
    return undefined;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return undefined;
  }
}

export function resolveCheckInCta(today: TodayAttendance | null): ShellCheckInCtaModel {
  const status = today?.daySummary?.status ?? null;
  if (status === 'on_leave') {
    return { kind: 'hidden' };
  }
  if (status === 'in') {
    return {
      kind: 'checked_in',
      timeLabel: formatPunchTime(today?.daySummary?.firstIn),
    };
  }
  if (status === 'out') {
    return { kind: 'checked_out' };
  }
  return { kind: 'check_in' };
}
