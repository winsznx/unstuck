import { describe, expect, it } from "vitest";
import {
  checkLimit,
  clockOf,
  dollarsToCents,
  groupCode,
  limitUse,
  money,
  secondsLeft,
  type SpendingLimit,
} from "./account";
import { canHire } from "./hire-rules";

const now = new Date("2026-11-06T12:00:00Z");
const limit = (over: Partial<SpendingLimit> = {}): SpendingLimit => ({
  perHireCapCents: 2500,
  totalCapCents: 10000,
  spentCents: 0,
  expiresAt: new Date("2026-12-06T12:00:00Z"),
  revokedAt: null,
  createdAt: now,
  ...over,
});

describe("device code", () => {
  it("counts down whole seconds and never goes negative", () => {
    expect(secondsLeft(new Date(now.getTime() + 899_400), now)).toBe(900);
    expect(secondsLeft(new Date(now.getTime() - 5000), now)).toBe(0);
  });

  it("formats a clock", () => {
    expect(clockOf(900)).toBe("15:00");
    expect(clockOf(65)).toBe("1:05");
    expect(clockOf(-3)).toBe("0:00");
  });

  it("splits a code in two halves for reading", () => {
    expect(groupCode("wdjb-mjht")).toEqual(["WDJB", "MJHT"]);
    expect(groupCode("ABCDEFGHI")).toEqual(["ABCDE", "FGHI"]);
    expect(groupCode("ab1")).toEqual(["AB1"]);
  });
});

describe("dollarsToCents", () => {
  it("reads plain, decimal, dollar-signed and comma amounts", () => {
    expect(dollarsToCents("25")).toBe(2500);
    expect(dollarsToCents("25.5")).toBe(2550);
    expect(dollarsToCents(" $1,250.05 ")).toBe(125005);
  });

  it("refuses anything else", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1e3", "$"]) expect(dollarsToCents(bad)).toBeNull();
  });
});

describe("money", () => {
  it("drops cents only when they're zero", () => {
    expect(money(2500)).toBe("$25");
    expect(money(2550)).toBe("$25.50");
    expect(money(125000)).toBe("$1,250");
  });
});

describe("checkLimit", () => {
  it("accepts a sane limit and counts the hires it covers", () => {
    expect(checkLimit({ perHire: "25", total: "100", days: 30 })).toEqual({
      ok: true,
      perHireCapCents: 2500,
      totalCapCents: 10000,
      days: 30,
      hiresCovered: 4,
    });
  });

  it("needs the total to cover one hire", () => {
    const result = checkLimit({ perHire: "50", total: "20", days: 7 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.total).toMatch(/\$50 or more/);
  });

  it("rejects zero, junk and amounts over the ceilings", () => {
    const zero = checkLimit({ perHire: "0", total: "x", days: 7 });
    expect(zero.ok).toBe(false);
    if (!zero.ok) {
      expect(zero.errors.perHire).toBeDefined();
      expect(zero.errors.total).toBeDefined();
    }
    const huge = checkLimit({ perHire: "501", total: "2001", days: 90 });
    expect(huge.ok).toBe(false);
    if (!huge.ok) expect(Object.keys(huge.errors).sort()).toEqual(["perHire", "total"]);
  });
});

describe("limitUse", () => {
  it("reports what's left", () => {
    expect(limitUse(limit({ spentCents: 2500 }), now)).toEqual({ remainingCents: 7500, spentShare: 0.25, daysLeft: 30, state: "active" });
  });

  it("names the state that stops hiring, revoked first", () => {
    expect(limitUse(limit({ spentCents: 10000 }), now).state).toBe("used_up");
    expect(limitUse(limit({ expiresAt: now }), now).state).toBe("expired");
    expect(limitUse(limit({ expiresAt: now, revokedAt: now }), now).state).toBe("revoked");
  });
});

describe("canHire", () => {
  it("applies the same rule as the worker", () => {
    expect(canHire(limit(), 2500, now)).toEqual({ ok: true });
    expect(canHire(limit(), 2501, now)).toEqual({ ok: false, reason: "over_job_cap" });
    expect(canHire(limit({ spentCents: 9000 }), 2000, now)).toEqual({ ok: false, reason: "over_total_cap" });
  });
});
