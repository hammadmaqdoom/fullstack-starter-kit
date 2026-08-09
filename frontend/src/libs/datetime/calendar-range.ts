function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function weekRange(anchor: Date): { from: string; to: string } {
  const day = anchor.getDay(); // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() + mondayOffset,
  );
  const sunday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
  );
  return { from: isoDate(monday), to: isoDate(sunday) };
}

export function monthRange(anchor: Date): { from: string; to: string } {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: isoDate(from), to: isoDate(to) };
}
