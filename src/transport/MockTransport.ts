import { Buffer } from "../Buffer.ts";
import type { Transport } from "./Transport.ts";

export function createMockTransports() {
  const send = (transport: MockTransport, message: Uint8Array<ArrayBuffer>) => {
    if (transport.resolve) {
      transport.resolve(message);
      return;
    }

    transport.queue.push(message);
  };

  const a = new MockTransport("A", (message) => send(b, message));
  const b = new MockTransport("B", (message) => send(a, message));
  return { a, b };
}

export class MockTransport implements Transport {
  #name: string;
  #send;
  queue: Uint8Array<ArrayBuffer>[] = [];
  resolve: (() => Uint8Array<ArrayBuffer>) | null;

  constructor(name: string, send: (message: Uint8Array<ArrayBuffer>) => void) {
    this.#name = name;
    this.#send = send;
  }

  async read(): Promise<Uint8Array<ArrayBuffer>> {
    if (this.queue.length > 0) {
      const popped = this.queue.shift()!;
      return popped;
    }

    const result = await new Promise((resolve) => {
      this.resolve = resolve;
    });

    this.resolve = null;

    return result;
  }

  async write(message: Uint8Array<ArrayBuffer>): Promise<void> {
    return this.#send(message);
  }
}
