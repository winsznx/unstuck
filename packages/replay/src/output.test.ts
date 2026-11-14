import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { OutputCapture } from "./output";

describe("OutputCapture", () => {
  it("keeps only the tail but hashes and counts everything", () => {
    const capture = new OutputCapture(8);
    const parts = ["aaaa", "bbbb", "cccc", "dd"];
    for (const p of parts) capture.write(Buffer.from(p));
    const { tail, sha256 } = capture.finish();
    expect(tail).toBe("bbccccdd");
    expect(capture.bytes).toBe(14);
    expect(sha256).toBe(createHash("sha256").update(parts.join("")).digest("hex"));
  });
});
