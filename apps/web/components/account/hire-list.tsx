import Link from "next/link";
import { money, type HireRow, type HireStatus } from "@/lib/account";
import { day } from "@/lib/format";

const STATUS: Record<HireStatus, { label: string; look: string }> = {
  running: { label: "Working", look: "border-open-edge/50 bg-open-soft text-ink" },
  delivered: { label: "Delivered, not checked", look: "border-border-strong bg-surface text-ink" },
  accepted: { label: "Passed the checks", look: "border-passes/40 bg-passes-soft text-passes-text" },
  rejected: { label: "Failed the checks", look: "border-fails/40 bg-fails-soft text-fails-text" },
  refunded: { label: "Refunded", look: "border-border bg-surface-muted text-ink-secondary" },
  failed: { label: "Didn't deliver", look: "border-fails/40 bg-fails-soft text-fails-text" },
};

export function HireStatusChip({ status }: { status: HireStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 text-tag font-semibold whitespace-nowrap ${s.look}`}>
      {status === "running" && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-open-edge motion-reduce:animate-none" />}
      {s.label}
    </span>
  );
}

/** Every hire paid under the limit, newest first. An empty list says how the first one happens. */
export function HireList({ hires }: { hires: readonly HireRow[] }) {
  if (hires.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-border-strong px-4 py-6 text-center sm:px-6">
        <p className="font-semibold">No hires yet</p>
        <p className="mx-auto mt-1 max-w-(--container-reading) text-small text-ink-secondary">
          Your first one starts from a milestone page, under &ldquo;Get it fixed&rdquo;, after a rerun shows what&apos;s still missing. You see the agent and its price before anything is paid.
        </p>
      </div>
    );
  }

  const spent = hires.filter((h) => h.status !== "refunded").reduce((sum, h) => sum + h.priceCents, 0);

  return (
    <div className="overflow-hidden rounded-panel border border-border bg-surface">
      <table className="w-full text-left text-small">
        <caption className="sr-only">Hires paid under your spending limit</caption>
        <thead className="hidden border-b border-border bg-surface-muted text-ink-muted sm:table-header-group">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">
              Milestone
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Agent
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium sm:px-5">
              Paid
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {hires.map((h) => (
            <tr key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 px-4 py-3.5 sm:table-row sm:px-0 sm:py-0">
              <td className="min-w-0 sm:px-5 sm:py-3.5">
                <Link href={`/m/${h.milestoneId}`} className="font-semibold wrap-anywhere text-ink underline-offset-4 hover:underline">
                  {h.repo}
                </Link>
                <span className="block text-ink-muted">{day(h.startedAt)}</span>
              </td>
              <td className="col-start-1 min-w-0 text-ink-secondary wrap-anywhere sm:px-4 sm:py-3.5">{h.agentName}</td>
              <td className="col-start-1 sm:px-4 sm:py-3.5">
                <HireStatusChip status={h.status} />
              </td>
              <td className="col-start-2 row-start-1 text-right font-semibold sm:px-5 sm:py-3.5">
                {h.status === "refunded" ? <s className="font-normal text-ink-muted">{money(h.priceCents)}</s> : money(h.priceCents)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-border bg-surface-muted">
          <tr className="flex justify-between px-4 py-3 sm:table-row sm:px-0 sm:py-0">
            <th scope="row" colSpan={3} className="font-medium text-ink-secondary sm:px-5 sm:py-3">
              {hires.length === 1 ? "1 hire" : `${hires.length} hires`}, refunds left out
            </th>
            <td className="text-right font-semibold sm:px-5 sm:py-3">{money(spent)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
