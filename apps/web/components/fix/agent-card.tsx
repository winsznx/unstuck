import Link from "next/link";
import { centsLabel } from "@/lib/fix-shared";
import { within } from "@/lib/format";

export interface AgentCardProps {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  builder: string | null;
  verified: boolean;
  deliveredJobs: number;
  successRate: number | null;
  slaSeconds: number | null;
  payableWith: string[];
  priceCents: number | null;
  planName: string | null;
  hireable: boolean;
  selected: boolean;
  /** Where choosing this agent goes, usually the same page with ?agent=<id>. Omit when it can't be chosen. */
  href?: string;
}

/** One listing from Agent Market, with the numbers the market publishes and nothing added. */
export function AgentCard(props: AgentCardProps) {
  const { name, handle, description, builder, verified, deliveredJobs, successRate, slaSeconds, payableWith, priceCents, planName, hireable, selected, href } = props;
  const choosable = Boolean(href) && hireable && priceCents !== null;
  const body = (
    <>
      <span className="flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="block font-semibold text-ink wrap-anywhere">{name}</span>
          <span className="block text-small text-ink-secondary wrap-anywhere">
            @{handle}
            {builder ? `, by ${builder}` : ""}
            {verified ? ", verified builder" : ""}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-h3 font-semibold">{priceCents !== null ? centsLabel(priceCents) : "No price"}</span>
          <span className="block text-small text-ink-secondary">{planName ?? (priceCents !== null ? "listed plan" : "not listed")}</span>
        </span>
      </span>
      {description && <span className="mt-2 line-clamp-2 block text-small text-ink-secondary">{description}</span>}
      <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-small text-ink-secondary">
        <span>
          <span className="font-medium text-ink tabular-nums">{deliveredJobs}</span> {deliveredJobs === 1 ? "job" : "jobs"} delivered
        </span>
        <span>{successRate !== null ? <><span className="font-medium text-ink tabular-nums">{Math.round(successRate <= 1 ? successRate * 100 : successRate)}%</span> accepted</> : "No track record yet"}</span>
        {slaSeconds !== null && <span>Answers within {within(slaSeconds)}</span>}
        {payableWith.length > 0 && <span>Paid in {payableWith.join(", ")}</span>}
      </span>
      {!hireable && <span className="mt-3 block text-small font-medium text-ink-secondary">Not taking jobs right now</span>}
    </>
  );

  const frame = `block rounded-panel border px-4 py-4 transition-colors duration-(--duration-fast) sm:px-5 ${
    selected ? "border-ink bg-surface shadow-[inset_4px_0_0_var(--color-open)]" : "border-border bg-surface"
  }`;

  if (!choosable || !href) {
    return <div className={`${frame} ${hireable ? "" : "bg-surface-muted"}`}>{body}</div>;
  }
  return (
    <Link href={href} scroll={false} aria-current={selected ? "true" : undefined} className={`${frame} hover:border-ink-muted`}>
      {body}
    </Link>
  );
}
