const MANAGER_FEEDBACK_VISIBLE = new Set([
  'pending_peer',
  'pending_calibration',
  'pending_sign_off',
  'completed',
  'disputed',
]);

export function canViewManagerFeedback(status: string): boolean {
  return MANAGER_FEEDBACK_VISIBLE.has(status);
}

export function canEmployeeSignOff(
  status: string,
  employeeSignedOff: boolean,
): boolean {
  return status === 'pending_sign_off' && !employeeSignedOff;
}

export function canManagerSignOff(
  status: string,
  managerSignedOff: boolean,
): boolean {
  return status === 'pending_sign_off' && !managerSignedOff;
}

export function canTriggerProbationSeparation(
  probationOutcome: string | null | undefined,
): boolean {
  return probationOutcome === 'terminate';
}
