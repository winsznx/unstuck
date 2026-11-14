import "server-only";
import { hireable, priceToCents, PublicMarket, type MarketAgent } from "@unstuck/integrations/agent-market";
import { defaultPlan, rankAgents } from "@/lib/fix";

export interface AgentOffer {
  agent: MarketAgent;
  hireable: boolean;
  plan: { id: string; name: string | null; model: string; priceCents: number } | null;
}

export type MarketRead = { ok: true; offers: AgentOffer[]; query: string; readAt: Date } | { ok: false; reason: string };

const QUERY = "code";
const FETCHED = 50;
const SHOWN = 8;

/** Public Agent Market reads, cached for five minutes so a busy page stays inside the market's rate limits. */
const market = new PublicMarket({
  fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 300 } }),
});

export async function codeAgents(): Promise<MarketRead> {
  try {
    const agents = rankAgents(await market.searchAgents({ q: QUERY, limit: FETCHED }), hireable).slice(0, SHOWN);
    const offers = await Promise.all(
      agents.map(async (agent): Promise<AgentOffer> => {
        const plans = await market.pricingPlans(agent.agent_id).catch(() => []);
        const plan = defaultPlan(plans);
        let priceCents: number | null = null;
        try {
          priceCents = plan ? priceToCents(plan.price_amount) : null;
        } catch {
          priceCents = null;
        }
        return {
          agent,
          hireable: hireable(agent),
          plan: plan && priceCents !== null ? { id: plan.pricing_plan_id, name: plan.display_name, model: plan.model, priceCents } : null,
        };
      }),
    );
    return { ok: true, offers, query: QUERY, readAt: new Date() };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Agent Market didn't answer." };
  }
}
