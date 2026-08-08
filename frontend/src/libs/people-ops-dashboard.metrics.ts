export type PendingCountRow = {
  pendingCount: number;
};

export type OnboardingKanbanBoard = {
  not_started?: unknown[];
  in_progress?: unknown[];
  blocked?: unknown[];
  complete?: unknown[];
};

export function sumPendingAcknowledgements(rows: PendingCountRow[]): number {
  return rows.reduce((sum, row) => sum + row.pendingCount, 0);
}

export function filterAckGaps<T extends PendingCountRow>(rows: T[]): T[] {
  return rows.filter(row => row.pendingCount > 0);
}

export function countActiveOnboardings(board: OnboardingKanbanBoard): number {
  return (
    (board.not_started?.length ?? 0)
    + (board.in_progress?.length ?? 0)
    + (board.blocked?.length ?? 0)
  );
}
