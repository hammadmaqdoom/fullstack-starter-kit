/** Broadcast when today’s attendance changes so the shell header can refresh. */
export const ATTENDANCE_UPDATED_EVENT = 'polaris:attendance-updated';

export function notifyAttendanceUpdated(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(ATTENDANCE_UPDATED_EVENT));
}
