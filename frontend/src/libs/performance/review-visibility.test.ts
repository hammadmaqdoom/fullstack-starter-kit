import { describe, expect, it } from 'vitest';
import {
  canEmployeeSignOff,
  canManagerSignOff,
  canTriggerProbationSeparation,
  canViewManagerFeedback,
} from './review-visibility';

describe('review-visibility', () => {
  it('hides manager feedback until manager has submitted', () => {
    expect(canViewManagerFeedback('pending_self')).toBe(false);
    expect(canViewManagerFeedback('pending_manager')).toBe(false);
  });

  it('shows manager feedback after manager submit', () => {
    expect(canViewManagerFeedback('pending_calibration')).toBe(true);
    expect(canViewManagerFeedback('pending_sign_off')).toBe(true);
    expect(canViewManagerFeedback('completed')).toBe(true);
  });

  it('allows employee sign-off only on pending_sign_off when not signed', () => {
    expect(canEmployeeSignOff('pending_sign_off', false)).toBe(true);
    expect(canEmployeeSignOff('pending_sign_off', true)).toBe(false);
    expect(canEmployeeSignOff('completed', false)).toBe(false);
  });

  it('allows manager sign-off only on pending_sign_off when not signed', () => {
    expect(canManagerSignOff('pending_sign_off', false)).toBe(true);
    expect(canManagerSignOff('pending_sign_off', true)).toBe(false);
  });

  it('allows separation trigger only for terminate probation outcome', () => {
    expect(canTriggerProbationSeparation('terminate')).toBe(true);
    expect(canTriggerProbationSeparation('confirm')).toBe(false);
    expect(canTriggerProbationSeparation(null)).toBe(false);
  });
});
