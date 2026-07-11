export enum ScopeType {
  OWN = 'own',
  TEAM = 'team',
  DIVISION = 'division',
  /** Enterprise governance (T2) — HRBP scoped to one legal entity via `scopeId`. */
  LEGAL_ENTITY = 'legal_entity',
  /** Enterprise governance (T2) — HRBP scoped to one country via `scopeCountryCode`. */
  COUNTRY = 'country',
  ALL = 'all',
}

export const SCOPE_BREADTH: Record<ScopeType, number> = {
  [ScopeType.OWN]: 1,
  [ScopeType.TEAM]: 2,
  [ScopeType.DIVISION]: 3,
  [ScopeType.LEGAL_ENTITY]: 4,
  [ScopeType.COUNTRY]: 5,
  [ScopeType.ALL]: 6,
};
