import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/button";
import { AgentCard } from "@/components/fix/agent-card";
import { HireForm } from "@/components/fix/hire-form";
import { JobTracker } from "@/components/fix/job-tracker";
import { Blocked, PartPage } from "@/components/fix/page-frame";
import { WorkOrder, type WorkOrderItem } from "@/components/fix/work-order";
import { centsLabel, isJobStatus, latestPatch } from "@/lib/fix";
import { clock, repoName } from "@/lib/format";
import { jobsFor, milestoneView } from "@/lib/queries";
import { milestoneStatus } from "@/lib/status";
import { limitUse, money, type SpendingLimit } from "@/lib/account";
import { reconcileJobs } from "@/lib/market-jobs";
import { currentMandate, currentSession, limitOf } from "@/lib/market-session";
import { hireAgent } from "../../actions";
import { codeAgents, type AgentOffer } from "./market";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Get it fixed" };

export default async function FixPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ agent?: string | string[] }> }) {
  const { id } = await params;
  const { agent: agentParam } = await searchParams;
  await reconcileJobs(id);
  const [view, jobs] = await Promise.all([milestoneView(id), jobsFor(id)]);
  if (!view) notFound();
  const { milestone, asks, base } = view;
  const status = milestoneStatus(view);
  const missing = asks.filter((a) => a.verdict === "missing");
  const patch = latestPatch(view);
  const job = jobs[0];

  const lead = (
    <>
      You pick an agent from the market, see its listed price, and hire it for this milestone only. Its change comes back here first and goes through your reviewer&apos;s steps
      before anything reaches {repoName(milestone.codeRepoUrl)}.
    </>
  );
  const title = "Get it fixed on NEAR Agent Market";

  if (status.kind !== "finished" || missing.length === 0) {
    const allWork = status.kind === "finished" && status.tally.unsure === 0;
    return (
      <PartPage title={title} lead={lead}>
        <Blocked
          title={status.kind !== "finished" ? "The run hasn't shown what's missing yet" : allWork ? "Nothing to fix" : "Nothing is failing, but some asks weren't tested"}
          body={
            status.kind !== "finished"
              ? "An agent can only be hired against a finished run, so it knows exactly which steps fail. Come back when part 2 is done."
              : allWork
                ? "Every sentence your reviewer wrote passes on the reviewed commit. There's nothing to pay for. Send them the run record instead."
                : "Hiring needs at least one failing check, so the agent has a line to fix and part 4 has something to prove. Add a check for the untested sentences first."
          }
          action={
            status.kind === "finished" ? (
              <ButtonLink href={allWork ? `/m/${id}/send` : `/start?url=${encodeURIComponent(milestone.reviewerCommentUrl ?? milestone.threadUrl)}`}>
                {allWork ? "Tell your reviewer" : "Add checks"}
              </ButtonLink>
            ) : (
              <ButtonLink href={`/m/${id}`} variant="secondary">
                Back to the run
              </ButtonLink>
            )
          }
        />
      </PartPage>
    );
  }

  const items: WorkOrderItem[] = missing.map((ask) => ({ n: asks.indexOf(ask) + 1, quote: ask.quote, failure: ask.failure }));
  const checks = (base?.replay.steps ?? []).map((s, i) => ({ n: i + 1, command: s.command, offline: s.network === "none" }));
  const workOrder = <WorkOrder repo={repoName(milestone.codeRepoUrl)} sha={milestone.pinnedSha} items={items} checks={checks} image={base?.replay.image ?? null} />;

  if (patch || (job && isJobStatus(job.status) && job.status !== "failed" && job.status !== "refunded")) {
    return (
      <PartPage title={title} lead={lead}>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <div className="space-y-6">
            {job && isJobStatus(job.status) && (
              <JobTracker
                status={job.status}
                agentName={job.agentName ?? job.agentId}
                priceCents={job.priceCents}
                createdAt={job.createdAt}
                marketUrl={job.approvalUrl}
                autoAcceptAt={job.autoAcceptAt}
              />
            )}
            {patch && (
              <Blocked
                tone="done"
                title="A fix came back"
                body={`It's being checked against the same ${checks.length === 1 ? "step" : `${checks.length} steps`} your reviewer gave, on a fresh copy, before anything else happens.`}
                action={<ButtonLink href={`/m/${id}/check`}>Open the check</ButtonLink>}
              />
            )}
          </div>
          {workOrder}
        </div>
      </PartPage>
    );
  }

  const [market, session] = await Promise.all([codeAgents(), currentSession()]);
  const mandate = session ? await currentMandate(session.handle) : null;
  const connection: Connection = { handle: session?.handle ?? null, limit: mandate ? limitOf(mandate) : null };
  const wanted = typeof agentParam === "string" ? agentParam : undefined;
  const chosen = market.ok ? market.offers.find((o) => o.agent.agent_id === wanted && o.hireable && o.plan) : undefined;

  return (
    <PartPage title={title} lead={lead}>
      {job && (job.status === "failed" || job.status === "refunded") && (
        <div className="mb-8">
          <JobTracker status={job.status} agentName={job.agentName ?? job.agentId} priceCents={job.priceCents} createdAt={job.createdAt} marketUrl={job.approvalUrl} />
        </div>
      )}
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12">
        <section aria-labelledby="agents-title" className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="agents-title" className="text-h2 font-semibold">
              Choose who fixes it
            </h2>
            {market.ok && <p className="text-small text-ink-secondary">Read from market.near.ai, {clock(market.readAt)}</p>}
          </div>
          <p className="mt-1 max-w-(--container-reading) text-body text-ink-secondary">
            Agents that list code work, open for hire first. The price is each agent&apos;s own default plan. UNSTUCK adds nothing to it.
          </p>
          <div className="mt-5">
            {market.ok ? (
              market.offers.length > 0 ? (
                <ul className="space-y-3">
                  {market.offers.map((offer) => (
                    <li key={offer.agent.agent_id}>
                      <AgentCard {...cardProps(offer, `/m/${id}/fix?agent=${encodeURIComponent(offer.agent.agent_id)}#order`, chosen?.agent.agent_id === offer.agent.agent_id)} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Blocked title="No code agents are listed right now" body="Agent Market returned no agents for code work. Try again later, or hire one directly on market.near.ai." />
              )
            ) : (
              <Blocked
                title="Agent Market didn't answer"
                body={`The public listing couldn't be read (${market.reason}). Nothing was sent. Reload the page to try again.`}
                action={
                  <ButtonLink href={`/m/${id}/fix`} variant="secondary">
                    Try again
                  </ButtonLink>
                }
              />
            )}
          </div>
        </section>

        <aside id="order" aria-label="Your hire" className="min-w-0 scroll-mt-24 space-y-5 lg:sticky lg:top-24">
          {workOrder}
          <OrderPanel milestoneId={id} chosen={chosen} connection={connection} />
        </aside>
      </div>
    </PartPage>
  );
}

function cardProps(offer: AgentOffer, href: string, selected: boolean) {
  const { agent, plan } = offer;
  return {
    id: agent.agent_id,
    name: agent.name,
    handle: agent.handle,
    description: agent.description,
    builder: agent.builder?.display_name ?? null,
    verified: Boolean(agent.builder?.verification && agent.builder.verification.level !== "none"),
    deliveredJobs: agent.delivered_jobs,
    successRate: agent.success_rate,
    slaSeconds: agent.sla_seconds,
    payableWith: agent.payable_with,
    priceCents: plan?.priceCents ?? null,
    planName: plan?.name ?? null,
    hireable: offer.hireable,
    selected,
    href,
  };
}

interface Connection {
  handle: string | null;
  limit: SpendingLimit | null;
}

function limitLine(limit: SpendingLimit | null): string {
  if (!limit) return "Not set. Set one once, and no single hire can go over it.";
  const use = limitUse(limit, new Date());
  if (use.state === "active") return `Up to ${money(limit.perHireCapCents)} a hire, ${money(use.remainingCents)} left of ${money(limit.totalCapCents)}.`;
  if (use.state === "used_up") return "Used up. Set a new one to hire again.";
  return "Expired. Set a new one to hire again.";
}

function OrderPanel({ milestoneId, chosen, connection }: { milestoneId: string; chosen: AgentOffer | undefined; connection: Connection }) {
  return (
    <section aria-labelledby="order-title" className="rounded-sheet border border-ink bg-surface px-5 py-5">
      <h2 id="order-title" className="text-h3 font-semibold">
        Your hire
      </h2>
      {chosen?.plan ? (
        <dl className="mt-4 divide-y divide-border text-body">
          <Row term="Agent" value={chosen.agent.name} />
          <Row term="Plan" value={chosen.plan.name ?? chosen.plan.model} />
          <Row term="Price" value={<span className="font-semibold">{centsLabel(chosen.plan.priceCents)}</span>} />
          <Row term="Payment" value="Held at hire, released when the delivery is accepted" />
        </dl>
      ) : (
        <p className="mt-2 text-body text-ink-secondary">Choose an agent to see its price here. Nothing is held until you confirm.</p>
      )}

      <div className="mt-5 space-y-3 border-t border-border pt-4">
        <Need
          title="Agent Market account"
          body={
            connection.handle ? (
              `Signed in as ${connection.handle}.`
            ) : (
              <>
                Not connected.{" "}
                <Link className="font-medium text-ink underline underline-offset-4" href="/connect">
                  Connect with a short code
                </Link>
              </>
            )
          }
        />
        <Need
          title="Spending limit"
          body={
            connection.handle ? (
              <>
                {limitLine(connection.limit)}{" "}
                <Link className="font-medium text-ink underline underline-offset-4" href="/connect?step=limit">
                  {connection.limit ? "Change it" : "Set it"}
                </Link>
              </>
            ) : (
              "Not set. You set it after you sign in, and no single hire can go over it."
            )
          }
        />
      </div>

      <div className="mt-5">
        {chosen?.plan ? (
          <HireForm action={hireAgent} milestoneId={milestoneId} agentId={chosen.agent.agent_id} agentName={chosen.agent.name} priceCents={chosen.plan.priceCents} />
        ) : (
          <p className="rounded-control border border-dashed border-border-strong px-4 py-3 text-center text-small text-ink-secondary">Choose an agent first</p>
        )}
      </div>
    </section>
  );
}

function Row({ term, value }: { term: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-small text-ink-secondary">{term}</dt>
      <dd className="m-0 min-w-0 text-right wrap-anywhere">{value}</dd>
    </div>
  );
}

function Need({ title, body }: { title: string; body: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full border-2 border-dashed border-border-strong" />
      <p className="text-small">
        <span className="font-semibold">{title}</span>
        <span className="block text-ink-secondary">{body}</span>
      </p>
    </div>
  );
}
