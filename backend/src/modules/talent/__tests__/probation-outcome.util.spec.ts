import {
  computeProbationEndAfterConfirm,
  computeProbationEndAfterExtend,
} from '../probation-outcome.util';

describe('probation-outcome.util', () => {
  describe('computeProbationEndAfterConfirm', () => {
    it('clears probation end date', () => {
      expect(computeProbationEndAfterConfirm()).toBeNull();
    });
  });

  describe('computeProbationEndAfterExtend', () => {
    it('extends from current end when it is in the future', () => {
      expect(
        computeProbationEndAfterExtend({
          currentEndDate: '2026-09-01',
          today: '2026-08-10',
          extensionDays: 90,
        }),
      ).toBe('2026-11-30');
    });

    it('extends from today when current end is past or null', () => {
      expect(
        computeProbationEndAfterExtend({
          currentEndDate: '2026-07-01',
          today: '2026-08-10',
          extensionDays: 30,
        }),
      ).toBe('2026-09-09');

      expect(
        computeProbationEndAfterExtend({
          currentEndDate: null,
          today: '2026-08-10',
          extensionDays: 30,
        }),
      ).toBe('2026-09-09');
    });

    it('rejects invalid extension days', () => {
      expect(() =>
        computeProbationEndAfterExtend({
          currentEndDate: null,
          today: '2026-08-10',
          extensionDays: 0,
        }),
      ).toThrow(/extension/i);
    });
  });
});
