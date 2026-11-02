import { decrypt, encrypt } from "./primitives/aes-gcm.ts";
import { nonceToBytes } from "./util.ts";

export class CipherState {
  #key: Uint8Array<ArrayBuffer>;

  #nonce: bigint;

  initialize(key: Uint8Array<ArrayBuffer>) {
    this.#key = key;
    this.#nonce = 0n;
  }

  hasKey() {
    return this.#key !== undefined && this.#key.length > 0;
  }

  async encryptWithAd(
    ad: Uint8Array<ArrayBuffer>,
    plaintext: Uint8Array<ArrayBuffer>,
  ) {
    // According to spec, check if necessary.
    if (!this.#key) {
      return plaintext;
    }

    const result = await encrypt(
      this.#key,
      nonceToBytes(this.#nonce),
      plaintext,
      ad,
    );

    this.#nonce++;

    return result;
  }

  async decryptWithAd(
    ad: Uint8Array<ArrayBuffer>,
    ciphertext: Uint8Array<ArrayBuffer>,
  ) {
    // According to spec, check if necessary.
    if (!this.#key) {
      return ciphertext;
    }

    const result = await decrypt(
      this.#key,
      nonceToBytes(this.#nonce),
      ciphertext,
      ad,
    );

    this.#nonce++;

    return result;
  }
}
