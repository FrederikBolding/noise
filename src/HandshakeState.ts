import { Buffer } from "./Buffer.ts";
import {
  generateKeyPair,
  getSharedSecret,
  type KeyPair,
} from "./primitives/x25519.ts";
import { SymmetricState } from "./SymmetricState.ts";

// Hardcoded for X25519 for now
const DH_LENGTH = 32;

export class HandshakeState {
  #symmetric: SymmetricState;

  #pattern: string[][];
  #initiator;
  #staticKeyPair: KeyPair;
  #ephemeralKeyPair: KeyPair;
  #remoteStaticPublicKey;
  #remoteEphemeralPublicKey;

  async initialize(
    initiator: boolean,
    prologue: Uint8Array<ArrayBuffer> = new Uint8Array(),
    staticKeyPair?: KeyPair,
  ) {
    this.#symmetric = new SymmetricState();
    this.#initiator = initiator;
    this.#staticKeyPair = staticKeyPair;
    this.#pattern = [["e"], ["e", "ee", "s", "es"], ["s", "se"]];

    // TODO: Stop hardcoding protocol
    await this.#symmetric.initialize("Noise_XX_25519_AESGCM_SHA256");

    await this.#symmetric.mixHash(prologue);
  }

  isFinished() {
    return this.#pattern.length === 0;
  }

  async split() {
    const [cipher1, cipher2] = await this.#symmetric.split();
    return this.#initiator ? [cipher1, cipher2] : [cipher2, cipher1];
  }

  async writeMessage(payload: Uint8Array<ArrayBuffer>) {
    const tokens = this.#pattern.shift();

    if (!tokens) {
      return this.split();
    }

    const buffer = new Buffer();

    for (const token of tokens) {
      switch (token) {
        case "e": {
          this.#ephemeralKeyPair = await generateKeyPair();
          const publicKey = this.#ephemeralKeyPair.publicKey;
          await this.#symmetric.mixHash(publicKey);
          buffer.write(publicKey);
          break;
        }
        case "s": {
          buffer.write(
            await this.#symmetric.encryptAndHash(this.#staticKeyPair.publicKey),
          );
          break;
        }
        case "ee": {
          await this.#symmetric.mixKey(
            await getSharedSecret(
              this.#ephemeralKeyPair.privateKey,
              this.#remoteEphemeralPublicKey,
            ),
          );
          break;
        }
        case "es": {
          await this.#symmetric.mixKey(
            await getSharedSecret(
              this.#initiator
                ? this.#ephemeralKeyPair.privateKey
                : this.#staticKeyPair.privateKey,
              this.#initiator
                ? this.#remoteStaticPublicKey
                : this.#remoteEphemeralPublicKey,
            ),
          );
          break;
        }
        case "se": {
          await this.#symmetric.mixKey(
            await getSharedSecret(
              this.#initiator
                ? this.#staticKeyPair.privateKey
                : this.#ephemeralKeyPair.privateKey,
              this.#initiator
                ? this.#remoteEphemeralPublicKey
                : this.#remoteStaticPublicKey,
            ),
          );
          break;
        }
        case "ss": {
          await this.#symmetric.mixKey(
            await getSharedSecret(
              this.#staticKeyPair.privateKey,
              this.#remoteStaticPublicKey,
            ),
          );
          break;
        }
        default:
          throw new Error(`Token "${token}" not implemented.`);
      }
    }

    const encrypted = await this.#symmetric.encryptAndHash(payload);
    buffer.write(encrypted);

    return buffer.toArray();
  }

  async readMessage(message: Uint8Array<ArrayBuffer>) {
    const tokens = this.#pattern.shift();

    if (!tokens) {
      return this.split();
    }

    const buffer = new Buffer(message);

    for (const token of tokens) {
      switch (token) {
        case "e": {
          const publicKey = buffer.read(DH_LENGTH);
          this.#remoteEphemeralPublicKey = publicKey;
          await this.#symmetric.mixHash(publicKey);
          break;
        }
        case "s": {
          const ciphertext = buffer.read(
            this.#symmetric.hasKey() ? DH_LENGTH + 16 : DH_LENGTH,
          );
          this.#remoteStaticPublicKey =
            await this.#symmetric.decryptAndHash(ciphertext);
          break;
        }
        case "ee": {
          await this.#symmetric.mixKey(
            await getSharedSecret(
              this.#ephemeralKeyPair.privateKey,
              this.#remoteEphemeralPublicKey,
            ),
          );
          break;
        }
        case "es": {
          await this.#symmetric.mixKey(
            await getSharedSecret(
              this.#initiator
                ? this.#ephemeralKeyPair.privateKey
                : this.#staticKeyPair.privateKey,
              this.#initiator
                ? this.#remoteStaticPublicKey
                : this.#remoteEphemeralPublicKey,
            ),
          );
          break;
        }
        case "se": {
          await this.#symmetric.mixKey(
            await getSharedSecret(
              this.#initiator
                ? this.#staticKeyPair.privateKey
                : this.#ephemeralKeyPair.privateKey,
              this.#initiator
                ? this.#remoteEphemeralPublicKey
                : this.#remoteStaticPublicKey,
            ),
          );
          break;
        }
        case "ss": {
          await this.#symmetric.mixKey(
            await getSharedSecret(
              this.#staticKeyPair.privateKey,
              this.#remoteStaticPublicKey,
            ),
          );
          break;
        }
        default:
          throw new Error(`Token "${token}" not implemented.`);
      }
    }

    const decrypted = await this.#symmetric.decryptAndHash(buffer.toArray());
    return decrypted;
  }
}
