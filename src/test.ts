import { establishConnection } from "./noise.ts";
import { createMockTransports } from "./transport/MockTransport.ts";
import { assertEq } from "./util.ts";
import { importKey } from "./primitives/x25519.ts";
import vector from "../test/cacophony.json" with { type: "json" };

async function main() {
  const {
    init_prologue: aPrologue,
    resp_prologue: bPrologue,
    init_static: aStaticKey,
    resp_static: bStaticKey,
    init_ephemeral: aEphemeralKey,
    resp_ephemeral: bEphemeralKey,
    handshake_hash: handshakeHash,
    messages,
  } = vector;
  const { a, b } = createMockTransports();
  const [connectionA, connectionB] = await Promise.all([
    establishConnection({
      transport: a,
      prologue: Uint8Array.fromHex(aPrologue),
      staticKeyPair: await importKey(aStaticKey),
      ephemeralKeyPair: await importKey(aEphemeralKey),
      handshakePayloads: [
        Uint8Array.fromHex(messages[0].payload),
        Uint8Array.fromHex(messages[2].payload),
      ],
      initiator: true,
    }),
    establishConnection({
      transport: b,
      prologue: Uint8Array.fromHex(bPrologue),
      staticKeyPair: await importKey(bStaticKey),
      ephemeralKeyPair: await importKey(bEphemeralKey),
      handshakePayloads: [Uint8Array.fromHex(messages[1].payload)],
      initiator: false,
    }),
  ]);

  assertEq(a.sent[0].toHex(), messages[0].ciphertext);
  assertEq(b.sent[0].toHex(), messages[1].ciphertext);
  assertEq(a.sent[1].toHex(), messages[2].ciphertext);
  assertEq(connectionA.handshakeHash.toHex(), handshakeHash);
  assertEq(connectionB.handshakeHash.toHex(), handshakeHash);
}

main().catch(console.error);
