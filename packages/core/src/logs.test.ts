import { describe, expect, it } from "vitest";
import { stripAnsi, tellingLine } from "./logs";

describe("tellingLine", () => {
  it("picks the error a reviewer would quote, not the summary", () => {
    const out = "\u001b[31mFAIL\u001b[39m test/a.test.ts\nError: Cannot find module 'ethereum-cryptography/aes.js'\n    at Module._resolve\n Test Files  4 failed (4)\n";
    expect(tellingLine(out)).toBe("Error: Cannot find module 'ethereum-cryptography/aes.js'");
  });

  it("falls back to the last line and handles empty output", () => {
    expect(tellingLine("one\ntwo\n")).toBe("two");
    expect(tellingLine("")).toBeNull();
  });

  it("strips color codes", () => {
    expect(stripAnsi("\u001b[2m Test Files \u001b[22m")).toBe(" Test Files ");
  });
});
