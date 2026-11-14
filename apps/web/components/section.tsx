import type { ReactNode } from "react";

export type PartState = "done" | "current" | "later" | "skipped";

export interface PartSummary {
  n: number;
  name: string;
  state: PartState;
  status: string;
}

const RAIL_BAR: Record<PartState, string> = {
  done: "bg-ink",
  current: "bg-open",
  later: "bg-border",
  skipped: "bg-border",
};

/** The five parts of a milestone as one strip of anchors. Each cell says where that part stands, in words. */
export function PartRail({ parts }: { parts: PartSummary[] }) {
  return (
    <nav aria-label="Where this milestone stands">
      <ol className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {parts.map((part) => (
          <li key={part.n} className="min-w-0">
            <a
              href={`#part-${part.n}`}
              aria-current={part.state === "current" ? "step" : undefined}
              className="group block min-h-11 rounded-control pt-0 pb-1 focus-visible:outline-offset-4"
            >
              <span aria-hidden="true" className={`block h-1 rounded-full ${RAIL_BAR[part.state]}`} />
              <span className="mt-2 flex items-baseline gap-1.5">
                <span className="text-small text-ink-muted tabular-nums">{part.n}</span>
                <span className={`truncate text-small font-semibold group-hover:underline ${part.state === "later" || part.state === "skipped" ? "text-ink-secondary" : "text-ink"}`}>
                  {part.name}
                </span>
              </span>
              <span className="mt-0.5 hidden text-small text-ink-secondary sm:block">{part.status}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

const BAR: Record<PartState, string> = {
  current: "border-ink",
  done: "border-border-strong",
  later: "border-dashed border-border-strong",
  skipped: "border-dashed border-border",
};

export function Part({ n, title, state, status, children }: { n: number; title: string; state: PartState; status?: string; children: ReactNode }) {
  const quiet = state === "later" || state === "skipped";
  return (
    <section id={`part-${n}`} aria-labelledby={`part-${n}-title`} className={`scroll-mt-6 border-l-2 pl-4 sm:pl-7 ${BAR[state]}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={`part-${n}-title`} className="flex min-w-0 items-baseline gap-3 text-h2 font-semibold text-balance">
          <span className="text-small font-semibold text-ink-muted tabular-nums">{n}</span>
          <span className={quiet ? "text-ink-secondary" : ""}>{title}</span>
        </h2>
        {status && <p className={`text-small font-medium ${state === "current" ? "text-ink" : "text-ink-muted"}`}>{status}</p>}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function Pending({ children }: { children: ReactNode }) {
  return <p className="rounded-panel border border-dashed border-border-strong px-4 py-4 text-body text-ink-secondary">{children}</p>;
}
