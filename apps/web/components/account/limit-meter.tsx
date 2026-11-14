import { limitUse, money, type SpendingLimit } from "@/lib/account";
import { day } from "@/lib/format";

const STATE_LINE = {
  active: null,
  used_up: "All of it is spent. Hiring is stopped until you raise the total or set a new limit.",
  expired: "This limit has ended. Hiring is stopped until you set a new one.",
  revoked: "You turned this limit off. Hiring is stopped.",
} as const;

/** What's left of the limit: spent and left as one bar, the per-hire most beside it. */
export function LimitMeter({ limit, now }: { limit: SpendingLimit; now: Date }) {
  const use = limitUse(limit, now);
  const stopped = use.state !== "active";
  const line = STATE_LINE[use.state];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-small text-ink-muted">Left to spend</p>
          <p className={`mt-0.5 text-display leading-none font-semibold ${stopped ? "text-ink-muted" : ""}`}>{money(use.remainingCents)}</p>
        </div>
        <p className="text-small text-ink-secondary">
          {money(limit.spentCents)} spent of {money(limit.totalCapCents)}
        </p>
      </div>
      <div
        role="meter"
        aria-label="Spending limit used"
        aria-valuemin={0}
        aria-valuemax={limit.totalCapCents}
        aria-valuenow={limit.spentCents}
        aria-valuetext={`${money(limit.spentCents)} of ${money(limit.totalCapCents)} spent`}
        className="mt-3 h-3 overflow-hidden rounded-full border border-border-strong bg-surface"
      >
        <span className={`block h-full ${stopped ? "bg-ink-muted" : "bg-ink"}`} style={{ width: `${use.spentShare * 100}%` }} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-small">
        <div>
          <dt className="text-ink-muted">One hire, at most</dt>
          <dd className="mt-0.5 font-semibold">{money(limit.perHireCapCents)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{use.state === "expired" ? "Ended" : "Ends"}</dt>
          <dd className="mt-0.5 font-semibold">
            {day(limit.expiresAt)}
            {use.state === "active" && <span className="font-normal text-ink-secondary">, in {use.daysLeft === 1 ? "1 day" : `${use.daysLeft} days`}</span>}
          </dd>
        </div>
      </dl>
      {line && <p className="mt-4 rounded-control bg-surface-muted px-3 py-2.5 text-small text-ink">{line}</p>}
    </div>
  );
}
