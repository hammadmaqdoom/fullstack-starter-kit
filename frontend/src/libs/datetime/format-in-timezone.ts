const FALLBACK_TIMEZONE = 'UTC';

/** Prefer the worker timezone; otherwise the browser zone. */
export function resolveDisplayTimezone(timezone?: string | null): string {
  if (timezone && timezone.trim().length > 0) {
    return timezone;
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIMEZONE;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

export function formatInTimezone(
  iso: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone, ...options }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(iso));
  }
}

/** Date + time in the given zone (Hub / leave submitted-at labels). */
export function formatDateTimeInTimezone(iso: string, timeZone: string): string {
  return formatInTimezone(iso, timeZone, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function getTimezoneAbbreviation(timeZone: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(at);
    return parts.find(part => part.type === 'timeZoneName')?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}
