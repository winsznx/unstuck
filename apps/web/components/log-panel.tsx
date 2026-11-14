import type { ReactNode } from "react";
import { stripAnsi } from "@unstuck/core";

/**
 * Real machine output only. `highlight` is the exact line that decided a verdict.
 * `title` adds a visible bar above the log (for example the command and its exit code).
 */
export function LogPanel({
  output,
  highlight,
  label,
  title,
  className = "",
}: {
  output: string;
  highlight?: string | null;
  label: string;
  title?: ReactNode;
  className?: string;
}) {
  const lines = stripAnsi(output).replace(/\s+$/, "").split(/\r?\n/);
  return (
    <figure className={`m-0 overflow-hidden rounded-panel bg-log ${className}`}>
      {title ? (
        <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-log-muted/25 px-4 py-2.5 font-mono log-type text-log-muted">{title}</figcaption>
      ) : (
        <figcaption className="sr-only">{label}</figcaption>
      )}
      <pre aria-label={title ? label : undefined} className="max-h-96 overflow-y-auto p-4 font-mono log-type wrap-break-word whitespace-pre-wrap text-log-ink">
        {lines.map((line, i) => {
          const hit = highlight && line.trim() === highlight.trim();
          return (
            <span key={i} className={hit ? "-mx-4 block border-l-2 border-log-fail bg-log-ink/5 px-[calc(1rem-2px)] text-log-fail" : "block"}>
              {line || " "}
            </span>
          );
        })}
      </pre>
    </figure>
  );
}
