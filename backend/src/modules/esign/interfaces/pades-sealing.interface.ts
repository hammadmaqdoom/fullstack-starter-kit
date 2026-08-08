/**
 * PAdES sealing + Key Vault cert retrieval.
 * Real crypto must not be faked — stub logs "not configured".
 */
export const PADES_SEALING_SERVICE = Symbol('PADES_SEALING_SERVICE');

export type PadesSealRequest = {
  envelopeId: string;
  tenantId: string;
  documentBlobUrl: string | null;
};

export type PadesSealResult = {
  sealed: boolean;
  sealedBlobUrl: string | null;
  reason: string;
};

export interface IPadesSealingService {
  /**
   * Apply PKCS#7 / PAdES-B-T seal using org cert from Azure Key Vault.
   * Stub implementations must return sealed:false without inventing crypto.
   */
  seal(request: PadesSealRequest): Promise<PadesSealResult>;

  /** Whether Key Vault + TSA are configured for this environment. */
  isConfigured(): boolean;
}
