export function computeProbationEndAfterConfirm(): null {
  return null;
}

export function computeProbationEndAfterExtend(input: {
  currentEndDate: string | null;
  today: string;
  extensionDays: number;
}): string {
  if (
    !Number.isInteger(input.extensionDays) ||
    input.extensionDays < 1 ||
    input.extensionDays > 365
  ) {
    throw new Error('Extension days must be an integer between 1 and 365');
  }

  const base =
    input.currentEndDate && input.currentEndDate > input.today
      ? input.currentEndDate
      : input.today;

  const baseDate = new Date(`${base}T00:00:00.000Z`);
  baseDate.setUTCDate(baseDate.getUTCDate() + input.extensionDays);
  return baseDate.toISOString().slice(0, 10);
}
