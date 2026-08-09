import { ForbiddenException } from '@nestjs/common';
import { DIGITARO_TENANT_ID } from '../constants/tenant.constants';
import { assertSameTenant, resolveTenantId } from '../tenant-context.util';

const OTHER_TENANT = 'b0000000-0000-4000-8000-000000000099';

describe('tenant-context', () => {
  it('resolveTenantId returns Digitaro tenant in v1', () => {
    expect(resolveTenantId({ user: { id: 'u1' } })).toBe(DIGITARO_TENANT_ID);
  });

  it('assertSameTenant throws when tenants differ', () => {
    expect(() => assertSameTenant(DIGITARO_TENANT_ID, OTHER_TENANT)).toThrow(
      ForbiddenException,
    );
  });

  it('assertSameTenant allows matching tenant', () => {
    expect(() =>
      assertSameTenant(DIGITARO_TENANT_ID, DIGITARO_TENANT_ID),
    ).not.toThrow();
  });
});
