import forge from 'node-forge';
import { signDetachedCms } from '../crypto/pkcs7-cms.util';
import {
  embedTimestampToken,
  requestTimestampToken,
} from '../crypto/rfc3161-timestamp.util';
import {
  generateSelfSignedCertificate,
  localRsaSignDigest,
} from './test-helpers';

const asn1 = forge.asn1;

function buildFakeTimeStampResponse(
  statusCode: number,
  includeToken: boolean,
): Buffer {
  const statusInfo = asn1.create(
    asn1.Class.UNIVERSAL,
    asn1.Type.SEQUENCE,
    true,
    [
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.INTEGER,
        false,
        asn1.integerToDer(statusCode).getBytes(),
      ),
    ],
  );
  const values: forge.asn1.Asn1[] = [statusInfo];
  if (includeToken) {
    // Stand-in TimeStampToken (real ones are CMS SignedData ContentInfo).
    values.push(
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer(forge.pki.oids.signedData).getBytes(),
        ),
      ]),
    );
  }
  const resp = asn1.create(
    asn1.Class.UNIVERSAL,
    asn1.Type.SEQUENCE,
    true,
    values,
  );
  return Buffer.from(asn1.toDer(resp).getBytes(), 'binary');
}

describe('requestTimestampToken', () => {
  it('returns the timestamp token DER bytes when the TSA grants the request', async () => {
    const httpPost = jest
      .fn()
      .mockResolvedValue(buildFakeTimeStampResponse(0, true));

    const token = await requestTimestampToken({
      tsaUrl: 'https://tsa.example.com',
      signatureBytes: Buffer.from('signature-bytes'),
      httpPost,
    });

    expect(token).toBeInstanceOf(Buffer);
    expect(token.length).toBeGreaterThan(0);
    expect(httpPost).toHaveBeenCalledWith(
      'https://tsa.example.com',
      expect.any(Buffer),
    );
  });

  it('accepts grantedWithMods (status 1)', async () => {
    const httpPost = jest
      .fn()
      .mockResolvedValue(buildFakeTimeStampResponse(1, true));

    const token = await requestTimestampToken({
      tsaUrl: 'https://tsa.example.com',
      signatureBytes: Buffer.from('signature-bytes'),
      httpPost,
    });

    expect(token.length).toBeGreaterThan(0);
  });

  it('throws when the TSA rejects the request', async () => {
    const httpPost = jest
      .fn()
      .mockResolvedValue(buildFakeTimeStampResponse(2, false));

    await expect(
      requestTimestampToken({
        tsaUrl: 'https://tsa.example.com',
        signatureBytes: Buffer.from('signature-bytes'),
        httpPost,
      }),
    ).rejects.toThrow(/PKIStatus/);
  });
});

describe('embedTimestampToken', () => {
  it('appends unauthenticatedAttributes carrying the timestamp token to the SignerInfo', async () => {
    const { certificatePem, privateKey } = generateSelfSignedCertificate();
    const { cmsDer } = await signDetachedCms({
      content: Buffer.from('content'),
      certificatePem,
      signingTime: new Date('2026-01-01T00:00:00Z'),
      signDigest: localRsaSignDigest(privateKey),
    });

    const fakeResponse = buildFakeTimeStampResponse(0, true);
    const parsedResp = asn1.fromDer(
      forge.util.createBuffer(fakeResponse.toString('binary')),
    );
    const tsTokenDer = Buffer.from(
      asn1.toDer((parsedResp.value as forge.asn1.Asn1[])[1]).getBytes(),
      'binary',
    );

    const embedded = embedTimestampToken(cmsDer, tsTokenDer);
    expect(embedded.length).toBeGreaterThan(cmsDer.length);

    const parsed = asn1.fromDer(
      forge.util.createBuffer(embedded.toString('binary')),
    );
    const signedData = (parsed.value[1] as forge.asn1.Asn1)
      .value[0] as forge.asn1.Asn1;
    const signerInfos = signedData.value[
      signedData.value.length - 1
    ] as forge.asn1.Asn1;
    const signerInfo = signerInfos.value[0] as forge.asn1.Asn1;
    const lastField = (signerInfo.value as forge.asn1.Asn1[])[
      (signerInfo.value as forge.asn1.Asn1[]).length - 1
    ];

    expect(lastField.tagClass).toBe(asn1.Class.CONTEXT_SPECIFIC);
    expect(lastField.type).toBe(1);
  });
});
