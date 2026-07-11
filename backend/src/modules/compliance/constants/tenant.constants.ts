export const DIGITARO_TENANT_ID = 'a0000000-0000-4000-8000-000000000001';

/** Well-known actor for system/BullMQ jobs writing audit_log (UUID, not a login user). */
export const SYSTEM_ACTOR_ID = '00000000-0000-4000-8000-000000000099';

/**
 * Well-known actor for magic-link/token-authenticated candidate actions
 * (e.g. pre-boarding) that have no Better Auth session / UserEntity row.
 * The specific packet/entity id is always recorded as `entityId`.
 */
export const CANDIDATE_ACTOR_ID = '00000000-0000-4000-8000-000000000098';
