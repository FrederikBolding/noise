export type KeyPair = {
  privateKey: CryptoKey;
  publicKey: Uint8Array<ArrayBuffer>;
};

export async function generateKeyPair(): Promise<KeyPair> {
  const key = await globalThis.crypto.subtle.generateKey("X25519", true, [
    "deriveKey",
    "deriveBits",
  ]);

  const publicKey = new Uint8Array(
    await globalThis.crypto.subtle.exportKey("raw", key.publicKey),
  );
  return { privateKey: key.privateKey, publicKey };
}

export async function getSharedSecret(
  privateKey: CryptoKey,
  publicKey: BufferSource,
): Promise<Uint8Array<ArrayBuffer>> {
  const subtlePublicKey = await globalThis.crypto.subtle.importKey(
    "raw",
    publicKey,
    { name: "X25519" },
    false,
    [],
  );

  const bits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "X25519",
      public: subtlePublicKey,
    },
    privateKey,
    32 * 8,
  );

  return new Uint8Array(bits);
}
