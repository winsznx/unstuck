import type { ReactNode } from "react";
import type { VerdictTally } from "@/lib/study";

/**
 * A count with its denominator beside it. The denominator is never dropped: on a small study,
 * "1 of 1" and "100%" say very different things.
 */
export function Figure({ value, of, unit, children }: { value: number | string; of?: number; unit?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 bg-surface px-4 py-5 sm:px-6 sm:py-6">
      <p className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
        <span className="text-[2.5rem] leading-none font-semibold tracking-tight sm:text-display">{value}</span>
        {of !== undefined && <span className="text-h3 font-medium text-ink-muted sm:text-h2">of {of}</span>}
        {unit && <span className="text-h3 font-medium text-ink-secondary">{unit}</span>}
      </p>
      <p className="max-w-[24ch] text-small text-ink-secondary">{children}</p>
    </div>
  );
}

const SEGMENTS: { key: keyof VerdictTally; label: string; fill: string; dot: string }[] = [
  { key: "missing", label: "Still missing", fill: "bg-fails", dot: "bg-fails" },
  { key: "works", label: "Works", fill: "bg-passes", dot: "bg-passes" },
  { key: "unsure", label: "Not sure", fill: "border border-dashed border-border-control bg-unsure-soft", dot: "border border-dashed border-border-control bg-unsure-soft" },
];

/**
 * Where every ask landed, as one bar split by verdict. The colours are the punch tags' state colours,
 * so each segment is also named in the legend under it: identity never rides on colour alone.
 */
export function VerdictBar({ tally, caption }: { tally: VerdictTally; caption: string }) {
  const total = tally.missing + tally.works + tally.unsure;
  const shown = SEGMENTS.filter((s) => tally[s.key] > 0);
  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={`${caption}: ${SEGMENTS.map((s) => `${tally[s.key]} ${s.label.toLowerCase()}`).join(", ")}, out of ${total}.`}
        className="flex h-10 gap-0.5 overflow-hidden rounded-control bg-surface-muted"
      >
        {total === 0 ? (
          <span className="grid flex-1 place-items-center text-small text-ink-muted">No asks decided yet</span>
        ) : (
          shown.map((s) => (
            <span
              key={s.key}
              title={`${s.label}: ${tally[s.key]} of ${total}`}
              className={`${s.fill} first:rounded-l-control last:rounded-r-control`}
              style={{ flexGrow: tally[s.key], flexBasis: 0 }}
            />
          ))
        )}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-small">
        {SEGMENTS.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2 text-ink-secondary">
            <span aria-hidden className={`size-3 rounded-[2px] ${s.dot}`} />
            {s.label}
            <span className="font-semibold text-ink tabular-nums">
              {tally[s.key]} of {total}
            </span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
