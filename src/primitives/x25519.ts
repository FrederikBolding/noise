import { concatBytes } from "../util.ts";

export type KeyPair = {
  privateKey: CryptoKey;
  publicKey: Uint8Array<ArrayBuffer>;
};

const PKCS8_HEADER = new Uint8Array([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x04,
  0x22, 0x04, 0x20,
]);

export async function generateKeyPair(): Promise<KeyPair> {
  const key = await globalThis.crypto.subtle.generateKey("X25519", true, [
    "deriveBits",
  ]);

  const publicKey = new Uint8Array(
    await globalThis.crypto.subtle.exportKey("raw", key.publicKey),
  );
  return { privateKey: key.privateKey, publicKey };
}

export async function importKey(secretKey: string): Promise<KeyPair> {
  const key = await globalThis.crypto.subtle.importKey(
    "pkcs8",
    concatBytes(PKCS8_HEADER, Uint8Array.fromHex(secretKey)),
    "X25519",
    true,
    ["deriveBits"],
  );

  const subtlePublicKey = await globalThis.crypto.subtle.getPublicKey(key, []);

  const publicKey = new Uint8Array(
    await globalThis.crypto.subtle.exportKey("raw", subtlePublicKey),
  );
  return { privateKey: key, publicKey };
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
