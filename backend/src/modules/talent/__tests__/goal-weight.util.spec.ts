import {
  sumActiveGoalWeights,
  assertGoalWeightsDoNotExceed100,
  isGoalWeightTotalComplete,
} from '../goal-weight.util';

describe('goal-weight.util', () => {
  describe('sumActiveGoalWeights', () => {
    it('sums weightPercent of active goals', () => {
      expect(
        sumActiveGoalWeights([
          { weightPercent: 40, status: 'active' },
          { weightPercent: 60, status: 'active' },
        ]),
      ).toBe(100);
    });

    it('ignores non-active goals', () => {
      expect(
        sumActiveGoalWeights([
          { weightPercent: 40, status: 'active' },
          { weightPercent: 60, status: 'cancelled' },
        ]),
      ).toBe(40);
    });

    it('excludes a goal id when recomputing for update', () => {
      expect(
        sumActiveGoalWeights(
          [
            { id: 'g1', weightPercent: 40, status: 'active' },
            { id: 'g2', weightPercent: 60, status: 'active' },
          ],
          'g1',
        ),
      ).toBe(60);
    });
  });

  describe('assertGoalWeightsDoNotExceed100', () => {
    it('throws when proposed total exceeds 100', () => {
      expect(() =>
        assertGoalWeightsDoNotExceed100(
          [{ weightPercent: 80, status: 'active' }],
          30,
        ),
      ).toThrow(/GOAL_WEIGHT_EXCEEDS_100|exceed/i);
    });

    it('allows totals up to 100', () => {
      expect(() =>
        assertGoalWeightsDoNotExceed100(
          [{ weightPercent: 70, status: 'active' }],
          30,
        ),
      ).not.toThrow();
    });
  });

  describe('isGoalWeightTotalComplete', () => {
    it('is true only when active weights sum to exactly 100', () => {
      expect(
        isGoalWeightTotalComplete([
          { weightPercent: 40, status: 'active' },
          { weightPercent: 60, status: 'active' },
        ]),
      ).toBe(true);
      expect(
        isGoalWeightTotalComplete([{ weightPercent: 40, status: 'active' }]),
      ).toBe(false);
      expect(isGoalWeightTotalComplete([])).toBe(false);
    });
  });
});
