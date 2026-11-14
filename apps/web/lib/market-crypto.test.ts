import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { NOT_CONNECTED_REASON } from "./account";
import { MarketKeyError, seal, tokenKey, unseal } from "./market-crypto";

const key = randomBytes(32);

describe("tokenKey", () => {
  it("refuses a missing key with the reason sign-in shows", () => {
    expect(() => tokenKey(undefined)).toThrow(new MarketKeyError(NOT_CONNECTED_REASON));
    expect(() => tokenKey("  ")).toThrow(MarketKeyError);
  });

  it("refuses a key that isn't 32 bytes", () => {
    expect(() => tokenKey(randomBytes(16).toString("base64"))).toThrow(/32 bytes/);
  });

  it("reads a 32-byte base64 key", () => {
    expect(tokenKey(key.toString("base64")).equals(key)).toBe(true);
  });
});

describe("seal and unseal", () => {
  it("round-trips and never keeps the plaintext", () => {
    const sealed = seal("access-token-value", "access", key);
    expect(sealed).not.toContain("access-token-value");
    expect(unseal(sealed, "access", key)).toBe("access-token-value");
  });

  it("uses a fresh IV each time", () => {
    expect(seal("same", "access", key)).not.toBe(seal("same", "access", key));
  });

  it("refuses another purpose, another key, or a tampered value", () => {
    const sealed = seal("t", "access", key);
    expect(() => unseal(sealed, "refresh", key)).toThrow();
    expect(() => unseal(sealed, "access", randomBytes(32))).toThrow();
    const [v, iv, tag, body] = sealed.split(".");
    const flipped = Buffer.from(body!, "base64url");
    flipped[0] = flipped[0]! ^ 1;
    expect(() => unseal([v, iv, tag, flipped.toString("base64url")].join("."), "access", key)).toThrow();
    expect(() => unseal("plain", "access", key)).toThrow(/not a sealed/);
  });
});
