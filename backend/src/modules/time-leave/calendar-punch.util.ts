import { PunchType } from './enums/attendance.enum';
import { workDateInTimezone } from './time-leave-scope.util';

export type PunchLike = {
  id: string;
  workerId: string;
  punchType: PunchType | 'check_in' | 'check_out';
  punchedAt: Date;
};

export function computeWorkedMinutes(
  punches: Array<{ punchType: string; punchedAt: Date }>,
): number {
  const sorted = [...punches].sort(
    (a, b) => a.punchedAt.getTime() - b.punchedAt.getTime(),
  );
  let openIn: Date | null = null;
  let totalMs = 0;
  for (const punch of sorted) {
    if (
      punch.punchType === PunchType.CHECK_IN ||
      punch.punchType === 'check_in'
    ) {
      openIn = punch.punchedAt;
      continue;
    }
    if (
      (punch.punchType === PunchType.CHECK_OUT ||
        punch.punchType === 'check_out') &&
      openIn
    ) {
      totalMs += punch.punchedAt.getTime() - openIn.getTime();
      openIn = null;
    }
  }
  return Math.floor(totalMs / 60_000);
}

export function groupPunchesByWorkerAndDate(
  punches: PunchLike[],
  timezoneByWorkerId: Map<string, string>,
): Map<string, PunchLike[]> {
  const map = new Map<string, PunchLike[]>();
  for (const punch of punches) {
    const tz = timezoneByWorkerId.get(punch.workerId)?.trim() || 'UTC';
    const date = workDateInTimezone(punch.punchedAt, tz);
    const key = `${punch.workerId}:${date}`;
    const list = map.get(key) ?? [];
    list.push(punch);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.punchedAt.getTime() - b.punchedAt.getTime());
  }
  return map;
}
