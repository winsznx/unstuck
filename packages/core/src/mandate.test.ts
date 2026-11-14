import { describe, expect, it } from "vitest";
import { checkMandate, type Mandate } from "./mandate";

const now = new Date("2026-11-08T12:00:00Z");
const mandate: Mandate = {
  id: "m1",
  perJobCapCents: 1500,
  totalCapCents: 3000,
  spentCents: 1000,
  expiresAt: new Date("2026-11-14T00:00:00Z"),
  revokedAt: null,
};

describe("checkMandate", () => {
  it("allows a price inside both caps", () => {
    expect(checkMandate(mandate, 1500, now)).toEqual({ ok: true });
  });

  it("allows spending exactly up to the total cap", () => {
    expect(checkMandate({ ...mandate, spentCents: 1500 }, 1500, now)).toEqual({ ok: true });
  });

  it.each([
    [{ ...mandate }, 1501, "over_job_cap"],
    [{ ...mandate, spentCents: 2000 }, 1001, "over_total_cap"],
    [{ ...mandate, expiresAt: now }, 100, "expired"],
    [{ ...mandate, revokedAt: now }, 100, "revoked"],
    [{ ...mandate }, 0, "invalid_price"],
    [{ ...mandate }, 9.5, "invalid_price"],
  ] as const)("rejects %#", (m, price, reason) => {
    expect(checkMandate(m, price, now)).toEqual({ ok: false, reason });
  });
});
