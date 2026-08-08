import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';
import signpdf from '@signpdf/signpdf';
import { SUBFILTER_ETSI_CADES_DETACHED } from '@signpdf/utils';
import { AzureCmsSigner } from './crypto/azure-cms-signer';
import {
  AzureKeyVaultCertificateSigner,
  CertificateSigner,
} from './crypto/azure-key-vault-signer';
import { EsignBlobStorageService } from './esign-blob-storage.service';
import {
  IPadesSealingService,
  PadesSealRequest,
  PadesSealResult,
} from './interfaces/pades-sealing.interface';

const SIGNATURE_LENGTH_B_B = 8192;
/** RFC 3161 tokens (incl. TSA cert chain) need more headroom than a bare CMS signature. */
const SIGNATURE_LENGTH_B_T = 24576;

/**
 * Production PAdES sealer: applies a real PKCS#7 detached signature using a
 * certificate held in Azure Key Vault (private key never leaves the vault),
 * optionally upgraded to PAdES-B-T with an RFC 3161 timestamp.
 *
 * Gated entirely by environment configuration — `isConfigured()` reflects
 * whether AZURE_KEY_VAULT_URL + ESIGN_SIGNING_CERT_NAME are present. When
 * they aren't, `seal()` returns `sealed:false` without attempting any crypto.
 */
@Injectable()
export class PadesSealingService implements IPadesSealingService {
  private readonly logger = new Logger(PadesSealingService.name);
  private readonly vaultUrl?: string;
  private readonly certificateName?: string;
  private readonly tsaUrl?: string;
  private certificateSigner?: CertificateSigner;

  constructor(
    private readonly configService: ConfigService,
    private readonly blobStorage: EsignBlobStorageService,
  ) {
    this.vaultUrl =
      this.configService.get<string>('AZURE_KEY_VAULT_URL') || undefined;
    this.certificateName =
      this.configService.get<string>('ESIGN_SIGNING_CERT_NAME') || undefined;
    this.tsaUrl = this.configService.get<string>('ESIGN_TSA_URL') || undefined;
  }

  isConfigured(): boolean {
    return !!(this.vaultUrl && this.certificateName);
  }

  async seal(request: PadesSealRequest): Promise<PadesSealResult> {
    if (!this.isConfigured()) {
      this.logger.warn(
        `PAdES sealing not configured for envelope ${request.envelopeId} (AZURE_KEY_VAULT_URL / ESIGN_SIGNING_CERT_NAME missing)`,
      );
      return { sealed: false, sealedBlobUrl: null, reason: 'not_configured' };
    }

    if (!request.documentBlobUrl) {
      this.logger.warn(
        `No document to seal for envelope ${request.envelopeId}`,
      );
      return { sealed: false, sealedBlobUrl: null, reason: 'no_document' };
    }

    const sourcePdf = await this.blobStorage.download(request.documentBlobUrl);
    const certificateSigner = this.getCertificateSigner();
    const certificatePem = await certificateSigner.getSigningCertificatePem();

    const hasTsa = !!this.tsaUrl;
    const placeholderPdf = plainAddPlaceholder({
      pdfBuffer: sourcePdf,
      reason: 'Digitaro Polaris e-signature seal',
      contactInfo: 'people-ops@digitaro.com',
      name: 'Digitaro Polaris',
      location: 'Digitaro HRMS',
      subFilter: SUBFILTER_ETSI_CADES_DETACHED,
      signatureLength: hasTsa ? SIGNATURE_LENGTH_B_T : SIGNATURE_LENGTH_B_B,
    });

    const signingTime = new Date();
    let timestampFailed = false;
    const cmsSigner = new AzureCmsSigner({
      certificateSigner,
      certificatePem,
      signingTime,
      tsaUrl: this.tsaUrl,
      onTimestampError: (err) => {
        timestampFailed = true;
        this.logger.error(
          `RFC 3161 timestamp failed for envelope ${request.envelopeId}, falling back to PAdES-B-B: ${err.message}`,
        );
      },
    });

    const signedPdf = await signpdf.sign(
      placeholderPdf,
      cmsSigner,
      signingTime,
    );

    const sealedBlobUrl = await this.blobStorage.upload(
      signedPdf,
      'esign/sealed',
      `${request.envelopeId}-sealed.pdf`,
    );

    return {
      sealed: true,
      sealedBlobUrl,
      reason:
        hasTsa && !timestampFailed ? 'sealed_pades_b_t' : 'sealed_pades_b_b',
    };
  }

  private getCertificateSigner(): CertificateSigner {
    if (!this.certificateSigner) {
      this.certificateSigner = new AzureKeyVaultCertificateSigner({
        vaultUrl: this.vaultUrl as string,
        certificateName: this.certificateName as string,
        tenantId:
          this.configService.get<string>('AZURE_KEY_VAULT_TENANT_ID') ||
          this.configService.get<string>('ENTRA_TENANT_ID') ||
          undefined,
        clientId:
          this.configService.get<string>('AZURE_KEY_VAULT_CLIENT_ID') ||
          undefined,
        clientSecret:
          this.configService.get<string>('AZURE_KEY_VAULT_CLIENT_SECRET') ||
          undefined,
      });
    }
    return this.certificateSigner;
  }
}
