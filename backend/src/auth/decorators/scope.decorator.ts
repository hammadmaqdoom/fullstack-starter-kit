import { SetMetadata } from '@nestjs/common';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { REQUIRED_SCOPE_KEY } from '@/constants/rbac.constant';

export const Scope = (scope: ScopeType) => SetMetadata(REQUIRED_SCOPE_KEY, scope);
