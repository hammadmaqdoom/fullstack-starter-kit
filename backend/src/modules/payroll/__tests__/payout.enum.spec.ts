import { FundingAccountProvider, PayoutRail } from '../enums/payout.enum';

describe('payout.enum', () => {
  it('defines rails and funding providers', () => {
    expect(PayoutRail.ASPIRE).toBe('aspire');
    expect(PayoutRail.WISE).toBe('wise');
    expect(PayoutRail.MANUAL_BANK).toBe('manual_bank');
    expect(FundingAccountProvider.MANUAL_BANK).toBe('manual_bank');
  });
});
