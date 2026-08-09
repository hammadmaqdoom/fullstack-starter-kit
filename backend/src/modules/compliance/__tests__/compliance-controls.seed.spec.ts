import {
  KNOWN_ADAPTER_KEYS,
  SEED_CONTROLS,
  WAVE1_CONTROL_CODES,
} from '../constants/compliance-controls.seed';

describe('compliance-controls.seed', () => {
  it('has exactly the Wave-1 control codes', () => {
    expect(WAVE1_CONTROL_CODES).toEqual([
      'POL-ACK-CURRENT',
      'POL-VERSION-MANDATORY',
      'ACC-REVIEW-QUARTERLY',
      'ACC-RBAC-SNAPSHOT',
      'ACC-OFFBOARD-ENTRA',
      'PEO-TRAIN-AWARENESS',
      'PEO-ONBOARD-GATE',
      'PEO-SEPARATION-CLEARANCE',
      'PRIV-DSAR-EXPORT',
      'PRIV-RETENTION-5Y',
      'PROC-AUDIT-LOG',
      'PROC-ESIGN-COC',
    ]);
  });

  it('has unique codes', () => {
    expect(new Set(WAVE1_CONTROL_CODES).size).toBe(WAVE1_CONTROL_CODES.length);
  });

  it('only uses known adapter keys or null', () => {
    const known = new Set<string>(KNOWN_ADAPTER_KEYS);
    for (const control of SEED_CONTROLS) {
      if (control.testAdapterKey !== null) {
        expect(known.has(control.testAdapterKey)).toBe(true);
      }
      expect(control.maps.length).toBeGreaterThanOrEqual(2);
    }
  });
});
