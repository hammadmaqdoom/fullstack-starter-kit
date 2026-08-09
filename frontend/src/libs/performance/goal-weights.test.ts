import { describe, expect, it } from 'vitest';
import {
  sumGoalWeights,
  wouldExceedGoalWeightCap,
} from './goal-weights';

describe('goal-weights', () => {
  it('sums weights', () => {
    expect(sumGoalWeights([{ weightPercent: 40 }, { weightPercent: 60 }])).toBe(
      100,
    );
  });

  it('detects exceeding 100', () => {
    expect(
      wouldExceedGoalWeightCap([{ weightPercent: 80 }], 30),
    ).toBe(true);
    expect(
      wouldExceedGoalWeightCap([{ weightPercent: 70 }], 30),
    ).toBe(false);
  });
});
