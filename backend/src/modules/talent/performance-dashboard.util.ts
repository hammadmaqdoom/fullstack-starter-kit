export type ReviewAwaitCountInput = {
  status: string;
  workerId: string;
  managerWorkerId: string | null;
};

export function countReviewsAwaitingMe(
  reviews: ReviewAwaitCountInput[],
  actingWorkerId: string | null,
): number {
  if (!actingWorkerId) {
    return 0;
  }
  return reviews.filter((r) => {
    if (r.status === 'pending_self' && r.workerId === actingWorkerId) {
      return true;
    }
    if (
      r.status === 'pending_manager' &&
      r.managerWorkerId === actingWorkerId
    ) {
      return true;
    }
    return false;
  }).length;
}

export function workerDisplayName(worker: {
  firstName: string;
  lastName: string;
}): string {
  return `${worker.firstName} ${worker.lastName}`.trim();
}
