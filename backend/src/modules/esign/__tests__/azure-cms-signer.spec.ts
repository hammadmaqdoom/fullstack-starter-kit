import { AzureCmsSigner } from '../crypto/azure-cms-signer';
import { CertificateSigner } from '../crypto/azure-key-vault-signer';
import * as rfc3161 from '../crypto/rfc3161-timestamp.util';
import {
  generateSelfSignedCertificate,
  localRsaSignDigest,
} from './test-helpers';

describe('AzureCmsSigner', () => {
  it('returns a plain PAdES-B-B CMS signature when no TSA is configured', async () => {
    const { certificatePem, privateKey } = generateSelfSignedCertificate();
    const certificateSigner: CertificateSigner = {
      getSigningCertificatePem: jest.fn().mockResolvedValue(certificatePem),
      signDigest: jest.fn(localRsaSignDigest(privateKey)),
    };

    const signer = new AzureCmsSigner({
      certificateSigner,
      certificatePem,
      signingTime: new Date('2026-01-01T00:00:00Z'),
    });

    const signature = await signer.sign(Buffer.from('pdf byte range content'));

    expect(signature).toBeInstanceOf(Buffer);
    expect(signature.length).toBeGreaterThan(0);
    expect(certificateSigner.signDigest).toHaveBeenCalledTimes(1);
  });

  it('embeds an RFC 3161 timestamp when a TSA URL is configured', async () => {
    const { certificatePem, privateKey } = generateSelfSignedCertificate();
    const certificateSigner: CertificateSigner = {
      getSigningCertificatePem: jest.fn().mockResolvedValue(certificatePem),
      signDigest: jest.fn(localRsaSignDigest(privateKey)),
    };

    const requestTimestampTokenSpy = jest
      .spyOn(rfc3161, 'requestTimestampToken')
      .mockResolvedValue(Buffer.from('fake-ts-token'));
    const embedTimestampTokenSpy = jest
      .spyOn(rfc3161, 'embedTimestampToken')
      .mockImplementation((cmsDer) =>
        Buffer.concat([cmsDer, Buffer.from('+ts')]),
      );

    const signer = new AzureCmsSigner({
      certificateSigner,
      certificatePem,
      signingTime: new Date('2026-01-01T00:00:00Z'),
      tsaUrl: 'https://tsa.example.com',
    });

    const signature = await signer.sign(Buffer.from('pdf byte range content'));

    expect(requestTimestampTokenSpy).toHaveBeenCalledTimes(1);
    expect(embedTimestampTokenSpy).toHaveBeenCalledTimes(1);
    expect(signature.toString('binary').endsWith('+ts')).toBe(true);

    requestTimestampTokenSpy.mockRestore();
    embedTimestampTokenSpy.mockRestore();
  });

  it('falls back to PAdES-B-B and reports the error when the TSA fails', async () => {
    const { certificatePem, privateKey } = generateSelfSignedCertificate();
    const certificateSigner: CertificateSigner = {
      getSigningCertificatePem: jest.fn().mockResolvedValue(certificatePem),
      signDigest: jest.fn(localRsaSignDigest(privateKey)),
    };

    const requestTimestampTokenSpy = jest
      .spyOn(rfc3161, 'requestTimestampToken')
      .mockRejectedValue(new Error('TSA unreachable'));
    const onTimestampError = jest.fn();

    const signer = new AzureCmsSigner({
      certificateSigner,
      certificatePem,
      signingTime: new Date('2026-01-01T00:00:00Z'),
      tsaUrl: 'https://tsa.example.com',
      onTimestampError,
    });

    const signature = await signer.sign(Buffer.from('pdf byte range content'));

    expect(signature).toBeInstanceOf(Buffer);
    expect(signature.length).toBeGreaterThan(0);
    expect(onTimestampError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'TSA unreachable',
      }),
    );

    requestTimestampTokenSpy.mockRestore();
  });
});
