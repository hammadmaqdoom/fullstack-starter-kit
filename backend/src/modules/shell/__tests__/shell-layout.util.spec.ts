import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ShellLayout } from '../enums/shell-layout.enum';
import { modulesForLayout, resolveShellLayout } from '../shell-layout.util';

describe('resolveShellLayout', () => {
  it('prefers admin over people_ops', () => {
    const r = resolveShellLayout([
      PolarisRoleCode.PEOPLE_OPS,
      PolarisRoleCode.SUPER_ADMIN,
    ]);
    expect(r.primaryLayout).toBe(ShellLayout.ADMIN);
    expect(r.homePath).toBe('/people-ops/dashboard');
    expect(
      r.secondaryLayouts.some((s) => s.layout === ShellLayout.PEOPLE_OPS),
    ).toBe(true);
  });

  it('maps employee-only to employee home', () => {
    const r = resolveShellLayout([PolarisRoleCode.EMPLOYEE]);
    expect(r.primaryLayout).toBe(ShellLayout.EMPLOYEE);
    expect(r.homePath).toBe('/employee/home');
    expect(r.secondaryLayouts).toEqual([]);
  });

  it('maps contractor before falling through to employee', () => {
    const r = resolveShellLayout([PolarisRoleCode.CONTRACTOR]);
    expect(r.primaryLayout).toBe(ShellLayout.CONTRACTOR);
    expect(r.homePath).toBe('/contractor/dashboard');
  });

  it('defaults unknown/empty roles to employee', () => {
    expect(resolveShellLayout([]).primaryLayout).toBe(ShellLayout.EMPLOYEE);
  });
});

describe('modulesForLayout', () => {
  it('keeps employee primary destinations short (no leave top-level)', () => {
    const mods = modulesForLayout(ShellLayout.EMPLOYEE);
    const primary = mods.filter((m) => m.group === 'primary').map((m) => m.id);
    expect(primary).toEqual(
      expect.arrayContaining(['home', 'calendar', 'hub', 'me']),
    );
    expect(primary).not.toContain('leave');
    expect(mods.some((m) => m.id === 'leave' && m.group === 'more')).toBe(true);
  });

  it('includes setup for people_ops', () => {
    const mods = modulesForLayout(ShellLayout.PEOPLE_OPS);
    expect(mods.some((m) => m.id === 'setup' && m.href === '/admin/setup')).toBe(
      true,
    );
  });
});
