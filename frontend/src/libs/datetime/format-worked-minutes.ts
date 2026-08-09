export function formatWorkedMinutes(minutes: number): string {
  const safe =
    Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}h ${m}m`;
}

export function isDayInProgress(args: {
  date: string;
  today: string;
  punches: Array<{ punchType: string }>;
}): boolean {
  if (args.date !== args.today || args.punches.length === 0) {
    return false;
  }
  return args.punches[args.punches.length - 1]?.punchType === 'check_in';
}
