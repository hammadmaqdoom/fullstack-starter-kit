import { Signer as SignpdfSigner } from '@signpdf/signpdf';
import { CertificateSigner } from './azure-key-vault-signer';
import { signDetachedCms } from './pkcs7-cms.util';
import {
  embedTimestampToken,
  requestTimestampToken,
} from './rfc3161-timestamp.util';

export type AzureCmsSignerOptions = {
  certificateSigner: CertificateSigner;
  certificatePem: string;
  signingTime: Date;
  /** RFC 3161 TSA endpoint — when set, upgrades PAdES-B-B to PAdES-B-T. */
  tsaUrl?: string;
  onTimestampError?: (error: Error) => void;
};

/**
 * `@signpdf/signpdf` Signer implementation that produces a real PKCS#7
 * detached signature using a certificate/key held in Azure Key Vault, with
 * an optional RFC 3161 timestamp for PAdES-B-T.
 */
export class AzureCmsSigner extends SignpdfSigner {
  constructor(private readonly options: AzureCmsSignerOptions) {
    super();
  }

  async sign(pdfBuffer: Buffer): Promise<Buffer> {
    const {
      certificateSigner,
      certificatePem,
      signingTime,
      tsaUrl,
      onTimestampError,
    } = this.options;

    const { cmsDer, signatureBytes } = await signDetachedCms({
      content: pdfBuffer,
      certificatePem,
      signingTime,
      signDigest: (digest) => certificateSigner.signDigest(digest),
    });

    if (!tsaUrl) {
      return cmsDer;
    }

    try {
      const tsToken = await requestTimestampToken({ tsaUrl, signatureBytes });
      return embedTimestampToken(cmsDer, tsToken);
    } catch (err) {
      onTimestampError?.(err as Error);
      return cmsDer;
    }
  }
}
