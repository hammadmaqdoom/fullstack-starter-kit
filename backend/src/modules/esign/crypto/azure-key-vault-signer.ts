import {
  ClientSecretCredential,
  DefaultAzureCredential,
  TokenCredential,
} from '@azure/identity';
import { CertificateClient } from '@azure/keyvault-certificates';
import { CryptographyClient } from '@azure/keyvault-keys';

export interface CertificateSigner {
  /** PEM-encoded X.509 certificate for the signing key (leaf cert only). */
  getSigningCertificatePem(): Promise<string>;
  /** Signs a pre-computed digest with RS256 (RSASSA-PKCS1-v1_5 + SHA-256). */
  signDigest(digest: Buffer): Promise<Buffer>;
}

export type AzureKeyVaultSignerConfig = {
  vaultUrl: string;
  certificateName: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
};

/**
 * Signs digests with a certificate held in Azure Key Vault without ever
 * exporting the private key — the RSA operation happens inside Key Vault.
 */
export class AzureKeyVaultCertificateSigner implements CertificateSigner {
  private readonly credential: TokenCredential;
  private readonly certificateClient: CertificateClient;
  private cachedCertificatePem: string | null = null;
  private cachedKeyId: string | null = null;

  constructor(private readonly config: AzureKeyVaultSignerConfig) {
    this.credential = AzureKeyVaultCertificateSigner.buildCredential(config);
    this.certificateClient = new CertificateClient(
      config.vaultUrl,
      this.credential,
    );
  }

  private static buildCredential(
    config: AzureKeyVaultSignerConfig,
  ): TokenCredential {
    if (config.tenantId && config.clientId && config.clientSecret) {
      return new ClientSecretCredential(
        config.tenantId,
        config.clientId,
        config.clientSecret,
      );
    }
    return new DefaultAzureCredential();
  }

  async getSigningCertificatePem(): Promise<string> {
    if (this.cachedCertificatePem) {
      return this.cachedCertificatePem;
    }

    const certificate = await this.certificateClient.getCertificate(
      this.config.certificateName,
    );
    if (!certificate.cer) {
      throw new Error(
        `Key Vault certificate "${this.config.certificateName}" has no public certificate material`,
      );
    }
    if (!certificate.keyId) {
      throw new Error(
        `Key Vault certificate "${this.config.certificateName}" has no associated signing key`,
      );
    }

    this.cachedKeyId = certificate.keyId.toString();
    this.cachedCertificatePem = derCertificateToPem(certificate.cer);
    return this.cachedCertificatePem;
  }

  async signDigest(digest: Buffer): Promise<Buffer> {
    if (!this.cachedKeyId) {
      await this.getSigningCertificatePem();
    }
    const cryptographyClient = new CryptographyClient(
      this.cachedKeyId as string,
      this.credential,
    );
    const { result } = await cryptographyClient.sign('RS256', digest);
    return Buffer.from(result);
  }
}

function derCertificateToPem(der: Uint8Array): string {
  const base64 = Buffer.from(der).toString('base64');
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.slice(i, i + 64));
  }
  return [
    '-----BEGIN CERTIFICATE-----',
    ...lines,
    '-----END CERTIFICATE-----',
    '',
  ].join('\n');
}
