import type { ReactNode } from "react";

type Tone = "neutral" | "waiting" | "good" | "bad";

const TONE: Record<Tone, { box: string; title: string; dot: string }> = {
  neutral: { box: "border-border bg-surface-muted", title: "text-ink", dot: "bg-ink-muted" },
  waiting: { box: "border-open-edge/40 bg-open-soft", title: "text-ink", dot: "bg-open-edge animate-pulse motion-reduce:animate-none" },
  good: { box: "border-passes/30 bg-passes-soft", title: "text-passes-text", dot: "bg-passes" },
  bad: { box: "border-fails/30 bg-fails-soft", title: "text-fails-text", dot: "bg-fails" },
};

/** One state, said in a sentence, with what to do next. `bad` is announced; the rest are polite. */
export function Notice({
  tone,
  title,
  children,
  action,
  className = "",
}: {
  tone: Tone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const look = TONE[tone];
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={`rounded-panel border px-4 py-4 sm:px-5 ${look.box} ${className}`}>
      <p className={`flex items-center gap-2.5 font-semibold ${look.title}`}>
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${look.dot}`} />
        {title}
      </p>
      {children && <div className="mt-1.5 pl-[1.125rem] text-ink-secondary">{children}</div>}
      {action && <div className="mt-3.5 flex flex-wrap items-center gap-3 pl-[1.125rem]">{action}</div>}
    </div>
  );
}

/** A labelled list with numbered steps, for "what happens next". */
export function Steps({ title, items, className = "" }: { title: string; items: ReactNode[]; className?: string }) {
  return (
    <div className={className}>
      <p className="font-semibold">{title}</p>
      <ol className="mt-2.5 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-ink-secondary">
            <span aria-hidden className="mt-px grid size-5.5 shrink-0 place-items-center rounded-full border border-border-strong text-tag font-semibold text-ink tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
