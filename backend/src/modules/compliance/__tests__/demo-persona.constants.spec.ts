import {
  DEMO_PASSWORD,
  DEMO_PERSONAS,
} from '../constants/demo-persona.constants';
import { PolarisRoleCode } from '../enums/polaris-role-code.enum';

describe('DEMO_PERSONAS', () => {
  it('includes one account per required role plus second employee', () => {
    const emails = DEMO_PERSONAS.map((p) => p.email);
    expect(DEMO_PASSWORD).toBe('PolarisDemo!2026');
    expect(emails).toContain('employee.demo@digitaro.local');
    expect(emails).toContain('employee2.demo@digitaro.local');
    expect(emails).toContain('manager.demo@digitaro.local');
    expect(emails).toContain('contractor.demo@digitaro.local');
    expect(
      DEMO_PERSONAS.some((p) => p.roleCode === PolarisRoleCode.SUPER_ADMIN),
    ).toBe(true);
    expect(new Set(DEMO_PERSONAS.map((p) => p.userId)).size).toBe(
      DEMO_PERSONAS.length,
    );
  });
});
