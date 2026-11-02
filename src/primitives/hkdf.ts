export async function hkdf(
  ikm: BufferSource,
  hash: string,
  salt: BufferSource,
  info: BufferSource,
  length: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    ikm,
    "HKDF",
    false,
    ["deriveBits"],
  );

  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: "HKDF", hash, salt, info },
    key,
    length * 8,
  );

  return new Uint8Array(bits);
}
