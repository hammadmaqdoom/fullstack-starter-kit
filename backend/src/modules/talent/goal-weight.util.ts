export type GoalWeightInput = {
  id?: string;
  weightPercent: number;
  status: string;
};

export function sumActiveGoalWeights(
  goals: GoalWeightInput[],
  excludeGoalId?: string,
): number {
  return goals
    .filter((g) => g.status === 'active')
    .filter((g) => (excludeGoalId ? g.id !== excludeGoalId : true))
    .reduce((sum, g) => sum + (g.weightPercent ?? 0), 0);
}

export function assertGoalWeightsDoNotExceed100(
  existingActiveGoals: GoalWeightInput[],
  proposedWeight: number,
  excludeGoalId?: string,
): void {
  const current = sumActiveGoalWeights(existingActiveGoals, excludeGoalId);
  const total = current + (proposedWeight ?? 0);
  if (total > 100) {
    const err = new Error(
      `Active goal weights would exceed 100% (total ${total}%)`,
    );
    (err as Error & { code?: string }).code = 'GOAL_WEIGHT_EXCEEDS_100';
    throw err;
  }
}

export function isGoalWeightTotalComplete(goals: GoalWeightInput[]): boolean {
  if (goals.filter((g) => g.status === 'active').length === 0) {
    return false;
  }
  return sumActiveGoalWeights(goals) === 100;
}
