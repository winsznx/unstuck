import { createHash } from "node:crypto";

export class OutputCapture {
  readonly #hash = createHash("sha256");
  readonly #tailBytes: number;
  #chunks: Buffer[] = [];
  #held = 0;
  bytes = 0;

  constructor(tailBytes: number) {
    this.#tailBytes = tailBytes;
  }

  write(chunk: Buffer): void {
    this.#hash.update(chunk);
    this.bytes += chunk.length;
    this.#chunks.push(chunk);
    this.#held += chunk.length;
    while (this.#chunks.length > 1 && this.#held - (this.#chunks[0]?.length ?? 0) >= this.#tailBytes) {
      this.#held -= this.#chunks.shift()?.length ?? 0;
    }
  }

  finish(): { tail: string; sha256: string } {
    const joined = Buffer.concat(this.#chunks);
    const tail = joined.subarray(Math.max(0, joined.length - this.#tailBytes)).toString("utf8");
    return { tail, sha256: this.#hash.digest("hex") };
  }
}
