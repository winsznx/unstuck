import type { ReactNode } from "react";

/** The body of a milestone sub-page (fix, check, send), under the milestone header and its five-part rail. */
export function PartPage({ title, lead, children }: { title: string; lead: ReactNode; children: ReactNode }) {
  return (
    <main id="main-content" className="mx-auto max-w-(--container-content) px-4 pt-10 pb-16 sm:px-6">
      <header className="mb-8 max-w-(--container-reading)">
        <h1 className="text-section font-semibold text-balance">{title}</h1>
        <p className="mt-3 text-lead text-ink-secondary">{lead}</p>
      </header>
      {children}
    </main>
  );
}

/** A step that can't happen yet: why, in one sentence, and the one thing that moves it forward. */
export function Blocked({ title, body, action, tone = "plain" }: { title: string; body: ReactNode; action?: ReactNode; tone?: "plain" | "done" }) {
  return (
    <div className={`rounded-panel border px-5 py-5 ${tone === "done" ? "border-ink bg-surface" : "border-dashed border-border-strong"}`}>
      <h2 className="text-h3 font-semibold">{title}</h2>
      <p className="mt-1 max-w-(--container-reading) text-body text-ink-secondary">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const STRIP = {
  fail: "border-fails bg-fails-soft",
  pass: "border-passes bg-passes-soft",
  unsure: "border-dashed border-border-strong bg-unsure-soft",
  plain: "border-ink bg-surface",
} as const;

export type StripTone = keyof typeof STRIP;

/** The one-sentence result at the top of a part, in the verdict's colour only when a stored run backs it. */
export function ResultStrip({ tone, title, body, action, label }: { tone: StripTone; title: string; body: ReactNode; action?: ReactNode; label: string }) {
  return (
    <section aria-label={label} className={`flex flex-col gap-4 rounded-panel border-2 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-10 ${STRIP[tone]}`}>
      <div className="min-w-0 max-w-(--container-reading)">
        <h2 className="text-h2 font-semibold text-balance">{title}</h2>
        <div className="mt-1.5 text-body text-ink-secondary">{body}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  );
}
