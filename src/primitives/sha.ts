export async function sha256(input: BufferSource) {
  return new Uint8Array(
    await globalThis.crypto.subtle.digest("SHA-256", input),
  );
}
