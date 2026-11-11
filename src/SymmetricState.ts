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

  constructor(
    cipher: CipherState,
    chainingKey: Uint8Array<ArrayBuffer>,
    hash: Uint8Array<ArrayBuffer>,
  ) {
    this.#cipher = cipher;
    this.#chainingKey = chainingKey;
    this.#hash = hash;
  }

  static async initialize(protocolName: string): Promise<SymmetricState> {
    const hash = await this.initializeHash(protocolName);
    return new SymmetricState(new CipherState(new Uint8Array()), hash, hash);
  }

  static async initializeHash(
    protocolName: string,
  ): Promise<Uint8Array<ArrayBuffer>> {
    const protocolBytes = stringToBytes(protocolName);
    if (protocolName.length <= HASH_LENGTH) {
      const hash = new Uint8Array(HASH_LENGTH);
      hash.set(protocolBytes, 0);
      return hash;
    } else {
      return await sha256(protocolBytes);
    }
  }

  hasKey() {
    return this.#cipher.hasKey();
  }

  get hash() {
    return this.#hash;
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

    return [new CipherState(k1), new CipherState(k2)];
  }
}
