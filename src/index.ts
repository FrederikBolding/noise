import { establishConnection } from "./noise.ts";
import { createMockTransports } from "./transport/MockTransport.ts";
import { stringToBytes, bytesToString } from "./util.ts";

async function main() {
  const { a, b } = createMockTransports();
  const [connectionA, connectionB] = await Promise.all([
    establishConnection({ transport: a, initiator: true }),
    establishConnection({ transport: b, initiator: false }),
  ]);

  await connectionA.write(stringToBytes("Ping!"));
  console.log(bytesToString(await connectionB.read()));
  await connectionB.write(stringToBytes("Pong!"));
  console.log(bytesToString(await connectionA.read()));
}

main().catch(console.error);
