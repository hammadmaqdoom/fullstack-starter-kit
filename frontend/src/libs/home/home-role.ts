import type { ShellLayout } from '@/libs/api/shell';

export function shouldShowTeamAttendanceOnHome(
  primaryLayout: ShellLayout | null | undefined,
): boolean {
  return primaryLayout === 'manager';
}
