import { establishConnection } from "./noise.ts";
import { createMockTransports } from "./transport/MockTransport.ts";

async function main() {
  const { a, b } = createMockTransports();
  await Promise.all([
    establishConnection(a, true),
    establishConnection(b, false),
  ]);
}

main().catch(console.error);
