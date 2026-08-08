/**
 * Microsoft Graph identity operations for Entra provisioning (FLW-SEC-006).
 * Stub implementations must not invent Graph success without credentials.
 */
export const MICROSOFT_GRAPH_IDENTITY = Symbol('MICROSOFT_GRAPH_IDENTITY');

export type GraphProvisionRequest = {
  workerId: string;
  workEmail: string;
  displayName?: string;
};

export type GraphProvisionResult = {
  success: boolean;
  entraObjectId: string | null;
  reason: string;
};

export type GraphDisableRequest = {
  workerId: string;
  entraObjectId: string | null;
};

export type GraphDisableResult = {
  success: boolean;
  reason: string;
};

export interface IMicrosoftGraphIdentityService {
  isConfigured(): boolean;
  createOrEnableUser(
    request: GraphProvisionRequest,
  ): Promise<GraphProvisionResult>;
  disableUser(request: GraphDisableRequest): Promise<GraphDisableResult>;
}
