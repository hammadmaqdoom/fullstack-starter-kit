import { describe, expect, it } from 'vitest';
import {
  countActiveOnboardings,
  filterAckGaps,
  sumPendingAcknowledgements,
} from './people-ops-dashboard.metrics';

describe('people-ops-dashboard.metrics', () => {
  it('sums pending acknowledgements across policies', () => {
    expect(
      sumPendingAcknowledgements([
        { pendingCount: 3 },
        { pendingCount: 0 },
        { pendingCount: 5 },
      ]),
    ).toBe(8);
  });

  it('filters policies with acknowledgement gaps', () => {
    expect(
      filterAckGaps([
        { policyCode: 'A', pendingCount: 2 },
        { policyCode: 'B', pendingCount: 0 },
        { policyCode: 'C', pendingCount: 1 },
      ]),
    ).toEqual([
      { policyCode: 'A', pendingCount: 2 },
      { policyCode: 'C', pendingCount: 1 },
    ]);
  });

  it('counts onboardings that are not complete', () => {
    expect(
      countActiveOnboardings({
        not_started: [{ id: '1' }],
        in_progress: [{ id: '2' }, { id: '3' }],
        blocked: [{ id: '4' }],
        complete: [{ id: '5' }],
      }),
    ).toBe(4);
  });
});
