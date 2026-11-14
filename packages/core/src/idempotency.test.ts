import { describe, expect, it } from "vitest";
import { clientRequestId } from "./idempotency";

describe("clientRequestId", () => {
  it("is stable for the same hire attempt", () => {
    expect(clientRequestId("m1", "a1", 1)).toBe(clientRequestId("m1", "a1", 1));
  });

  it("differs per attempt and does not collide on concatenation", () => {
    expect(clientRequestId("m1", "a1", 1)).not.toBe(clientRequestId("m1", "a1", 2));
    expect(clientRequestId("m1a", "1", 1)).not.toBe(clientRequestId("m1", "a1", 1));
  });

  it("rejects a non-positive attempt", () => {
    expect(() => clientRequestId("m1", "a1", 0)).toThrow(RangeError);
  });
});
