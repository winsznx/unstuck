import { describe, expect, it } from "vitest";
import { PublicMarket, hireable, priceToCents } from "./public";

describe("priceToCents", () => {
  it.each([
    ["0.5000", 50],
    ["12", 1200],
    ["3.1", 310],
    ["0.001", 1],
    ["1.9900", 199],
  ])("%s -> %i, rounding sub-cent amounts up", (amount, cents) => {
    expect(priceToCents(amount)).toBe(cents);
  });

  it("rejects non-decimal input", () => {
    expect(() => priceToCents("-1")).toThrow();
    expect(() => priceToCents("1e3")).toThrow();
  });
});

describe.skipIf(!process.env.LIVE)("PublicMarket live (LIVE=1)", () => {
  it("finds github-pr-review and reads its public price", async () => {
    const market = new PublicMarket();
    const [agent] = (await market.searchAgents({ q: "github-pr-review", limit: 10 })).filter((a) => a.handle === "github-pr-review");
    expect(agent).toBeDefined();
    const plans = await market.pricingPlans(agent!.agent_id);
    const plan = plans.find((p) => p.is_default);
    expect(priceToCents(plan!.price_amount)).toBeGreaterThan(0);
    expect(typeof hireable(agent!)).toBe("boolean");
  }, 30_000);
});
