import type { CipherState } from "./CipherState.ts";
import { HandshakeState } from "./HandshakeState.ts";
import { generateKeyPair } from "./primitives/x25519.ts";
import type { Transport } from "./transport/Transport.ts";

export class Connection {
  #transport: Transport;
  #tx: CipherState;
  #rx: CipherState;

  constructor(transport: Transport, tx: CipherState, rx: CipherState) {
    this.#transport = transport;
    this.#tx = tx;
    this.#rx = rx;
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

export async function establishConnection(
  transport: Transport,
  initiator: boolean,
) {
  const [tx, rx] = await runHandshake(transport, initiator);

  return new Connection(transport, tx, rx);
}

async function runHandshake(transport: Transport, initiator: boolean) {
  const prologue = new Uint8Array();

  const staticKeyPair = await generateKeyPair();

  const handshake = await HandshakeState.initialize(
    initiator,
    prologue,
    staticKeyPair,
  );

  let writeTurn = initiator;

  while (!handshake.isFinished()) {
    if (writeTurn) {
      const message = await handshake.writeMessage(new Uint8Array());

      if (!(message instanceof Uint8Array)) {
        return message;
      }

      await transport.write(message);
    } else {
      const received = await transport.read();
      await handshake.readMessage(received);
    }

    writeTurn = !writeTurn;
  }

  return handshake.split();
}
