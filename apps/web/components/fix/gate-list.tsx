import type { Gate } from "@/lib/fix";

/** What has to be true before a step opens. Met items are inked, open items are dashed, like an unpunched list. */
export function GateList({ gates, label }: { gates: Gate[]; label: string }) {
  return (
    <ol aria-label={label} className="space-y-2">
      {gates.map((gate, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 text-tag font-bold ${gate.met ? "border-ink bg-ink text-on-action" : "border-dashed border-border-strong text-ink-muted"}`}
          >
            {gate.met ? "✓" : i + 1}
          </span>
          <span className={`text-body ${gate.met ? "text-ink" : "text-ink-secondary"}`}>
            <span className="sr-only">{gate.met ? "Done: " : "Not yet: "}</span>
            {gate.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
