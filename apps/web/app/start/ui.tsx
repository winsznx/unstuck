import type { ReactNode } from "react";

export const inputCls =
  "min-h-12 w-full min-w-0 rounded-control border border-border-control bg-surface px-3.5 text-input transition-colors duration-(--duration-fast) hover:border-ink-secondary aria-[invalid=true]:border-fails";
export const codeInputCls =
  "field-sizing-content min-h-20 w-full min-w-0 rounded-control border border-border-control bg-surface px-3.5 py-3 font-mono text-small leading-relaxed transition-colors duration-(--duration-fast) hover:border-ink-secondary";

export function Problem({ id, title, children, action }: { id?: string; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div id={id} role="alert" className="rounded-panel border border-fails/30 bg-fails-soft px-4 py-3.5">
      <p className="font-semibold text-fails-text">{title}</p>
      <div className="mt-1 text-ink">{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Reading({ label, lines }: { label: string; lines: string[] }) {
  return (
    <div role="status" aria-live="polite" className="rounded-panel border border-border bg-surface-muted px-4 py-4">
      <p className="flex items-center gap-2.5 font-semibold">
        <span aria-hidden className="size-2 animate-pulse rounded-full bg-open-edge motion-reduce:animate-none" />
        {label}
      </p>
      <ul className="mt-2 space-y-1 pl-[1.125rem]">
        {lines.map((line) => (
          <li key={line} className="text-small text-ink-secondary">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Facts({ rows }: { rows: { term: string; value: ReactNode; action?: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-border rounded-panel border border-border bg-surface">
      {rows.map((row) => (
        <div key={row.term} className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-baseline">
          <dt className="text-small text-ink-secondary">{row.term}</dt>
          <dd className="m-0 min-w-0 wrap-anywhere">{row.value}</dd>
          {row.action && <div className="sm:justify-self-end">{row.action}</div>}
        </div>
      ))}
    </dl>
  );
}

export function StepActions({ back, children, note }: { back?: ReactNode; children: ReactNode; note?: ReactNode }) {
  return (
    <div data-step-actions className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-border bg-surface/95 px-4 py-3.5 backdrop-blur-sm sm:-mx-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-small text-ink-secondary">{note}</div>
        <div className="flex flex-wrap items-center gap-3">
          {back}
          {children}
        </div>
      </div>
    </div>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-small text-ink-secondary">{children}</p>;
}
