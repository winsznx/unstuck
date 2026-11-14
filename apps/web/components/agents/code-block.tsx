import { CopyButton } from "@/components/run/copy-button";

/** Machine text on the log surface, with a title bar and a copy button. Used for requests, responses and configs. */
export function CodeBlock({ title, code, note, className = "", maxHeight = "max-h-[32rem]" }: { title: string; code: string; note?: string; className?: string; maxHeight?: string }) {
  return (
    <figure className={`m-0 min-w-0 overflow-hidden rounded-sheet bg-log text-log-ink shadow-object ${className}`}>
      <figcaption className="flex items-center justify-between gap-4 border-b border-log-muted/25 py-1 pr-2 pl-5">
        <span className="min-w-0 truncate text-small font-semibold">{title}</span>
        <CopyButton value={code} label={`Copy ${title}`} className="text-log-muted! hover:text-log-ink!" />
      </figcaption>
      <pre className={`${maxHeight} overflow-auto px-5 py-4 font-mono log-type whitespace-pre-wrap wrap-anywhere`}>{code}</pre>
      {note && <p className="border-t border-log-muted/25 px-5 py-3 text-small text-log-muted">{note}</p>}
    </figure>
  );
}
