import { describe, expect, it } from 'vitest';
import { completeClientSignOut } from './complete-client-sign-out';

describe('completeClientSignOut', () => {
  it('clears the session, then replaces to sign-in and refreshes the RSC tree', async () => {
    const calls: string[] = [];

    await completeClientSignOut({
      signOut: async () => {
        calls.push('signOut');
      },
      replace: (href) => {
        calls.push(`replace:${href}`);
      },
      refresh: () => {
        calls.push('refresh');
      },
    });

    expect(calls).toEqual(['signOut', 'replace:/sign-in', 'refresh']);
  });
});
