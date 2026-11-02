import { CipherState } from "./CipherState.ts";
import { hkdf } from "./primitives/hkdf.ts";
import { sha256 } from "./primitives/sha.ts";
import { chunks, concatBytes, stringToBytes } from "./util.ts";

// Hardcoded for SHA-256 for now
const HASH_LENGTH = 32;

export class SymmetricState {
  #cipher: CipherState;
  #chainingKey: Uint8Array<ArrayBuffer>;
  #hash: Uint8Array<ArrayBuffer>;

  async initialize(protocolName: string) {
    const protocolBytes = stringToBytes(protocolName);
    if (protocolName.length <= HASH_LENGTH) {
      this.#hash = new Uint8Array(HASH_LENGTH);
      this.#hash.set(protocolBytes, 0);
    } else {
      this.#hash = await sha256(protocolBytes);
    }
    this.#chainingKey = this.#hash;
    this.#cipher = new CipherState();
  }

  hasKey() {
    return this.#cipher.hasKey();
  }

  async #hkdf(ikm: Uint8Array<ArrayBuffer>, outputs: number) {
    const result = await hkdf(
      ikm,
      "SHA-256",
      this.#chainingKey,
      new Uint8Array(),
      outputs * HASH_LENGTH,
    );

    return chunks(result, HASH_LENGTH);
  }

  async mixKey(ikm: Uint8Array<ArrayBuffer>) {
    const [chainingKey, key] = await this.#hkdf(ikm, 2);
    this.#chainingKey = chainingKey;
    this.#cipher.initialize(key);
  }

  async mixHash(data: Uint8Array<ArrayBuffer>) {
    this.#hash = await sha256(concatBytes(this.#hash, data));
  }

  async encryptAndHash(plaintext: Uint8Array<ArrayBuffer>) {
    const ciphertext = await this.#cipher.encryptWithAd(this.#hash, plaintext);
    await this.mixHash(ciphertext);
    return ciphertext;
  }

  async decryptAndHash(ciphertext: Uint8Array<ArrayBuffer>) {
    const plaintext = await this.#cipher.decryptWithAd(this.#hash, ciphertext);
    await this.mixHash(ciphertext);
    return plaintext;
  }

  async split() {
    const [k1, k2] = await this.#hkdf(new Uint8Array(), 2);

    const cipher1 = new CipherState();
    cipher1.initialize(k1);
    const cipher2 = new CipherState();
    cipher2.initialize(k2);

    return [cipher1, cipher2];
  }
}
