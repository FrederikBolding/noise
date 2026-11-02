import { HandshakeState } from "./HandshakeState.ts";
import { generateKeyPair } from "./primitives/x25519.ts";
import type { Transport } from "./transport/Transport.ts";

export async function establishConnection(
  transport: Transport,
  initiator: boolean,
) {
  const handshake = new HandshakeState();

  const prologue = new Uint8Array();

  const staticKeyPair = await generateKeyPair();

  await handshake.initialize(initiator, prologue, staticKeyPair);

  let writeTurn = initiator;

  while (true) {
    if (writeTurn) {
      const message = await handshake.writeMessage(new Uint8Array());
      await transport.write(message);
    } else {
      const received = await transport.read();
      await handshake.readMessage(received);
    }
    writeTurn = !writeTurn;
  }
}
