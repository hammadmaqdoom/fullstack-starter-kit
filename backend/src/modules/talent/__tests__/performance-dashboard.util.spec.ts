import { countReviewsAwaitingMe } from '../performance-dashboard.util';

describe('countReviewsAwaitingMe', () => {
  it('counts pending_self for acting worker', () => {
    const n = countReviewsAwaitingMe(
      [
        {
          status: 'pending_self',
          workerId: 'w1',
          managerWorkerId: 'm1',
        },
        {
          status: 'pending_manager',
          workerId: 'w1',
          managerWorkerId: 'm1',
        },
      ],
      'w1',
    );
    expect(n).toBe(1);
  });

  it('counts pending_manager where acting user is manager', () => {
    const n = countReviewsAwaitingMe(
      [
        {
          status: 'pending_manager',
          workerId: 'w1',
          managerWorkerId: 'm1',
        },
      ],
      'm1',
    );
    expect(n).toBe(1);
  });

  it('returns 0 when actingWorkerId is null', () => {
    expect(
      countReviewsAwaitingMe(
        [{ status: 'pending_self', workerId: 'w1', managerWorkerId: null }],
        null,
      ),
    ).toBe(0);
  });
});
