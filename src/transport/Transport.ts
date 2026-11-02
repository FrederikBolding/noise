export interface Transport {
  read(): Promise<Uint8Array<ArrayBuffer>>;
  write(message: Uint8Array<ArrayBuffer>): Promise<void>;
}
