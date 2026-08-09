import { formatWorkedMinutes } from '@/libs/datetime/format-worked-minutes';

export function computeDayWorkedMinutes(
  punches: Array<{ punchType: string; punchedAt: string | Date }>,
  now: Date = new Date(),
): number {
  const sorted = [...punches].sort(
    (a, b) => new Date(a.punchedAt).getTime() - new Date(b.punchedAt).getTime(),
  );
  let openIn: Date | null = null;
  let totalMs = 0;
  for (const punch of sorted) {
    const at = new Date(punch.punchedAt);
    if (punch.punchType === 'check_in') {
      openIn = at;
      continue;
    }
    if (punch.punchType === 'check_out' && openIn) {
      totalMs += at.getTime() - openIn.getTime();
      openIn = null;
    }
  }
  if (openIn) {
    totalMs += Math.max(0, now.getTime() - openIn.getTime());
  }
  return Math.floor(totalMs / 60_000);
}

export function formatPunchClock(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export { formatWorkedMinutes };
