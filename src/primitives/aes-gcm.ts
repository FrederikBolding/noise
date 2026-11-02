export async function decrypt(
  key: BufferSource,
  iv: BufferSource,
  ciphertext: BufferSource,
  additionalData?: BufferSource,
): Promise<Uint8Array<ArrayBuffer>> {
  const subtleKey = await globalThis.crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const plaintext = await globalThis.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      ...(additionalData && {
        additionalData,
      }),
    },
    subtleKey,
    ciphertext,
  );

  return new Uint8Array(plaintext);
}

export async function encrypt(
  key: BufferSource,
  iv: BufferSource,
  plaintext: BufferSource,
  additionalData?: BufferSource,
): Promise<Uint8Array<ArrayBuffer>> {
  const imported = await globalThis.crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const ciphertext = await globalThis.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      ...(additionalData && {
        additionalData,
      }),
    },
    imported,
    plaintext,
  );

  return new Uint8Array(ciphertext);
}
