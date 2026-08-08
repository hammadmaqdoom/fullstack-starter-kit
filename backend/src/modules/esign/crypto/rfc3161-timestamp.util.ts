import axios from 'axios';
import { createHash, randomBytes } from 'crypto';
import forge from 'node-forge';

const asn1 = forge.asn1;

const OID_SHA256 = '2.16.840.1.101.3.4.2.1';
/** id-aa-signatureTimeStampToken (RFC 3161 §3.2.6.1 / CAdES-T). */
const OID_SIGNATURE_TIMESTAMP_TOKEN = '1.2.840.113549.1.9.16.2.14';

export type RequestTimestampTokenParams = {
  tsaUrl: string;
  /** The raw RSA signature bytes being timestamped. */
  signatureBytes: Buffer;
  /** Injectable for tests — defaults to a real HTTP POST to the TSA. */
  httpPost?: (url: string, body: Buffer) => Promise<Buffer>;
};

/**
 * Requests an RFC 3161 timestamp token over the signature bytes from a TSA.
 * Returns the DER-encoded TimeStampToken (a CMS ContentInfo) on success.
 */
export async function requestTimestampToken(
  params: RequestTimestampTokenParams,
): Promise<Buffer> {
  const { tsaUrl, signatureBytes } = params;
  const httpPost = params.httpPost ?? defaultHttpPost;

  const messageImprint = createHash('sha256').update(signatureBytes).digest();
  const nonce = randomBytes(16);
  const tsq = buildTimeStampRequest(messageImprint, nonce);

  const responseBody = await httpPost(tsaUrl, tsq);
  const { status, tsTokenDer } = parseTimeStampResponse(responseBody);

  // PKIStatus: 0=granted, 1=grantedWithMods — both usable.
  if (status > 1 || !tsTokenDer) {
    throw new Error(`TSA rejected timestamp request (PKIStatus=${status})`);
  }

  return tsTokenDer;
}

/**
 * Splices an RFC 3161 timestamp token into an existing detached CMS
 * SignedData as an unauthenticated attribute on its (single) SignerInfo,
 * upgrading the signature from PAdES-B-B to PAdES-B-T.
 */
export function embedTimestampToken(
  cmsDer: Buffer,
  tsTokenDer: Buffer,
): Buffer {
  const root = asn1.fromDer(forge.util.createBuffer(cmsDer.toString('binary')));

  // ContentInfo ::= SEQUENCE { contentType OID, content [0] EXPLICIT SignedData }
  const signedDataExplicit = root.value[1] as forge.asn1.Asn1;
  const signedData = signedDataExplicit.value[0] as forge.asn1.Asn1;

  // SignedData.value = [version, digestAlgorithms, contentInfo, certificates?[0], signerInfos SET]
  const signerInfos = signedData.value[
    signedData.value.length - 1
  ] as forge.asn1.Asn1;
  const signerInfo = signerInfos.value[0] as forge.asn1.Asn1;

  const tsTokenAsn1 = asn1.fromDer(
    forge.util.createBuffer(tsTokenDer.toString('binary')),
  );

  const attribute = asn1.create(
    asn1.Class.UNIVERSAL,
    asn1.Type.SEQUENCE,
    true,
    [
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.OID,
        false,
        asn1.oidToDer(OID_SIGNATURE_TIMESTAMP_TOKEN).getBytes(),
      ),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [tsTokenAsn1]),
    ],
  );

  // unauthenticatedAttributes [1] IMPLICIT SET OF Attribute — always last per RFC 2315.
  const unauthenticatedAttributes = asn1.create(
    asn1.Class.CONTEXT_SPECIFIC,
    1,
    true,
    [attribute],
  );
  (signerInfo.value as forge.asn1.Asn1[]).push(unauthenticatedAttributes);

  return Buffer.from(asn1.toDer(root).getBytes(), 'binary');
}

function buildTimeStampRequest(messageImprint: Buffer, nonce: Buffer): Buffer {
  const request = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    // version
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.INTEGER,
      false,
      asn1.integerToDer(1).getBytes(),
    ),
    // messageImprint
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer(OID_SHA256).getBytes(),
        ),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ''),
      ]),
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.OCTETSTRING,
        false,
        messageImprint.toString('binary'),
      ),
    ]),
    // nonce
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.INTEGER,
      false,
      encodeUnsignedIntegerBytes(nonce),
    ),
    // certReq
    asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.BOOLEAN,
      false,
      String.fromCharCode(0xff),
    ),
  ]);

  return Buffer.from(asn1.toDer(request).getBytes(), 'binary');
}

function parseTimeStampResponse(der: Buffer): {
  status: number;
  tsTokenDer: Buffer | null;
} {
  const obj = asn1.fromDer(forge.util.createBuffer(der.toString('binary')));
  const seq = obj.value as forge.asn1.Asn1[];

  const statusInfo = seq[0];
  const statusInt = (statusInfo.value as forge.asn1.Asn1[])[0];
  const statusBytes = statusInt.value as string;
  const status = statusBytes.length ? statusBytes.charCodeAt(0) : 0;

  let tsTokenDer: Buffer | null = null;
  if (seq.length > 1) {
    tsTokenDer = Buffer.from(asn1.toDer(seq[1]).getBytes(), 'binary');
  }

  return { status, tsTokenDer };
}

/** Ensures a DER INTEGER encodes as positive (prepend 0x00 if high bit set). */
function encodeUnsignedIntegerBytes(buf: Buffer): string {
  let bytes = buf;
  if (bytes.length === 0) {
    bytes = Buffer.from([0]);
  } else if (bytes[0] & 0x80) {
    bytes = Buffer.concat([Buffer.from([0]), bytes]);
  }
  return bytes.toString('binary');
}

async function defaultHttpPost(url: string, body: Buffer): Promise<Buffer> {
  const response = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/timestamp-query' },
    responseType: 'arraybuffer',
    timeout: 15_000,
  });
  return Buffer.from(response.data as ArrayBuffer);
}
