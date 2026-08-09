import { PolicyAckCurrentAdapter } from '../adapters/policy-ack-current.adapter';

describe('PolicyAckCurrentAdapter', () => {
  it('passes when pendingCount is 0', async () => {
    const adapter = new PolicyAckCurrentAdapter({
      getComplianceDashboard: async () => [
        { pendingCount: 0, policyCode: 'AUP', policyVersionId: 'v1' },
      ],
    });

    const result = await adapter.run('tenant-a');
    expect(result.result).toBe('pass');
    expect(result.summary.pendingCount).toBe(0);
  });

  it('fails when pendingCount > 0', async () => {
    const adapter = new PolicyAckCurrentAdapter({
      getComplianceDashboard: async () => [
        { pendingCount: 2, policyCode: 'AUP', policyVersionId: 'v1' },
        { pendingCount: 1, policyCode: 'ISMS', policyVersionId: 'v2' },
      ],
    });

    const result = await adapter.run('tenant-a');
    expect(result.result).toBe('fail');
    expect(result.summary.pendingCount).toBe(3);
  });
});
