import type { CipherState } from "./CipherState.ts";
import { HandshakeState } from "./HandshakeState.ts";
import { generateKeyPair, type KeyPair } from "./primitives/x25519.ts";
import type { Transport } from "./transport/Transport.ts";

export class Connection {
  #handshakeHash: Uint8Array<ArrayBuffer>;
  #transport: Transport;
  #tx: CipherState;
  #rx: CipherState;

  constructor(
    transport: Transport,
    handshakeHash: Uint8Array<ArrayBuffer>,
    tx: CipherState,
    rx: CipherState,
  ) {
    this.#handshakeHash = handshakeHash;
    this.#transport = transport;
    this.#tx = tx;
    this.#rx = rx;
  }

  get handshakeHash() {
    return this.#handshakeHash;
  }

  async write(message: Uint8Array<ArrayBuffer>) {
    const ciphertext = await this.#tx.encryptWithAd(new Uint8Array(), message);
    await this.#transport.write(ciphertext);
  }

  async read() {
    const message = await this.#transport.read();
    return this.#rx.decryptWithAd(new Uint8Array(), message);
  }
}

export type ConnectionOptions = {
  transport: Transport;
  initiator: boolean;
  prologue?: Uint8Array<ArrayBuffer>;
  staticKeyPair?: KeyPair;
  ephemeralKeyPair?: KeyPair;
  handshakePayloads?: Uint8Array<ArrayBuffer>[];
};

export async function establishConnection(options: ConnectionOptions) {
  const { tx, rx, hash } = await runHandshake(options);

  const { transport } = options;

  return new Connection(transport, hash, tx, rx);
}

async function runHandshake({
  transport,
  initiator,
  prologue = new Uint8Array(),
  staticKeyPair,
  ephemeralKeyPair,
  handshakePayloads,
}: ConnectionOptions) {
  const handshake = await HandshakeState.initialize(
    initiator,
    prologue,
    staticKeyPair ?? (await generateKeyPair()),
    ephemeralKeyPair,
  );

  let writeTurn = initiator;
  let writeIndex = 0;

  while (!handshake.isFinished()) {
    if (writeTurn) {
      const message = await handshake.writeMessage(
        handshakePayloads?.[writeIndex++] ?? new Uint8Array(),
      );

      if (!(message instanceof Uint8Array)) {
        break;
      }

      await transport.write(message);
    } else {
      const received = await transport.read();
      await handshake.readMessage(received);
    }

    writeTurn = !writeTurn;
  }

  const [tx, rx] = await handshake.split();

  return { tx, rx, hash: handshake.hash };
}
