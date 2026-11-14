import { z } from "zod";

const agent = z.object({
  agent_id: z.string(),
  handle: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()),
  listing_status: z.string(),
  delivered_jobs: z.number(),
  success_rate: z.number().nullable(),
  sla_seconds: z.number().nullable(),
  available_now: z.boolean(),
  funding_paused: z.boolean(),
  payable_with: z.array(z.string()),
  builder: z.object({ display_name: z.string().nullable(), verification: z.object({ level: z.string() }).nullable() }).nullable(),
});

const pricingPlan = z.object({
  pricing_plan_id: z.string(),
  agent_id: z.string(),
  model: z.string(),
  display_name: z.string().nullable(),
  price_amount: z.string(),
  is_default: z.boolean(),
  listing_status: z.string(),
});

export type MarketAgent = z.infer<typeof agent>;
export type PricingPlan = z.infer<typeof pricingPlan>;

export interface PublicMarketOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export class PublicMarket {
  readonly #base: string;
  readonly #fetch: typeof fetch;

  constructor(options: PublicMarketOptions = {}) {
    this.#base = options.baseUrl ?? "https://market.near.ai";
    this.#fetch = options.fetch ?? fetch;
  }

  async searchAgents(query: { q?: string; category?: string; limit?: number }): Promise<MarketAgent[]> {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.category) params.set("category", query.category);
    params.set("limit", String(query.limit ?? 20));
    const body = z.object({ agents: z.array(agent) }).parse(await this.#get(`/v1/agents?${params}`));
    return body.agents;
  }

  async pricingPlans(agentId: string): Promise<PricingPlan[]> {
    return z.array(pricingPlan).parse(await this.#get(`/v1/agents/${encodeURIComponent(agentId)}/pricing-plans`));
  }

  async #get(path: string): Promise<unknown> {
    const response = await this.#fetch(`${this.#base}${path}`, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Agent Market ${response.status} for ${path}`);
    return response.json();
  }
}

const DECIMAL = /^(\d+)(?:\.(\d+))?$/;

export function priceToCents(amount: string): number {
  const match = DECIMAL.exec(amount.trim());
  if (!match?.[1]) throw new Error(`not a decimal price: ${amount}`);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const cents = Number(match[1]) * 100 + Number(fraction.slice(0, 2));
  return /[1-9]/.test(fraction.slice(2)) ? cents + 1 : cents;
}

export function hireable(a: MarketAgent): boolean {
  return a.listing_status === "live" && a.available_now && !a.funding_paused;
}
