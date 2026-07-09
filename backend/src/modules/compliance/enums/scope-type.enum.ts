export enum ScopeType {
  OWN = 'own',
  TEAM = 'team',
  DIVISION = 'division',
  ALL = 'all',
}

export const SCOPE_BREADTH: Record<ScopeType, number> = {
  [ScopeType.OWN]: 1,
  [ScopeType.TEAM]: 2,
  [ScopeType.DIVISION]: 3,
  [ScopeType.ALL]: 4,
};
