import forge from 'node-forge';

const asn1 = forge.asn1;

export type CmsSigningResult = {
  /** DER-encoded PKCS#7/CMS SignedData (detached), ready to embed as /Contents. */
  cmsDer: Buffer;
  /** Raw RSA signature bytes over the signed-attributes digest. */
  signatureBytes: Buffer;
};

export type SignDetachedCmsParams = {
  /** The exact byte range to be signed (already extracted by signpdf). */
  content: Buffer;
  /** PEM-encoded leaf certificate for the signer. */
  certificatePem: string;
  /** Fixed signing time embedded in the signedAttrs (must be deterministic). */
  signingTime: Date;
  /** Performs the actual RSA operation against the pre-computed digest. */
  signDigest: (digest: Buffer) => Promise<Buffer>;
};

/**
 * Builds a detached PKCS#7/CMS SignedData structure (RFC 2315 / CAdES-BES)
 * where the RSA signature itself is produced out-of-process (e.g. Azure Key
 * Vault, which never exposes the private key).
 *
 * node-forge's `p7.sign()` only supports synchronous, locally-held RSA keys.
 * To reconcile that with an async remote signer, we run `p7.sign()` twice:
 * the first pass builds the (deterministic) signedAttrs and captures their
 * digest via a synchronous key stub; we then fetch the real signature for
 * that digest and re-run `p7.sign()` so the real signature is embedded in
 * the final ASN.1 tree. Because content, attributes and signing time never
 * change between passes, both runs produce byte-identical structures except
 * for the signature bytes themselves.
 */
export async function signDetachedCms(
  params: SignDetachedCmsParams,
): Promise<CmsSigningResult> {
  const { content, certificatePem, signingTime, signDigest } = params;
  const certificate = forge.pki.certificateFromPem(certificatePem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(content.toString('binary'));
  p7.addCertificate(certificate);

  let capturedAttrsDigest: string | null = null;
  const keyStub = {
    sign: (md: forge.md.MessageDigest): string => {
      capturedAttrsDigest = md.digest().getBytes();
      return capturedAttrsDigest;
    },
  };

  p7.addSigner({
    key: keyStub as unknown as forge.pki.rsa.PrivateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      {
        type: forge.pki.oids.signingTime,
        value: signingTime as unknown as string,
      },
      { type: forge.pki.oids.messageDigest },
    ],
  });

  p7.sign({ detached: true });

  if (!capturedAttrsDigest) {
    throw new Error(
      'Failed to capture PKCS#7 signed-attributes digest for external signing',
    );
  }

  const signatureBytes = await signDigest(
    Buffer.from(capturedAttrsDigest, 'binary'),
  );

  keyStub.sign = () => signatureBytes.toString('binary');
  p7.sign({ detached: true });

  const cmsDer = Buffer.from(asn1.toDer(p7.toAsn1()).getBytes(), 'binary');
  return { cmsDer, signatureBytes };
}
