import { describe, expect, it } from 'vitest';
import { shouldShowTeamAttendanceOnHome } from './home-role';

describe('shouldShowTeamAttendanceOnHome', () => {
  it('is true only for manager layout', () => {
    expect(shouldShowTeamAttendanceOnHome('manager')).toBe(true);
    expect(shouldShowTeamAttendanceOnHome('employee')).toBe(false);
    expect(shouldShowTeamAttendanceOnHome('people_ops')).toBe(false);
    expect(shouldShowTeamAttendanceOnHome(null)).toBe(false);
    expect(shouldShowTeamAttendanceOnHome(undefined)).toBe(false);
  });
});
