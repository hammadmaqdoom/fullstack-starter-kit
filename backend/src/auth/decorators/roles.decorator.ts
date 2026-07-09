import { SetMetadata } from '@nestjs/common';
import { REQUIRED_ROLES_KEY } from '@/constants/rbac.constant';

export const Roles = (...roles: string[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);
