import { centsLabel, jobStages, type JobStage, type JobStatus } from "@/lib/fix-shared";
import { clock } from "@/lib/format";

const DOT: Record<JobStage["state"], string> = {
  done: "border-ink bg-ink",
  current: "border-ink bg-open",
  later: "border-border-strong bg-surface",
  stopped: "border-fails bg-fails",
};

export interface JobTrackerProps {
  status: JobStatus;
  agentName: string;
  agentHandle?: string;
  priceCents: number;
  createdAt: Date;
  /** Agent Market's own job page, when the market returns one. */
  marketUrl?: string | null;
  /** When an undisputed delivery is accepted for you. */
  autoAcceptAt?: Date | null;
}

/** One hire on Agent Market as an execution record: every stage, what it means, and where the job stands. */
export function JobTracker({ status, agentName, agentHandle, priceCents, createdAt, marketUrl, autoAcceptAt }: JobTrackerProps) {
  const stages = jobStages(status);
  const stopped = status === "failed" || status === "refunded";
  return (
    <section aria-label={`Job with ${agentName}`} className="overflow-hidden rounded-panel border border-border bg-surface">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border bg-surface-muted px-5 py-3">
        <p className="min-w-0 text-small text-ink-secondary">
          <span className="font-semibold text-ink">{agentName}</span>
          {agentHandle ? <span className="text-ink-muted"> @{agentHandle}</span> : null}
          <span> hired {clock(createdAt)}</span>
        </p>
        <p className="text-small font-semibold tabular-nums">
          {centsLabel(priceCents)} <span className="font-normal text-ink-secondary">{stopped ? "not charged" : status === "delivered" ? "on delivery" : "held"}</span>
        </p>
      </header>
      <ol className="px-5 py-4">
        {stages.map((stage, i) => (
          <li key={stage.key} className="relative flex gap-4 pb-5 last:pb-0" aria-current={stage.state === "current" ? "step" : undefined}>
            {i < stages.length - 1 && <span aria-hidden="true" className={`absolute top-5 bottom-0 left-[7px] w-0.5 ${stage.state === "done" ? "bg-ink" : "bg-border"}`} />}
            <span aria-hidden="true" className={`relative mt-1 size-4 shrink-0 rounded-full border-2 ${DOT[stage.state]}`} />
            <div className="min-w-0">
              <p className={`text-body font-semibold ${stage.state === "later" ? "text-ink-secondary" : stage.state === "stopped" ? "text-fails-text" : "text-ink"}`}>
                {stage.label}
                {stage.state === "current" && <span className="ml-2 text-small font-medium text-ink-secondary">now</span>}
              </p>
              <p className="text-small text-ink-secondary">{stage.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      {(marketUrl || (autoAcceptAt && status === "delivered")) && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-small text-ink-secondary">
          {autoAcceptAt && status === "delivered" ? <span>Agent Market accepts it for you on {clock(autoAcceptAt)} unless you send it back there first.</span> : <span />}
          {marketUrl && (
            <a className="font-medium text-ink underline underline-offset-4" href={marketUrl}>
              Open on Agent Market
            </a>
          )}
        </footer>
      )}
    </section>
  );
}
