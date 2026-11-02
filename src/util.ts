export function chunks(array: Uint8Array<ArrayBuffer>, chunkSize: number) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.subarray(i, i + chunkSize));
  }
  return chunks;
}

export function stringToBytes(str: string) {
  return new TextEncoder().encode(str);
}

export function bytesToString(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

export function concatBytes(a: Uint8Array, b: Uint8Array) {
  const merged = new Uint8Array(a.length + b.length);
  merged.set(a);
  merged.set(b, a.length);
  return merged;
}

export function nonceToBytes(int: bigint) {
  const bytes = new Uint8Array(12);
  new DataView(bytes.buffer).setBigUint64(4, int);
  return bytes;
}
