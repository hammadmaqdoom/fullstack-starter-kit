import forge from 'node-forge';

/** Throwaway self-signed cert/key so crypto tests never touch real Key Vault or network. */
export function generateSelfSignedCertificate(): {
  certificatePem: string;
  privateKey: forge.pki.rsa.PrivateKey;
} {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 1024 });
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const attrs = [{ name: 'commonName', value: 'Digitaro Polaris Test' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return {
    certificatePem: forge.pki.certificateToPem(cert),
    privateKey: keys.privateKey,
  };
}

/** Wraps a local forge RSA key as a `signDigest(digest) => Buffer` function, mimicking Key Vault. */
export function localRsaSignDigest(privateKey: forge.pki.rsa.PrivateKey) {
  return async (digest: Buffer): Promise<Buffer> =>
    Buffer.from(
      privateKey.sign(
        {
          algorithm: 'sha256',
          digest: () => forge.util.createBuffer(digest.toString('binary')),
        } as unknown as forge.md.MessageDigest,
        'RSASSA-PKCS1-V1_5',
      ),
      'binary',
    );
}
