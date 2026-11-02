import { concatBytes } from "./util.ts";

export class Buffer {
  #pointer = 0;
  #bytes: Uint8Array<ArrayBuffer>;

  constructor(bytes: Uint8Array<ArrayBuffer> = new Uint8Array()) {
    this.#bytes = bytes;
  }

  write(input: Uint8Array<ArrayBuffer>) {
    this.#bytes = concatBytes(this.#bytes, input);
  }

  read(length: number) {
    const subarray = this.#bytes.subarray(
      this.#pointer,
      this.#pointer + length,
    );
    this.#pointer += length;
    return subarray;
  }

  toArray() {
    return this.#bytes.subarray(this.#pointer);
  }
}
