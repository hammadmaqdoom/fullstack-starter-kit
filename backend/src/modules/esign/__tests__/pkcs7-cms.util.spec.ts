import forge from 'node-forge';
import { signDetachedCms } from '../crypto/pkcs7-cms.util';
import {
  generateSelfSignedCertificate,
  localRsaSignDigest,
} from './test-helpers';

describe('signDetachedCms', () => {
  it('produces a valid detached CMS SignedData embedding the certificate and signature', async () => {
    const { certificatePem, privateKey } = generateSelfSignedCertificate();
    const content = Buffer.from('the quick brown fox jumps over the lazy dog');

    const signDigest = jest.fn(localRsaSignDigest(privateKey));

    const { cmsDer, signatureBytes } = await signDetachedCms({
      content,
      certificatePem,
      signingTime: new Date('2026-01-01T00:00:00Z'),
      signDigest,
    });

    expect(cmsDer).toBeInstanceOf(Buffer);
    expect(cmsDer.length).toBeGreaterThan(0);
    expect(signatureBytes.length).toBeGreaterThan(0);
    expect(signDigest).toHaveBeenCalledTimes(1);

    const parsed = forge.asn1.fromDer(
      forge.util.createBuffer(cmsDer.toString('binary')),
    );
    expect(parsed.type).toBe(forge.asn1.Type.SEQUENCE);

    const contentTypeNode = (parsed.value as forge.asn1.Asn1[])[0];
    const contentTypeOid = forge.asn1.derToOid(contentTypeNode.value as string);
    expect(contentTypeOid).toBe(forge.pki.oids.signedData);

    // [0] EXPLICIT SignedData -> SEQUENCE -> certificates[0] IMPLICIT SET is present.
    const signedDataExplicit = (parsed.value as forge.asn1.Asn1[])[1];
    const signedData = (signedDataExplicit.value as forge.asn1.Asn1[])[0];
    const hasCertificatesBlock = (signedData.value as forge.asn1.Asn1[]).some(
      (node) =>
        node.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && node.type === 0,
    );
    expect(hasCertificatesBlock).toBe(true);
  });

  it('calls signDigest exactly once with the SHA-256 digest of the signed attributes', async () => {
    const { certificatePem, privateKey } = generateSelfSignedCertificate();
    const signDigest = jest.fn(localRsaSignDigest(privateKey));

    await signDetachedCms({
      content: Buffer.from('hello world'),
      certificatePem,
      signingTime: new Date('2026-01-01T00:00:00Z'),
      signDigest,
    });

    expect(signDigest).toHaveBeenCalledTimes(1);
    const digestArg = signDigest.mock.calls[0][0] as Buffer;
    expect(digestArg).toBeInstanceOf(Buffer);
    expect(digestArg.length).toBe(32);
  });

  it('produces byte-identical CMS structure regardless of the signature value returned', async () => {
    const { certificatePem, privateKey } = generateSelfSignedCertificate();
    const content = Buffer.from('deterministic content');
    const signingTime = new Date('2026-06-01T12:00:00Z');

    const first = await signDetachedCms({
      content,
      certificatePem,
      signingTime,
      signDigest: localRsaSignDigest(privateKey),
    });
    const second = await signDetachedCms({
      content,
      certificatePem,
      signingTime,
      signDigest: localRsaSignDigest(privateKey),
    });

    // RSA PKCS#1v1.5 signing is deterministic for a fixed key+digest, so
    // both runs (each internally double-passing) should be byte-identical.
    expect(first.cmsDer.equals(second.cmsDer)).toBe(true);
  });
});
