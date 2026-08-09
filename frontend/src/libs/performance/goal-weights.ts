export function sumGoalWeights(
  goals: { weightPercent?: number | null }[],
): number {
  return goals.reduce((sum, g) => sum + (g.weightPercent ?? 0), 0);
}

export function wouldExceedGoalWeightCap(
  existing: { weightPercent?: number | null }[],
  proposedWeight: number,
): boolean {
  return sumGoalWeights(existing) + proposedWeight > 100;
}
