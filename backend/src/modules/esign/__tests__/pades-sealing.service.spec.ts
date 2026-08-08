import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocument } from 'pdf-lib';
import { CertificateSigner } from '../crypto/azure-key-vault-signer';
import { EsignBlobStorageService } from '../esign-blob-storage.service';
import { PadesSealingService } from '../pades-sealing.service';
import {
  generateSelfSignedCertificate,
  localRsaSignDigest,
} from './test-helpers';

/** Builds a minimal spec-valid single-page PDF via pdf-lib (has no signature placeholder yet). */
async function buildMinimalPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  // Classic xref table + trailer — @signpdf/placeholder-plain does not
  // support PDF 1.5+ cross-reference streams (pdf-lib's default).
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

describe('PadesSealingService', () => {
  let service: PadesSealingService;
  let blobStorage: jest.Mocked<
    Pick<EsignBlobStorageService, 'upload' | 'download'>
  >;
  let configValues: Record<string, string | undefined>;
  let minimalPdf: Buffer;

  const buildModule = async (): Promise<TestingModule> => {
    blobStorage = {
      upload: jest
        .fn()
        .mockResolvedValue(
          'https://bucket.s3.amazonaws.com/esign/sealed/env-1-sealed.pdf',
        ),
      download: jest.fn().mockResolvedValue(minimalPdf),
    };

    return Test.createTestingModule({
      providers: [
        PadesSealingService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => configValues[key] },
        },
        { provide: EsignBlobStorageService, useValue: blobStorage },
      ],
    }).compile();
  };

  beforeAll(async () => {
    minimalPdf = await buildMinimalPdf();
  });

  beforeEach(() => {
    configValues = {};
  });

  it('isConfigured() is false when Key Vault env vars are missing', async () => {
    const module = await buildModule();
    service = module.get(PadesSealingService);

    expect(service.isConfigured()).toBe(false);
  });

  it('isConfigured() is true when AZURE_KEY_VAULT_URL + ESIGN_SIGNING_CERT_NAME are set', async () => {
    configValues.AZURE_KEY_VAULT_URL = 'https://vault.example.vault.azure.net';
    configValues.ESIGN_SIGNING_CERT_NAME = 'polaris-esign-cert';
    const module = await buildModule();
    service = module.get(PadesSealingService);

    expect(service.isConfigured()).toBe(true);
  });

  it('seal() returns not_configured without touching blob storage when unconfigured', async () => {
    const module = await buildModule();
    service = module.get(PadesSealingService);

    const result = await service.seal({
      envelopeId: 'env-1',
      tenantId: 'tenant-1',
      documentBlobUrl: 'https://bucket.s3.amazonaws.com/doc.pdf',
    });

    expect(result).toEqual({
      sealed: false,
      sealedBlobUrl: null,
      reason: 'not_configured',
    });
    expect(blobStorage.download).not.toHaveBeenCalled();
  });

  it('seal() returns no_document when configured but there is nothing to seal', async () => {
    configValues.AZURE_KEY_VAULT_URL = 'https://vault.example.vault.azure.net';
    configValues.ESIGN_SIGNING_CERT_NAME = 'polaris-esign-cert';
    const module = await buildModule();
    service = module.get(PadesSealingService);

    const result = await service.seal({
      envelopeId: 'env-1',
      tenantId: 'tenant-1',
      documentBlobUrl: null,
    });

    expect(result).toEqual({
      sealed: false,
      sealedBlobUrl: null,
      reason: 'no_document',
    });
  });

  it('seal() downloads, signs, and uploads the sealed PDF when configured', async () => {
    configValues.AZURE_KEY_VAULT_URL = 'https://vault.example.vault.azure.net';
    configValues.ESIGN_SIGNING_CERT_NAME = 'polaris-esign-cert';
    const module = await buildModule();
    service = module.get(PadesSealingService);

    const { certificatePem, privateKey } = generateSelfSignedCertificate();
    const fakeCertificateSigner: CertificateSigner = {
      getSigningCertificatePem: jest.fn().mockResolvedValue(certificatePem),
      signDigest: jest.fn(localRsaSignDigest(privateKey)),
    };
    // Bypass the real Azure SDK constructor — inject a fake signer directly.
    (
      service as unknown as { certificateSigner: CertificateSigner }
    ).certificateSigner = fakeCertificateSigner;

    const result = await service.seal({
      envelopeId: 'env-1',
      tenantId: 'tenant-1',
      documentBlobUrl: 'https://bucket.s3.amazonaws.com/doc.pdf',
    });

    expect(blobStorage.download).toHaveBeenCalledWith(
      'https://bucket.s3.amazonaws.com/doc.pdf',
    );
    expect(fakeCertificateSigner.signDigest).toHaveBeenCalled();
    expect(blobStorage.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      'esign/sealed',
      'env-1-sealed.pdf',
    );
    expect(result).toEqual({
      sealed: true,
      sealedBlobUrl:
        'https://bucket.s3.amazonaws.com/esign/sealed/env-1-sealed.pdf',
      reason: 'sealed_pades_b_b',
    });
  });
});
